# Spec — 手势互动升级：比心流星与指尖光轨

## 概述

为 Miracle Heart 新增三种手势互动，提升情感仪式感、背景惊喜感和即时视觉反馈。

| 编号 | 功能 | 手势 | 情感价值 |
|------|------|------|----------|
| F1 | 爱心爆发 | 双手比心 | 身体动作触发视觉奇观的情感巅峰 |
| F2 | 流星许愿 | 左手张开手掌 | wish-star 背景下的惊喜彩蛋 |
| F3 | 指尖光轨 | 左右手指尖 | 手指划过空气留下 3D 光带 |

---

## 架构

```
gestures.js (新增 ~100 行)
  ├── detectBothHandsHeart(left, right) → { confirming, triggered }
  ├── detectOpenPalm(handData) → boolean
  └── getFingertipWorldPos(landmark, camera, mainGroup) → Vector3

particles.js (新增 ~180 行)
  ├── triggerHeartBurst() → 激活爆发
  ├── updateHeartBurst(time, dt) → 四阶段动画
  ├── createFingerTrailSystem() → ShaderMaterial 光轨 (8×30=240点)
  └── updateFingerTrailSystem(fingertips, camera, mainGroup) → 每帧写入

scene.js (新增 ~80 行)
  ├── startMeteorShower() → 激活流星雨模式
  └── updateMeteorShower(time) → 在 drawStarChart 中合并绘制

state.js (新增 ~25 行)
  ├── heartGestureState, burstPhase
  ├── meteorShowerState
  └── fingertipState

main.js (改动 ~15 行)
  └── animate() 中新增 3 个 update 调用 + 传入 camera/mainGroup

不变: index.html, css/style.css, cover.js, photos.js, audio.js, config.js, ui.js
```

实现顺序: F3 → F1 → F2

---

## F3 — 指尖光轨

### 渲染方案

ShaderMaterial 合并: 1 个 BufferGeometry，240 顶点，共享 1 个 ShaderMaterial。

```
BufferGeometry layout (240 vertices):
  position: Float32Array(720) — 3D 世界坐标
  aAlpha:   Float32Array(240) — 每点透明度 (最新点=1.0, 线性衰减到 0)
  aSize:    Float32Array(240) — 每点大小 (最新=0.35, 最旧=0.05)
```

- vertex shader: aSize 驱动 gl_PointSize，varying vAlpha
- fragment shader: 圆形 mask，输出 vec4(color, vAlpha)，AdditiveBlending
- 8 种颜色通过 gl_VertexID / 30 索引选择

### 坐标映射

```
NDC → 3D:
  ndcX = landmark.x * 2 - 1
  ndcY = -(landmark.y * 2 - 1)
  vec.unproject(camera) → dir → 与 Z=0 平面求交
  mainGroup.worldToLocal(worldPos)  // 跟随心形旋转
  指数平滑 factor=0.3
```

### 环形缓冲区

每帧: 新坐标写入 position[0]，旧数据后移一位。
手指消失: 所有 aAlpha × 0.92/s，低于 0.01 隐藏。

### 颜色分配

| 手指 | 颜色 | 色值 |
|------|------|------|
| 食指 | 玫瑰粉 | #ff758c |
| 中指 | 金色 | #ffd700 |
| 无名指 | 薰衣草 | #c8b0e8 |
| 小指 | 冰蓝 | #7eb8da |

---

## F1 — 爱心爆发

### 双手比心 vs 左手捏合区分 (方案 B — 时间窗口)

```
左手捏合 → 启动 300ms 时间窗口:
  窗口内右手也捏合 → 进入比心确认，取消照片切换
  窗口超时 → 执行 triggerPhotoFlow()
```

### 手势检测

双手同时满足:
- 拇指尖-食指尖距离 < H × 0.35 (捏合)
- 中指/无名指/小指伸展: tip/MCP > 0.9
- 两手拇指间距 < 0.06，两手食指间距 < 0.08
- 连续 6 帧确认，冷却 8s

### 四阶段动画

| 阶段 | 时间 | 粒子 | bloom | 波纹 |
|------|------|------|-------|------|
| 确认中 | -200ms~0 | 正常 | 不变 | 不变 |
| 爆发 | 0~600ms | 6 mesh 粒子径向 ×2.5，颜色向白 lerp 0.6 | → 2.5 | 连续 3 道 ×1.5 大波纹 |
| 回落 | 600~1600ms | easeOutElastic 回原位 | → 原值 | 停止 |
| 余韵 | 1600~3000ms | 200 临时金色粒子飞出淡出 | 原值 | 停止 |

关键点:
- 径向扩散原点: mainGroup 本地原点 (0,0,0)
- 爆发期间覆盖 updateMeshLogic 的 lerp 目标
- 200 临时粒子用 Points+BufferGeometry，3s 后 dispose

---

## F2 — 流星许愿

### 方案

CanvasTexture (保持背景层统一架构)，在现有 drawStarChart 上叠加。

### 触发条件

- 左手 grip < 0.15，连续 4 帧
- 当前背景 === 'wish-star'
- 当前状态 PARTICLE 或 RING
- 冷却 8s

### 流星雨

- 数量: 12-18 颗，0-1500ms 陆续发射
- 方向: 左上 → 右下，偏移 ±30°
- 生命周期: 2-3.5s
- 绘制: head→tail 线性渐变，头部径向辉光
- 颜色: 香槟金 rgba(255,220,180,x) / 淡紫 rgba(200,180,220,x)

### 与现有系统协调

流星雨期间:
- 零星流星暂停
- 重绘频率 1.5s → 0.8s
- 许愿灯节点闪烁加速
- 结束后全部恢复

---

## 性能

| 新增项 | 资源 | 影响 |
|--------|------|------|
| F1 临时粒子 | 200 Points, 3s | 瞬时可忽略 |
| F2 流星雨 | CanvasTexture 绘制 | 无新 DrawCall |
| F3 光轨 | 240 顶点, 1 DrawCall | GPU 开销极低 |

总计新增 ~2 DrawCalls，帧率无可见影响。

---

## 验收标准

### F1 — 爱心爆发
- [x] 双手比心 6 帧确认后触发爆发
- [x] 粒子径向扩散 + bloom 翻倍 + 3 道大波纹
- [x] 弹性缓动回落，总时长 ~3s
- [x] 冷却 8s，单手不触发
- [x] PARTICLE/ZOOM/WALL/RING 四状态均可触发

### F2 — 流星许愿
- [x] wish-star 背景下左手五指张开 4 帧触发
- [x] 12-18 颗流星陆续发射，头尾渐变 + 辉光
- [x] 冷却 8s，非 wish-star 不触发
- [x] 不影响星座连线和许愿灯

### F3 — 指尖光轨
- [x] 单手 4 条，双手 8 条光轨，颜色区分
- [x] 3D 空间正确映射，跟随心形旋转
- [x] 手指移出后 1.5s fade out
- [x] 不影响现有 trailSystem
- [x] 60fps 保持

---

*基于 PRD-手势互动升级-比心流星与指尖光轨.md v1.0 · 2026-06-26*
