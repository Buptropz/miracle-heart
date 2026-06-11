# PRD — 第二幕心型背景升级：极光帷幕 · 心跳波纹 · 星云漩涡

---

## 1. 背景与目标

### 1.1 当前状态
第二幕（blendFactor → 1，心型完全聚合后）的视觉背景由以下元素组成：
- 静态深色渐变画布纹理（`createStarField` 生成 2px × 512px 渐变）
- 两层静态星点粒子（1800 颗小星 + 150 颗大星）
- 1500 颗雪花飘落粒子
- CSS 层 `body` 径向渐变
- 场景雾（`FogExp2`）

现有背景缺乏**动态韵律**与**情感张力**，心型聚合后视觉变化趋于静止。

### 1.2 目标
在心型处于第二幕（blendFactor ≥ 0.8）时，叠加三层动态背景特效，使观感从「静态宇宙」升级为「流动的生命场」：

| 层级 | 特性 | 对应方案 |
|------|------|----------|
| L1 远景 | 缓慢旋转的星云漩涡，赋予宇宙史诗感 | 方案 4 — 星云漩涡 |
| L2 中景 | 流动的极光帷幕，提供色彩感染力 | 方案 1 — 极光帷幕 |
| L3 近景 | 随音乐律动的心跳波纹，强化互动感 | 方案 3 — 心跳波纹 |

---

## 2. 功能详情

### 2.1 L1 — 星云漩涡 (Nebula Vortex)

**视觉描述：** 在场景最远处（z ≈ -300 ~ -500），一个由 3000-5000 个粒子组成的扁平环状星云，围绕心型做缓慢的椭圆轨道旋转。粒子颜色从玫瑰金 → 紫水晶 → 冰蓝渐变，模拟银河涡旋。涡旋整体半透明，与心型形成「中心奇点 + 环绕星云」的构图。

**交互规则：**
- 始终可见，不随 blendFactor 显隐
- 旋转速度受 `state.rotationSpeed` 影响，与心型自转联动
- 音乐节拍（beat）使涡旋粒子短暂增亮 + 加速旋转（beat 驱动的径向脉冲）

**技术要点：**
```
- 类型: THREE.Points (BufferGeometry)
- 粒子数: 4000
- 形状: 扁平椭圆环（内径 80, 外径 220, Y 轴压扁到 0.15）
- 颜色: 使用 vertexColors，按径向距离渐变：
  内圈 → 玫瑰金 (0xe8a0b4)
  中圈 → 紫水晶 (0xb892d8)  
  外圈 → 冰蓝 (0x7eb8da)
- 材质: PointsMaterial, AdditiveBlending, depthWrite=false, opacity=0.4
- 位置: scene 层级（非 mainGroup），不随相机手势旋转
- 动画: 绕 Y 轴旋转 + 径向呼吸式缩放（beat 驱动，幅度 ±5%）
- 性能: 单次 DrawCall，无实例化开销
```

**文件变更：** `js/particles.js` 新增 `createNebulaVortex()` + `updateNebulaVortex()`

---

### 2.2 L2 — 极光帷幕 (Aurora Curtains)

**视觉描述：** 在场景中后部（z ≈ -150 ~ -50），4-6 道垂直悬挂的半透明光幕，每道光幕由密集粒子或带状 Mesh 构成。光幕颜色在粉紫 / 青绿 / 暖金之间缓慢漂移，沿垂直方向做正弦波摆动，模拟极光在夜空中流动的效果。光幕与 Bloom 后处理产生柔和的辉光散射。

**交互规则：**
- 极光在 blendFactor < 0.5 时不可见，> 0.5 时渐显（opacity 从 0 → 0.9）
- 光幕波动速度受 beat 影响（强拍时光幕波动幅度增大 30%）
- 光幕颜色随时间在色环上缓慢漂移（完整循环约 120 秒），避免视觉疲劳

**技术要点：**
```
方案 A — Shader 实现（推荐）:
- 创建 4 张竖向矩形 PlaneMesh（宽 300, 高 180）
- 使用自定义 ShaderMaterial:
  - vertexShader: 顶点沿 Y 轴施加正弦位移，位移频率和振幅为 uniform
  - fragmentShader: 多层正弦波叠加的垂直渐变，颜色由 HSL 传入并随时间漂移
  - 边缘透明度渐变 (smoothstep 实现羽化)
- Z 轴位置分散在 -180 到 -70，模拟前后层次
- blending: AdditiveBlending, depthWrite: false
- 受 beat 驱动: beat > 0.5 时振幅 ×1.3

方案 B — 粒子实现（备选，性能更优）:
- 每道光幕用 800 个粒子排成 40×20 的网格
- 颜色从顶部到底部渐变
- 粒子做正弦波动

文件变更: js/particles.js 或新建 js/aurora.js
```

