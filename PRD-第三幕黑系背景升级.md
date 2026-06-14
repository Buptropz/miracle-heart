# PRD — 第三幕黑系背景升级：三境 · 暗夜浪漫

---

## 1. 背景与目标

### 1.1 当前状态

第三幕（主场景）通过 `<select id="bg-select">` 提供 4 种背景：

| 选项 | 实现 | 问题 |
|------|------|------|
| 浪漫星芒夜 (black) | CanvasTexture 深紫蓝渐变 | 名为黑实为紫蓝，不是真黑 |
| 深邃蓝 (deep) | THREE.Color 纯色 `0x050518` | 纯色无层次，与 black 实现不一致 |
| 暖冬红晕 (warm) | THREE.Color 纯色 `0x1a0808` | 同上 |
| 极光幻境 (aurora) | THREE.Color 纯色 `0x061218` | 同上 |

**核心问题：**
- 「黑色」不黑，偏紫蓝
- black 用 CanvasTexture，其余三个用纯色 `THREE.Color`，切换后丢失渐变层次
- 每次切回 black 都 `createElement('canvas')`，资源浪费
- CSS body 背景与 Three.js scene.background 色调不协调
- 缺乏浪漫情感表达——当前背景只是"颜色"，没有叙事

### 1.2 目标

将 4 种背景精简重构为 **3 种纯黑系浪漫背景**，统一使用 CanvasTexture 渐变实现，每种背景承载不同的浪漫意象。

| 新主题 | 浪漫意象 | 核心视觉 |
|--------|----------|----------|
| 暗夜玫瑰 | 黑夜中独绽的玫瑰 | 纯黑底 + 极暗玫瑰暗纹 + 花瓣状光晕 |
| 情书墨迹 | 以光为墨书写情书 | 黑底 + 玫瑰金/淡紫光脉缓慢流动 |
| 心愿星图 | 星辰承载心愿 | 黑底 + 星座连线 + 香槟金节点闪烁 + 偶现流星 |

**设计原则：**
- 浪漫但不甜腻——黑色基底保证高级感，浪漫元素以「隐约可见」的方式呈现
- 不改动现有架构，仅在 `setBackground()` 函数、`<select>` 选项、CSS body class 范围内修改
- 三种背景均使用 CanvasTexture 渐变实现，保持观感一致

---

## 2. 三境详述

### 2.1 境一：暗夜玫瑰 (midnight-rose) — 默认主题

**浪漫叙事：** 在几近绝对的黑暗中，隐约感知到一朵玫瑰的存在。不是看见，而是感觉到——像闭眼时感受到恋人指尖的温度。纯黑是画布，心型粒子是唯一的光源，而背景中暗藏的玫瑰暗纹是只有用心才能看见的秘密。

**色彩方案：**

```
Three.js scene.background (CanvasTexture 2×512px 渐变):
  0%:   #010002  — 极暗玫瑰黑
  40%:  #020104  — 冷黑过渡
  70%:  #030105  — 微暖黑（暗玫瑰底色浮现）
  100%: #010002  — 回归纯黑

  叠加层（同 Canvas）:
  - 极低透明度径向椭圆，模拟花瓣光晕:
    rgba(120, 30, 50, 0.03)  位于画布 60% 处
    rgba(80, 20, 40, 0.02)   位于画布 80% 处

scene.fog (FogExp2):
  color: #010002
  density: 0.0008  (从当前的 0.001 降低，减少远景遮挡)

CSS body.bg-midnight-rose:
  background: radial-gradient(ellipse at center bottom,
    #030106 0%, #010002 50%, #000000 100%);
```

**关键特征：**
- 整体视觉感受为「真黑」，无紫蓝偏移
- 暗玫瑰底色仅在屏幕下方隐约可感（像花瓣落在黑色天鹅绒上）
- 雾密度降低让心型粒子在远处依然清晰
- 无动画——纯静态的深邃浪漫

---

### 2.2 境二：情书墨迹 (love-letter)

