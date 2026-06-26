# PRD — 手势互动升级：比心 · 流星许愿 · 指尖光轨

---

## 1. 背景与目标

### 1.1 当前状态

| 手势 | 检测方式 | 触发功能 |
|------|----------|----------|
| 右手握力 | grip 0→1 | 心形聚合度 (blendFactor) + 自转速度 |
| 右手位置 | 中指尖 MCP 坐标 | 心形倾斜 (rotation.x / .z) |
| 左手捏合 | pinch (thumb-index < H×0.38) | 照片模式循环切换 |
| 左手剪刀 | index+middle ext, ring+pinky curl | 跳转立体画廊 |
| 左手握拳 | grip > 0.7 | 返回粒子模式 |

**核心问题：**
- 左手仅作为模式切换器，缺乏「情感互动」层面的手势
- 21 个手部关键点 + 双手检测能力，手势种类远未充分利用
- 现有拖尾系统 (`trailSystem`) 绑定在 roseGold 粒子层上，是全局效果而非手势反馈
- 缺乏一个「高光时刻」——用户用身体动作触发视觉爆发的情感巅峰体验

### 1.2 目标

新增三种手势互动，分别在**情感仪式感**、**背景惊喜感**、**即时视觉反馈**三个维度升级体验：

| 编号 | 功能 | 手势 | 情感价值 |
|------|------|------|----------|
| F1 | 爱心爆发 | 双手比心 | 情感巅峰——用户用身体完成「心的形状」，画面回报以粒子爆发 |
| F2 | 流星许愿 | 左手张开手掌 | 惊喜彩蛋——在心愿星图背景下触发密集流星雨 |
| F3 | 指尖光轨 | 左右手指尖 | 即时反馈——每根手指在空中划过的轨迹化为 3D 光带 |

---

## 2. F1 — 爱心爆发（双手比心）

### 2.1 浪漫叙事

比心手势是整个体验的**情感锚点**。当恋人用双手在镜头前比出一个心形，画面中的所有粒子瞬间被点燃——心形粒子向外爆发再回落，bloom 辉光翻倍，背景粒子短暂闪白。这是「身体动作 → 视觉奇观」的因果闭环，让用户感到**自己的爱意被看见、被回应**。

### 2.2 手势检测

```
检测逻辑（双手同时可见时执行）：

1. 左手检测:
   - 拇指尖(4) 与 食指尖(8) 距离 < H_left × 0.35  （左手捏合状态）
   - 中指(12)、无名指(16)、小指(20) 均伸展 (tip/MCP > 0.9)

2. 右手检测:
   - 拇指尖(4) 与 食指尖(8) 距离 < H_right × 0.35  （右手捏合状态）
   - 中指(12)、无名指(16)、小指(20) 均伸展 (tip/MCP > 0.9)

3. 空间关系:
   - 左手拇指尖(4) 与 右手拇指尖(4) 的屏幕距离 < 0.06（两手靠近）
   - 左手食指尖(8) 与 右手食指尖(8) 的屏幕距离 < 0.08

4. 持续确认:
   - 上述条件连续满足 6 帧（约 200ms），防止误触发
   - 触发生效后进入冷却：8 秒内不可再次触发
```

**手势形状示意：**

```
左手拇指 ──┬── 右手拇指     ← 两手拇指靠近（心形顶部凹陷）
    \       |       /
     \      |      /
  左手食指   右手食指       ← 食指弯曲形成心形上半弧
       \    |    /
        心心心心心           ← 中指无名指小指伸展构成下半弧
```

### 2.3 视觉爆发流程