**文件变更：** `js/particles.js` 新增 `createAurora()` + `updateAurora()`（如用 Shader 方案则新建 `js/aurora.js`）

---

### 2.3 L3 — 心跳波纹 (Heartbeat Ripples)

**视觉描述：** 以心型中心（0, 3.5, 0）为原点，周期性地向外扩散半透明光环。每道环是一个扁平的圆环粒子圈，从中心向外扩散的同时逐渐变淡变宽，最终消散。当音乐节拍（beat）超过阈值时，触发一道新的波纹。多个波纹可同时存在于不同生命阶段。整体效果类似「心型在跳动，激起空间涟漪」。

**交互规则：**
- 仅在 blendFactor > 0.8 时激活（心型完全聚合后）
- 波纹触发条件：`beat > 0.45`（当前帧音乐节拍强度超过阈值）
- 触发冷却：至少间隔 200ms，防止连续强拍产生过多波纹
- 每道波纹生命周期：1.8 秒
  - 0.0s-0.3s：从中心发出，半径 r=0→15，opacity=0.8
  - 0.3s-1.2s：向外扩散，r=15→65，opacity=0.8→0.3，宽度增大
  - 1.2s-1.8s：淡出消散，opacity→0
- 波纹颜色与心型色系一致：玫瑰金（主色）→ 淡粉 → 透明

**技术要点：**
```
- 类型: 环形粒子结构，波纹池管理
- 最大同时波纹数: 6 个
- 每道波纹粒子数: 120 个（构成一个圆环）
- 圆环厚度: 开始时 0.8 单位，结束时 4 单位
- 颜色: 从 PALETTE.roseGold (0xe8a0b4) 渐变到透明
- 材质: PointsMaterial, AdditiveBlending, depthWrite=false, sizeAttenuation=true
- 数据结构:
  ripples = [
    {
      age: 0-1.8,        // 秒
      baseColor: Color,  // 波纹颜色
      particles: Points, // 可复用的粒子对象
      active: boolean,
    }
  ]
- 波纹池预创建 6 个 Points 对象，通过 active 标记复用，避免频繁创建/销毁
```

**文件变更：** `js/particles.js` 新增 `createRipplePool()` + `updateRipples()`

---

## 3. 与现有系统的协调

### 3.1 与现有特效的共存策略

| 现有元素 | 处理方式 |
|----------|----------|
| 星空粒子 (starField) | 保留，降低 opacity 20%（让位给星云） |
| 雪花 (snow) | 保留，降低 opacity 20%，雪花颜色可微调为淡粉 |
| 场景雾 (fog) | 保留，密度从 0.002 降至 0.001（减少对远景的遮挡） |
| 灯光系统 | 保留，微调蓝色/紫色灯光强度（极光已提供冷色调） |
| Bloom 后处理 | 保留，threshold 可能需要微调（极光+波纹会贡献额外辉光） |

### 3.2 性能预算

```
当前粒子总数: ~6,500 个 + 1,500 雪花 + 2,000 星空 = ~10,000
本次新增:
  - 星云漩涡: 4,000 粒子 (1 DrawCall)
  - 极光帷幕: 4 个 Plane (4 DrawCalls) 或 3,200 粒子
  - 心跳波纹: 720 粒子 max (6 波纹 × 120, 6 DrawCalls)

总计新增: ~8,000 粒子, ~11 DrawCalls
预计影响: 在标准移动端维持 30fps+，桌面端 60fps
```

### 3.3 与手势交互的关系

- 星云漩涡：在 `scene` 层级，不受 `mainGroup` 手势旋转影响（保持稳定的宇宙背景感）
- 极光帷幕：在 `scene` 层级，不受手势旋转影响
- 心跳波纹：在 `mainGroup` 层级，跟随心型旋转（波纹始终从心型中心发出）

---

## 4. 实现计划

### Phase 1: 心跳波纹（最快出效果）