**浪漫叙事：** 黑暗中有光在书写——像一封以光为墨的情书，字迹在虚空中缓慢浮现又消散。光脉的颜色是玫瑰金和淡紫，像夕阳最后的余晖落在信纸上。墨迹流动的轨迹偶尔勾勒出心形的弧线，是为恋人写下的无声告白。

**色彩方案：**

```
Three.js scene.background:
  底层渐变（同 midnight-rose 结构，色调略微偏暖）:
  0%:   #010102
  50%:  #020103
  100%: #010002

  叠加光脉（通过 JS 周期性重绘 CanvasTexture）:
  - 光脉 A: 玫瑰金色径向渐变球 rgba(200, 140, 150, 0.04)
    沿正弦曲线缓慢漂移，周期 ~75s
  - 光脉 B: 淡紫径向渐变球 rgba(150, 120, 180, 0.035)
    沿余弦曲线漂移，相位差 120°，周期 ~65s
  - 光脉 C: 暖金径向渐变球 rgba(180, 150, 120, 0.03)
    沿椭圆轨道漂移，周期 ~90s

  光脉尺寸: 各约占画布的 15-25%
  光脉羽化: 径向渐变从中心到边缘平滑过渡到透明

scene.fog:
  color: #010103
  density: 0.0009

CSS body.bg-love-letter:
  background: #000000;
  叠加: radial-gradient 伪元素，极暗暖色，极慢呼吸动画 (周期 30s)
```

**动画规则：**
- 更新频率：每 2 秒重绘一次 CanvasTexture（2×512px 开销忽略不计）
- 光脉位置由 `Date.now()` 驱动，保证切换到此主题时光脉位置连续
- 光脉互不交叉——三条光脉各自占据不同区域，避免视觉杂乱
- 叠加到 CanvasTexture 时使用 `globalCompositeOperation: 'lighter'` 实现柔和叠加

**关键特征：**
- 光脉移动极其缓慢（肉眼几乎不可见瞬时变化，但隔几分钟回头会觉得「位置变了」）
- 颜色克制——透明度 < 0.04，只有专注凝视才能察觉
- 光脉不干扰心型粒子系统的视觉主导地位

---

### 2.3 境三：心愿星图 (wish-star)

**浪漫叙事：** 黑色天幕上浮现一张古老的星图——但这不是航海用的星图，而是恋人用来许愿的。星座连线勾勒出柔和的几何图案，节点像香槟色的许愿灯在夜空中轻轻闪烁。偶尔一颗流星划过，带着恋人的心愿消失在黑暗深处。

**色彩方案：**

```
Three.js scene.background:
  底层: 纯黑 #000000 (CanvasTexture 2×512px)

  叠加层（CanvasTexture 上绘制）:
  - 星座连线: 极细线条 (1px)
    颜色: rgba(180, 160, 140, 0.06) 香槟灰
    线条构成柔和的几何网格 + 几组特殊连线（形成隐约的心形/花形）
  - 节点: 8-12 个散布的「许愿灯」
    基础颜色: rgba(200, 170, 140, 0.08) 香槟金
    闪烁颜色: rgba(220, 180, 140, 0.18) 亮香槟
    每个节点大小: 2-3px，带径向辉光
  - 流星: 每 8-15 秒随机出现一颗
    颜色: rgba(255, 200, 180, 0.15)
    形态: 短线段 + 尾迹渐隐
    轨迹: 沿画布对角方向划过，1.5s 内消失

scene.fog:
  color: #000000
  density: 0.0006

CSS body.bg-wish-star:
  background: #000000;
  叠加: repeating-linear-gradient 极低透明度 (rgba(60,50,70,0.02))
         模拟星图底纹网格
```

**动画规则：**
- 更新频率：每 1.5 秒重绘一次
- 节点闪烁：每次重绘随机选 2-3 个节点提亮，其余恢复基线
- 流星：独立计时器，随机 8-15s 触发一颗，生命周期 1.5s，位置和方向随机
- 流星轨迹使用 Canvas 渐变绘制（头部亮→尾部透明）