```
阶段 1: 确认 (0ms-200ms)
  - 手势确认中，状态栏提示: "💕 感受到了...再坚持一下..."
  - 画面无变化，粒子继续正常运动

阶段 2: 爆发 (200ms-800ms)
  - 所有 InstancedMesh 粒子:
    - 向外扩散：以心形中心为原点，每个粒子沿径向 ×2.5
    - 颜色提亮：所有粒子 color 向白色 (1,1,1) lerp 0.6
  - bloom 强度: 从当前值 → 2.5 (翻倍到上限)
  - 火花系统: sparkleSystem opacity 瞬间 → 1.0，粒子 size ×2
  - 心跳波纹: 连续触发 3 道超大波纹（径向扩散范围 ×1.5）
  - 状态栏: "✨ 爱意被唤醒 · 这是属于你们的宇宙奇迹 ✨" 金色大字

阶段 3: 回落 (800ms-1800ms)
  - 粒子缓慢回到原始位置 (easeOutElastic)
  - bloom 强度 2.5 → 原始值 (1.0s ease)
  - 火花系统恢复常态
  - 在回落过程中，额外生成 200 个临时金色粒子从心形中心飞出并消失

阶段 4: 余韵 (1800ms-3000ms)
  - 所有参数恢复常态
  - 状态栏显示: "❤️ 每一次比心都是一次心跳" 
  - 冷却计时器启动（8 秒）
```

### 2.4 技术要点

```
数据结构（state.js 新增）:
  heartGestureState: {
    confirmed: false,        // 是否确认中
    confirmFrames: 0,        // 连续确认帧数
    lastTriggerTime: 0,      // 上次触发时间戳
    cooldown: 8000,          // 冷却时间 ms
  },
  burstActive: false,        // 爆发进行中
  burstStartTime: 0,        // 爆发开始时间
  burstParticles: null,      // 临时金色粒子 Points

爆发动画控制:
  - burstPhase: 'idle' | 'confirming' | 'burst' | 'recede' | 'afterglow'
  - 爆发进度 t = (now - burstStartTime) / 1800
  - 粒子径向扩散: radialOffset = lerp(0, 2.5, easeOutExpo(t)) → lerp(2.5, 0, easeOutElastic(t - 0.44))
  - bloom: lerp(current, 2.5, t * 2) → lerp(2.5, current, (t - 0.44) * 1.8)

文件变更:
  - js/gestures.js: 新增 detectHeartGesture() + 双手协同检测逻辑
  - js/particles.js: 新增 triggerHeartBurst() + updateHeartBurst()
  - js/main.js:     animate() 中调用 updateHeartBurst()
  - js/state.js:    新增 heartGestureState + burstPhase
```

---

## 3. F2 — 流星许愿（张开手掌）

### 3.1 浪漫叙事

当恋人在「心愿星图」背景下张开手掌——像向星空许愿——天幕回应以一场密集流星雨。每颗流星承载一个愿望，划过夜空后消散。这不是频繁出现的背景点缀，而是需要**主动动作触发**的彩蛋，让用户发现后感到惊喜。

### 3.2 触发条件

```
触发逻辑（仅左手）：

1. 手势检测:
   - grip < 0.15（五指全部伸展，手掌打开）
   - 维持 4 帧（约 130ms）

2. 环境条件:
   - 当前背景为 wish-star（心愿星图）
   - 当前状态为 PARTICLE 或 RING（在欣赏模式下更有仪式感）

3. 冷却:
   - 每次触发后冷却 8 秒
   - 冷却期间状态栏显示: "🌠 星辰正在聆听下一个愿望..."

4. 状态栏反馈:
   触发时: "🌠 以掌为愿 · 漫天星辰为你坠落"
   冷却中: "✨ 每颗流星都是一个心愿... 再等等"
```

### 3.3 流星雨效果