| 步骤 | 文件 | 内容 |
|------|------|------|
| 1.1 | `js/particles.js` | 新增 `createRipplePool()` — 预创建 6 个环状 Points 对象 |
| 1.2 | `js/particles.js` | 新增 `updateRipples(deltaTime, beat, blendFactor)` — 波纹生命周期管理 |
| 1.3 | `js/main.js` | 在 `animate()` 中调用 `updateRipples()`，传入 beat 和 blendFactor |
| 1.4 | 测试 | 验证：beat 触发 → 波纹扩散 → 1.8s 后消失 → 池复用 |

**预估改动量：** ~120 行新增代码

### Phase 2: 星云漩涡

| 步骤 | 文件 | 内容 |
|------|------|------|
| 2.1 | `js/particles.js` | 新增 `createNebulaVortex()` — 4000 粒子椭圆环，vertexColors |
| 2.2 | `js/particles.js` | 新增 `updateNebulaVortex(time, beat, rotSpeed)` — 旋转 + 呼吸 |
| 2.3 | `js/main.js` | `animate()` 中调用，放在 scene 层级更新 |
| 2.4 | `js/scene.js` | 微调 `createStarField` 星空 opacity 给星云让步 |
| 2.5 | 测试 | 验证：旋转平滑 → beat 呼吸有反馈 → 星空+星云层次分明 |

**预估改动量：** ~100 行新增代码

### Phase 3: 极光帷幕

| 步骤 | 文件 | 内容 |
|------|------|------|
| 3.1 | `js/aurora.js` (新建) | `createAurora()` — 4 个 ShaderMaterial Plane |
| 3.2 | `js/aurora.js` | `updateAurora(time, beat, blendFactor)` — 波动 + 颜色漂移 + 渐显 |
| 3.3 | `js/main.js` | 导入并在 `animate()` 中调用 |
| 3.4 | `js/scene.js` | 微调雾密度从 0.002 → 0.001 |
| 3.5 | 测试 | 验证：blendFactor 驱动渐显 → 波动自然 → 颜色缓慢变化 → 性能稳定 |

**预估改动量：** ~150 行新增代码（新建文件）

---

## 5. 验收标准

### 5.1 功能验收

- [ ] **AC-1:** 心型聚合后（blendFactor > 0.8），心跳波纹随音乐节拍触发并扩散消散
- [ ] **AC-2:** 星云涡旋在心型可见后持续缓慢旋转，不随手势倾斜
- [ ] **AC-3:** 极光帷幕在心型半聚合时（blendFactor > 0.5）开始渐显，完全聚合后达到全亮
- [ ] **AC-4:** 三种特效与现有星空、雪花、灯光无视觉冲突（层次分明）
- [ ] **AC-5:** 在「背景主题」切换（黑/深蓝/暖红/极光）时，新特效仍可正常叠加显示

### 5.2 性能验收

- [ ] **AC-6:** 桌面端（Chrome/Edge）稳定 60fps，GPU 内存增量 < 50MB
- [ ] **AC-7:** 移动端（Safari/Chrome）稳定 30fps+
- [ ] **AC-8:** 波纹池复用机制正常——无内存泄漏，无粒子对象累积

### 5.3 体验验收

- [ ] **AC-9:** 静态场景（无音乐时）视觉不显空洞——星云+极光提供足够的动态感
- [ ] **AC-10:** 强节拍时波纹反馈及时（延迟 < 100ms），视觉效果明显但不刺眼

---

## 6. 风险与注意事项

| 风险 | 影响 | 应对 |
|------|------|------|
| 移动端 GPU 不支持自定义 Shader（极光方案 A） | 极光无法渲染 | 降级到方案 B（粒子网格），自动检测 WebGL 能力 |
| beat 检测在无音乐时始终为 0 | 波纹永不触发 | 无音乐时改为基于时间的自动心跳（约 72 BPM），模拟静息心率 |
| 三层特效叠加 + Bloom 后处理过度发亮 | 画面过曝 | 为每层特效设置独立的 bloom 强度权重，默认折半 |

---

## 7. 附录：视觉参考关键词

- 星云漩涡 → "spiral galaxy particle ring", "kepler rotation nebula"
- 极光帷幕 → "aurora borealis curtain shader", "flowing light veil"
- 心跳波纹 → "sonar pulse ring", "heartbeat shockwave ripple"

---

*文档版本: v1.0 · 创建日期: 2026-06-09 · 状态: 待评审*