**关键特征：**
- 星座连线和网格极其克制——透明度 < 0.06，在 Bloom 后处理下才有隐约光感
- 许愿灯闪烁节奏不规律，模拟真实星空的随机感
- 流星是点睛之笔——不频繁，但每次出现都让人惊喜

---

## 3. 技术实现

### 3.1 统一架构

三种主题均使用 **CanvasTexture 渐变** 实现，废弃 `THREE.Color` 纯色方式。

```javascript
// scene.js — 主题配置表
const THEMES = {
  'midnight-rose': {
    label: '🌹 暗夜玫瑰',
    stops: [
      { pos: 0.0, color: '#010002' },
      { pos: 0.4, color: '#020104' },
      { pos: 0.7, color: '#030105' },
      { pos: 1.0, color: '#010002' },
    ],
    fogColor: 0x010002,
    fogDensity: 0.0008,
    overlay: 'rosePetals',    // 花瓣光晕叠加
    animated: false,
  },
  'love-letter': {
    label: '💌 情书墨迹',
    stops: [
      { pos: 0.0, color: '#010102' },
      { pos: 0.5, color: '#020103' },
      { pos: 1.0, color: '#010002' },
    ],
    fogColor: 0x010103,
    fogDensity: 0.0009,
    overlay: 'inkVeins',      // 光脉叠加
    animated: true,
    animInterval: 2000,       // 重绘间隔 ms
  },
  'wish-star': {
    label: '✨ 心愿星图',
    stops: [
      { pos: 0.0, color: '#000000' },
      { pos: 0.5, color: '#000000' },
      { pos: 1.0, color: '#010101' },
    ],
    fogColor: 0x000000,
    fogDensity: 0.0006,
    overlay: 'starChart',     // 星座网格叠加
    animated: true,
    animInterval: 1500,
    meteorInterval: [8000, 15000], // 流星随机间隔 ms
  },
};
```

### 3.2 setBackground() 重构

```javascript
const bgCache = {};  // { key: { canvas, texture } }

export function setBackground(type) {
  // 1. 更新 CSS
  document.body.className = 'bg-' + type;

  // 2. 检查缓存
  if (!bgCache[type]) {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    bgCache[type] = {
      canvas,
      texture: new THREE.CanvasTexture(canvas),
    };
  }

  const { canvas, texture } = bgCache[type];
  const theme = THEMES[type];

  // 3. 绘制底层渐变
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  theme.stops.forEach(s => grad.addColorStop(s.pos, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);

  // 4. 绘制叠加层
  if (theme.overlay) {
    drawOverlay(ctx, theme.overlay, canvas);
  }
  texture.needsUpdate = true;

  // 5. 应用
  scene.background = texture;
  scene.fog.color.setHex(theme.fogColor);
  scene.fog.density = theme.fogDensity;

  return type;
}
```

### 3.3 动画更新机制

```javascript
// scene.js — 导出供 main.js animate() 调用
export function updateBackgroundAnim(time) {
  const type = state.currentBg;
  const theme = THEMES[type];
  if (!theme.animated) return;

  const cache = bgCache[type];
  if (!cache || !cache.lastUpdate) cache.lastUpdate = 0;

  const interval = theme.animInterval;
  if (time - cache.lastUpdate < interval) return;
  cache.lastUpdate = time;

  const ctx = cache.canvas.getContext('2d');

  // 重绘底层
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  theme.stops.forEach(s => grad.addColorStop(s.pos, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);

  // 重绘叠加层（传入 time 让光脉/节点按时间计算位置）
  drawOverlay(ctx, theme.overlay, cache.canvas, time);

  cache.texture.needsUpdate = true;
}
```

### 3.4 叠加层绘制函数

```
drawOverlay(ctx, type, canvas, time)

  type === 'rosePetals':
    - 在画布中下部绘制两个极暗的径向椭圆
    - 静态，仅首次绘制

  type === 'inkVeins':
    - 根据 time 计算 3 个光脉的当前 (x, y) 位置
    - 每个光脉: createRadialGradient + fillRect
    - globalCompositeOperation = 'lighter'

  type === 'starChart':
    - 绘制固定星座连线（首次缓存到离屏 canvas，后续直接 drawImage）
    - 根据 time 随机选取 2-3 个节点提亮
    - 检查是否有活跃流星，有则绘制流星头尾
```