```
流星规格:
  - 数量: 12-18 颗流星（随机）
  - 方向: 从画布左上到右下随机偏移 ±30°
  - 生命周期: 每颗 2.0-3.5 秒（随机）
  - 发射时间: 在 1.5 秒内陆续发射（非同时，模拟自然流星雨）
  - 颜色:
    主色: rgba(255, 220, 180, 0.25)  香槟金
    辅色: rgba(200, 180, 220, 0.20)  淡紫
    头尾: 头部亮 → 尾部透明渐变

实现方案:
  方案 A（推荐）: CanvasTexture 增强
    - 在 wish-star 的 overlay 绘制函数中新增 meteorShower 模式
    - 由流星管理器维护 12-18 颗活跃流星的生命周期
    - 保持与现有背景动画架构一致（每 1.5s 重绘）

  方案 B（备选）: 3D 粒子流星
    - 使用 THREE.Points 在场景中生成 3D 流星
    - 优势: 可与 Bloom 后处理交互
    - 劣势: 需要额外 DrawCall，与背景层概念不一致

推荐方案 A，保持背景层统一在 CanvasTexture 管理。

流星管理器:
  activeMeteors: [
    {
      startX, startY,    // 画布坐标起点 (0-2, 0-512)
      endX, endY,        // 画布坐标终点
      progress: 0-1,     // 生命周期进度
      duration: 2000-3500, // ms
      delay: 0-1500,     // 延迟发射 ms
      color: '#ffdab4' | '#c8b4dc',
      brightness: 0.15-0.25,
      tailLength: 20-35, // 尾迹像素长度
    },
    ...
  ]

绘制（每次 CanvasTexture 重绘时）:
  for each meteor:
    if (time - triggerTime) < meteor.delay: continue
    meteor.progress = (time - triggerTime - delay) / duration
    if progress > 1: remove from active
    
    const headX = lerp(startX, endX, progress);
    const headY = lerp(startY, endY, progress);
    
    // 渐变尾迹
    const tailGrad = ctx.createLinearGradient(
      headX, headY,
      headX - dirX * tailLength, headY - dirY * tailLength
    );
    tailGrad.addColorStop(0, `rgba(${color}, ${brightness})`);
    tailGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(headX - dirX * tailLength, headY - dirY * tailLength);
    ctx.stroke();
    
    // 头部辉光
    const headGlow = ctx.createRadialGradient(headX, headY, 0, headX, headY, 4);
    headGlow.addColorStop(0, `rgba(255, 255, 255, ${brightness * 1.5})`);
    headGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = headGlow;
    ctx.fillRect(headX - 4, headY - 4, 8, 8);
```

### 3.4 与背景动画的协调

```
wish-star 背景的现有元素:
  - 星座连线 (固定)
  - 许愿灯节点闪烁 (每 1.5s 刷新)
  - 零散随机流星 (每 8-15s 一颗)

流星许愿触发时:
  - 零散随机流星暂停（让位给许愿流星雨）
  - 更新频率提升到每 0.8s 重绘一次（流星移动更流畅）
  - 许愿灯节点闪烁加速（频率翻倍，营造激动感）
  - 流星雨结束后恢复原动画节奏
  - 恢复后零散流星计时器重置

文件变更:
  - js/scene.js: 新增 startMeteorShower() + updateMeteorShower() + meteorMgr
  - js/gestures.js: 新增 detectOpenPalm() + 流星触发逻辑
```

---

## 4. F3 — 指尖光轨（手指拖尾升级）

### 4.1 浪漫叙事

当前拖尾系统是全局的——所有 roseGold 粒子各自拖一条尾巴。但恋人最自然的互动是**用手指在空中画画**。当手指在镜头前移动时，指尖轨迹化为 3D 光带留在心形周围，像用光写下的悄悄话。轨迹缓慢消散，留下片刻的记忆痕迹。

### 4.2 从全局拖尾到手指导向拖尾

```
现有 trailSystem:
  - 绑定: roseGoldCount × trailLength = 1200 × 5 = 6000 粒子
  - 行为: 每个 roseGold 粒子拖一条尾巴，跟随粒子运动
  - 缺点: 与用户手势无关，只是粒子物理效果

升级后——双系统并存:
  保留现有 trailSystem（全局粒子拖尾）
  
  新增 fingerTrailSystem（指尖光轨）:
    - 绑定: 每只手的 4 个指尖（食指 8、中指 12、无名指 16、小指 20）
    - 双手最多 8 条光轨，每条 30 个点
    - 总计: max 8 × 30 = 240 个轨迹点
    - 行为: 跟随指尖在 3D 空间的位置

### 4.3 指尖 3D 坐标映射

```
从 2D 手部关键点到 3D 场景坐标:

1. 归一化设备坐标 (NDC):
   ndcX = (landmark.x * 2 - 1)     // MediaPipe x: 0→1 → NDC: -1→1
   ndcY = -(landmark.y * 2 - 1)    // MediaPipe y: 0→1 → NDC: 1→-1 (翻转Y)

2. 通过 Raycaster 反投影到场景:
   // 在 camDistance 深度的平面上取点
   const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
   vec.unproject(camera);
   const dir = vec.sub(camera.position).normalize();
   
   // 交点: 在 Z=0 平面（心形所在深度）
   const t = -camera.position.z / dir.z;
   const worldPos = camera.position.clone().add(dir.multiplyScalar(t));
   
   // 应用 mainGroup 的逆变换（轨迹跟随心形旋转）
   mainGroup.worldToLocal(worldPos);

3. 平滑:
   - 对每个指尖的 worldPos 做指数平滑 (factor 0.3)
   - 避免手抖导致轨迹抖动
```

### 4.4 光轨系统设计

```
数据结构:
  fingerTrails: {
    left: {
      8:  { history: [Vector3 × 30], color: '#ff758c' },  // 食指 — 玫瑰粉
      12: { history: [Vector3 × 30], color: '#ffd700' },  // 中指 — 金色
      16: { history: [Vector3 × 30], color: '#c8b0e8' },  // 无名指 — 薰衣草
      20: { history: [Vector3 × 30], color: '#7eb8da' },  // 小指 — 冰蓝
    },
    right: { ... 同上 }
  }

技术实现:
  - 类型: THREE.Points (BufferGeometry) × 8 条光轨（或合并为 1 个 Points 用 vertexColors）
  - 每条光轨: 30 个点，环形缓冲区
  - 写入: 每帧将当前指尖位置 push 到对应光轨的 history（环形写入）
  - 渲染:
    点 0 (最新): 最亮, size=0.35
    点 29 (最旧): 最暗, size=0.05
    透明度从 0.9 线性衰减到 0
  - 材质: PointsMaterial, AdditiveBlending, depthWrite=false
  - 颜色: 8 种浪漫色，左手暖色系 / 右手冷色系

合并方案（推荐，减少 DrawCall）:
  - 1 个 BufferGeometry, 240 个顶点 (8×30)
  - vertexColors: 每顶点独立颜色 + alpha 存于 size/color 中
  - 使用 ShaderMaterial 实现 per-vertex fade

光轨衰减:
  - 无新数据时（手指离开画面），光轨整体 opacity 以 0.92/sec 衰减
  - 衰减到 0.01 以下时隐藏该光轨段
```

### 4.5 视觉效果

```
正常跟随:
  - 手指移动: 光轨实时跟在指尖后，形成流畅曲线
  - 手指静止: 光轨在指尖处形成明亮光点（30 个重合点叠加）
  - 手指快速挥动: 光轨拉出长曲线，尾部渐暗渐细

手指消失时:
  - 光轨不立即消失，而是原地 fade out（1.5 秒）
  - 模拟"光的余晖"

颜色分配（左右手各 4 指）:
  食指: #ff758c (玫瑰粉) — 最亮, 最常用于指向
  中指: #ffd700 (金色)   — 最长的手指, 轨迹最显眼
  无名指: #c8b0e8 (薰衣草) — 浪漫紫色
  小指: #7eb8da (冰蓝)   — 轻盈的蓝色

UI 状态栏提示（首次检测到指尖时）:
  "✨ 用指尖在空中写下你的心意..."
```

---

## 5. 技术实现

### 5.1 整体架构

```
gestures.js (手势检测层)
  ├── detectHeartGesture(leftHand, rightHand) → boolean
  ├── detectOpenPalm(handData) → boolean
  ├── getFingertipWorldPos(landmark, camera, mainGroup) → Vector3
  └── 新增: heartGestureConfirmFrames, openPalmConfirmFrames

particles.js (粒子特效层)
  ├── triggerHeartBurst() → 激活爆发动画
  ├── updateHeartBurst(time, delta) → 逐帧更新爆发状态
  ├── createFingerTrailSystem() → 初始化指尖光轨
  └── updateFingerTrailSystem(fingertipPositions) → 逐帧更新光轨