### 3.5 变更调用点

```javascript
// ui.js — bg-select change handler (当前行)
document.getElementById('bg-select').addEventListener('change', (e) => {
  state.currentBg = setSceneBg(e.target.value, state.currentBg);
  // 注: setBackground 不再需要第二个参数，但保持兼容
});

// main.js — animate() 中添加 (约第 88 行附近)
updateBackgroundAnim(performance.now());
```

---

## 4. 文件变更清单

| 文件 | 改动 | 行数估算 |
|------|------|----------|
| `index.html` | `<select id="bg-select">` 3 个 `<option>` 的 value 和 label | ~6 行 |
| `js/scene.js` | 新增 `THEMES` 配置表、`bgCache`、`drawOverlay()`、重构 `setBackground()`、新增 `updateBackgroundAnim()` | ~120 行 |
| `js/main.js` | `animate()` 中添加一行 `updateBackgroundAnim()` 调用 + import | ~3 行 |
| `js/ui.js` | bg-select change handler 适配新 value | ~1 行 |
| `js/state.js` | `currentBg` 默认值 `'black'` → `'midnight-rose'` | ~1 行 |
| `css/style.css` | 替换 `.bg-black/.bg-deep/.bg-warm/.bg-aurora` → `.bg-midnight-rose/.bg-love-letter/.bg-wish-star` | ~10 行 |

**不改动：** `particles.js` / `cover.js` / `photos.js` / `audio.js` / `gestures.js` / `config.js`

---

## 5. 验收标准

- [ ] **AC-1:** 默认进入第三幕时为「暗夜玫瑰」，视觉感受为真黑 + 极暗玫瑰底色
- [ ] **AC-2:** 设置面板可切换三种背景，切换无闪烁、无延迟
- [ ] **AC-3:** 三种背景均使用 CanvasTexture，渐变层次统一
- [ ] **AC-4:** Canvas 和 Texture 缓存复用，不重复创建
- [ ] **AC-5:** 「情书墨迹」光脉缓慢漂移，颜色为玫瑰金 + 淡紫，不喧宾夺主
- [ ] **AC-6:** 「心愿星图」节点闪烁 + 偶现流星，流星平均每 10 秒左右出现一次
- [ ] **AC-7:** CSS body 背景与 Three.js scene.background 色调协调
- [ ] **AC-8:** 背景动画不拉低帧率（桌面 60fps / 移动 30fps+）
- [ ] **AC-9:** 心型粒子、星云涡旋、雪花等特效在三种背景下均清晰可见
- [ ] **AC-10:** 雾密度随主题调整，不影响远景层次
- [ ] **AC-11:** 不修改 particles.js / cover.js / photos.js / audio.js / gestures.js

---

## 6. 与现有系统的协调

| 现有元素 | 处理 |
|----------|------|
| 星空粒子 (starField) | 保持，在三种黑背景下 opacity 微调 +5%（更显眼） |
| 雪花 (snow) | 保持，不受影响 |
| 星云涡旋 (nebulaVortex) | 保持，在纯黑背景下更突出 |
| 心跳波纹 (ripples) | 保持，不受影响 |
| Bloom 后处理 | 保持，纯黑背景会让 Bloom 辉光更集中 |
| 灯光系统 | 保持，背景变黑后暖色灯光更显温馨 |

---

## 7. 附录：视觉参考

- 暗夜玫瑰 → "velvet black rose petal", "barely perceptible dark burgundy", "hidden warmth in darkness"
- 情书墨迹 → "sumi-e ink with gold dust", "handwritten love letter flowing light", "slow drifting calligraphy"
- 心愿星图 → "celestial wishing map", "champagne gold constellation nodes", "shooting star love wish"

---

*文档版本: v1.0 · 创建日期: 2026-06-14 · 状态: 待评审*