scene.js (背景层)
  ├── startMeteorShower() → 激活流星雨模式
  └── updateMeteorShower(time) → 逐帧更新流星（在 drawOverlay 中调用）

main.js (动画循环)
  └── animate():
        ├── updateHeartBurst(time, delta)
        ├── updateFingerTrailSystem(fingertips)
        └── updateMeteorShower(time)  // 仅在 wish-star + 流星雨激活时
```

### 5.2 手势状态机

```
                     ┌──────────────────────────┐
                     │     IDLE (空闲监控)        │
                     └──────┬─────────┬─────────┘
                            │         │
              双手比心确认  │         │  左手张开
              6帧连续通过   │         │  4帧连续 + wish-star
                            ▼         ▼
                     ┌──────────┐  ┌──────────────┐
                     │ 爱心爆发  │  │  流星雨激活   │
                     │ (3秒)    │  │  (2-4秒)     │
                     └────┬─────┘  └──────┬───────┘
                          │               │
              爆发完成    │               │  流星雨结束
                          ▼               ▼
                     ┌──────────┐  ┌──────────────┐
                     │ 冷却 8秒  │  │  冷却 8秒    │
                     └────┬─────┘  └──────┬───────┘
                          │               │
              冷却结束    │               │  冷却结束
                          ▼               ▼
                     ┌──────────────────────────┐
                     │        IDLE              │
                     └──────────────────────────┘

指尖光轨: 无状态机，只要有手指被追踪到就实时更新，手指消失后衰减。
```

### 5.3 性能预算

```
当前粒子总数: ~18,000（含所有 InstancedMesh + sparkle + dust + snow + starField + nebula + ripple）

F1 爱心爆发新增:
  - 临时金色粒子: 200 (1 DrawCall, 3s 生命周期)
  - 无持久开销

F2 流星雨新增:
  - 在 CanvasTexture 上绘制，无额外 DrawCall
  - 重绘频率临时提升（0.8s vs 1.5s），CPU 开销可忽略

F3 指尖光轨新增:
  - 240 个轨迹点 (1 DrawCall, 合并 BufferGeometry)
  - 8 条光轨共享 1 个 ShaderMaterial
  - 持久运行，GPU 开销极低

总计新增: ~440 粒子, 2 DrawCalls
预计影响: 对帧率无可见影响
```

---

## 6. 文件变更清单

| 文件 | 改动内容 | 行数估算 |
|------|----------|----------|
| `js/gestures.js` | 新增 `detectHeartGesture()`、`detectOpenPalm()`、`getFingertipWorldPos()`、指尖坐标映射；expand `applyLeftHand()` 和新增 `applyBothHands()` | ~100 行 |
| `js/particles.js` | 新增 `triggerHeartBurst()`、`updateHeartBurst()`、`createFingerTrailSystem()`、`updateFingerTrailSystem()`；导出新增函数 | ~180 行 |
| `js/scene.js` | 新增 `startMeteorShower()`、`updateMeteorShower()`、流星管理器；修改 `drawOverlay()` 支持流星雨模式 | ~80 行 |
| `js/state.js` | 新增 `heartGestureState`、`meteorShowerState`、`fingertipState`、`burstPhase` | ~25 行 |
| `js/main.js` | `animate()` 中新增 3 个 update 调用 + import；传入 `camera` 和 `mainGroup` 给手势模块 | ~8 行 |
| `js/ui.js` | 无强制改动（可选：状态栏消息适配） | ~5 行 |

**不改动：** `index.html` / `css/style.css` / `cover.js` / `photos.js` / `audio.js` / `config.js`

---

## 7. 验收标准

### F1 — 爱心爆发

- [ ] **AC-1:** 双手同时在镜头前比心（拇指+食指捏合、其余三指伸展、两手靠近），连续 6 帧后触发爆发
- [ ] **AC-2:** 爆发时所有粒子径向扩散 + bloom 翻倍 + 连续 3 道超大波纹
- [ ] **AC-3:** 爆发后粒子以弹性缓动回原位，总时长约 3 秒
- [ ] **AC-4:** 冷却 8 秒，冷却期间重复比心不触发
- [ ] **AC-5:** 单手比心不触发（必须双手）
- [ ] **AC-6:** 在 PARTICLE / ZOOM / WALL / RING 四种状态下均可触发
- [ ] **AC-7:** 状态栏在各阶段显示对应文案

### F2 — 流星许愿

- [ ] **AC-8:** 在 wish-star 背景下，左手五指全部张开 4 帧后触发流星雨
- [ ] **AC-9:** 12-18 颗流星在 1.5s 内陆续发射，沿对角线方向划过
- [ ] **AC-10:** 每颗流星有头尾渐变 + 辉光，生命期 2-3.5s
- [ ] **AC-11:** 冷却 8 秒，冷却期间状态栏提示等待
- [ ] **AC-12:** 非 wish-star 背景下张开手掌不触发
- [ ] **AC-13:** 流星雨不影响 wish-star 的星座连线和许愿灯闪烁

### F3 — 指尖光轨

- [ ] **AC-14:** 单手可见时，4 个指尖各产生一条彩色光轨
- [ ] **AC-15:** 双手可见时，8 条光轨同时存在，颜色区分左右手
- [ ] **AC-16:** 光轨在 3D 空间中正确映射，跟随心形旋转
- [ ] **AC-17:** 手指移出画面后，光轨在 1.5s 内 fade out
- [ ] **AC-18:** 光轨不影响现有 trailSystem 的行为
- [ ] **AC-19:** 帧率保持：桌面 60fps / 移动 30fps+

---

## 8. 与现有系统的协调

| 现有元素 | 处理方式 |
|----------|----------|
| 左手指令（捏合/剪刀/握拳） | 保持。新增的张开手掌仅在 wish-star 下做流星触发，其他背景仍走原逻辑。比心手势需要双手同时捏合，与单手捏合区分 |
| 拖尾系统 (trailSystem) | 保持全局粒子拖尾。指尖光轨作为独立系统并行运行 |
| 心跳波纹 (ripples) | 保持。比心爆发时额外触发 3 道大波纹，不影响原有 beat 驱动逻辑 |
| wish-star 背景动画 | 保持。流星雨期间提升重绘频率 + 暂停零散流星，结束后恢复 |
| Bloom 后处理 | 保持。比心爆发时临时翻倍，结束后恢复 |
| 右手握力控制 | 保持。比心期间 blendFactor 不受影响 |

---

## 9. 实现顺序建议

| 阶段 | 内容 | 理由 |
|------|------|------|
| Phase 1 | F3 指尖光轨 | 技术路径最清晰，效果立竿见影，可作为热身 |
| Phase 2 | F1 爱心爆发 | 核心情感功能，需要调优手势检测阈值 + 爆发动画参数 |
| Phase 3 | F2 流星许愿 | 依赖 wish-star 背景，在 Phase 1/2 完成后叠加 |

---

## 10. 附录：手势检测阈值调节指南

```
比心手势灵敏度调节（js/gestures.js）:

  CONFIRM_FRAMES = 6          // 确认帧数（越大越难触发）
  PINCH_THRESHOLD = 0.35      // 捏合阈值（越小要求指尖越近）
  FINGER_EXTEND_RATIO = 0.9   // 手指伸展判定（tip/MCP > 此值）
  THUMB_PROXIMITY = 0.06      // 两手拇指最大屏幕距离
  INDEX_PROXIMITY = 0.08      // 两手食指最大屏幕距离
  COOLDOWN_MS = 8000          // 冷却时间

流星许愿灵敏度调节:

  OPEN_PALM_GRIP = 0.15       // 手掌张开 grip 阈值（越小越严格）
  OPEN_CONFIRM_FRAMES = 4     // 确认帧数

指尖光轨调节:

  TRAIL_LENGTH = 30           // 每条光轨点数
  SMOOTH_FACTOR = 0.3         // 指尖坐标平滑因子
  FADE_RATE = 0.92            // 无数据时每秒衰减系数
```

---

*文档版本: v1.0 · 创建日期: 2026-06-26 · 状态: 待评审*
