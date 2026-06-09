<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-pink?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Three.js-r160-ff758c?style=flat-square" alt="Three.js">
  <img src="https://img.shields.io/badge/MediaPipe-Hands-ffb6c1?style=flat-square" alt="MediaPipe">
</p>

<h1 align="center">✨ Miracle Heart</h1>
<p align="center"><em>Interactive 3D Nebula Confession — Powered by Three.js & AI Gesture Recognition</em></p>

---

## 📖 简介 / Introduction

**Miracle Heart** 是一个基于 Web 的交互式 3D 浪漫告白页面。它使用 **Three.js** 渲染由数千粒子构成的动态心形星云，并通过 **MediaPipe Hands** 实现实时手势识别，让你用手势控制整个星云的凝聚、散开、照片浏览和 3D 环形画廊。

> 🔗 **在线演示：** 直接用浏览器打开 `index.html` 即可（需要摄像头权限用于手势识别）

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 💖 **3D 心形粒子星云** | 4000+ 粒子（金/银/宝石/翡翠）构成心形，可在凝聚与散开之间平滑过渡 |
| ✋ **AI 手势交互** | 右手开合控制心形呼吸，左手捏合/剪刀/握拳切换照片浏览模式 |
| 📷 **照片粒子过渡** | 上传照片后，粒子从星云散落状态汇聚成照片——星尘化影 |
| 🎵 **音乐可视化** | Web Audio API 实时分析音频频谱，驱动心形脉动和旋转速度 |
| 🌟 **梦幻后处理** | UnrealBloomPass 辉光特效、动态星空背景、飘雪粒子、流光尾迹系统 |
| 🎨 **全自定义面板** | 标题/字体/背景主题/特效参数实时调节，上传专属音乐照片 |
| 📱 **二维码分享** | 一键生成二维码，手机扫码即可打开 |
| 🖼️ **三种浏览模式** | 单张记忆（捏合切换）、流星画廊（全部展示）、环形3D画廊（自动旋转） |

---

## 🚀 快速开始

### 方式一：直接打开（推荐）

```bash
# 克隆仓库
git clone https://github.com/your-username/miracle-heart.git
cd miracle-heart

# 用任意 HTTP 服务器启动（摄像头 API 需要安全上下文）
python -m http.server 8080
# 或者
npx serve .
```

然后浏览器打开 `http://localhost:8080`

> ⚠️ **注意：** 手势识别功能需要 **HTTPS** 或 **localhost** 环境才能调用摄像头。直接用 `file://` 协议打开会导致摄像头不可用（3D 粒子可以正常显示）。

### 方式二：部署到服务器

整个项目是纯静态文件，部署到任何静态托管服务即可（GitHub Pages、Vercel、Netlify 等）。

---

## 🎮 手势操作指南

| 手势 | 手 | 功能 |
|------|-----|------|
| 🖐️ **手掌张开/握拳** | 右手 | 手掌越开→心形散得越开，握拳→心形凝聚，同时控制旋转速度 |
| 🤌 **拇指食指捏合** | 左手 | 循环切换：心形 → 单张照片 → 照片墙 → 环形画廊 |
| ✌️ **剪刀手** | 左手 | 直接进入 3D 环形画廊模式 |
| ✊ **握拳** | 左手 | 返回心形粒子模式 |

---

## 📁 项目结构

```
miracle-heart/
├── index.html              # 主入口
├── css/
│   └── style.css           # 全局样式（玻璃态UI、动画、响应式）
├── js/
│   ├── config.js           # 配置常量
│   ├── scene.js            # Three.js 场景/相机/渲染器/后处理
│   ├── particles.js        # 粒子系统（心形网格/星尘/尾迹/环形粒子）
│   ├── photos.js           # 照片管理（上传/采样/粒子过渡/3D网格）
│   ├── gestures.js         # MediaPipe 手势识别与状态机
│   ├── audio.js            # Web Audio API 音乐分析
│   ├── ui.js               # DOM UI 控件与面板逻辑
│   └── main.js             # 主循环编排
├── assets/                 # 静态资源目录（可放默认图片/音乐）
├── LICENSE                 # MIT 协议
├── .gitignore
└── README.md
```

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Three.js](https://threejs.org/) | 0.160 | 3D 渲染引擎，InstancedMesh 粒子系统 |
| [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) | 0.10 | 21 点手部关键点识别，GPU 加速 |
| [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | - | 音频频谱分析，驱动视觉效果 |
| [qrcode](https://github.com/soldair/node-qrcode) | 1.5 | 二维码生成 |
| CSS Custom Properties | - | 主题系统与响应式设计 |

所有依赖通过 ES Module CDN 引入（`esm.sh` / `jsdelivr`），无需构建工具。

---

## 🎨 自定义

### 修改默认粒子参数

编辑 `js/config.js`：

```js
export const CONFIG = {
  goldCount: 1200,    // 金色粒子数量
  silverCount: 800,   // 银色粒子数量
  camDistance: 105,   // 相机距离
  bloomStrength: 1.0, // 辉光强度
  // ...
};
```

### 修改默认标题

在 `index.html` 中修改 `<input id="custom-text" value="Miracle Heart">` 的 `value` 属性。

### 添加默认背景音乐

在 `assets/` 目录放置 `bgm.mp3`，然后修改 `js/main.js` 中的初始化逻辑。

---

## 🌐 浏览器兼容性

| 浏览器 | 兼容性 |
|--------|--------|
| Chrome 90+ | ✅ 完全支持 |
| Edge 90+ | ✅ 完全支持 |
| Firefox 90+ | ✅ 基本支持（WebGL 性能略低） |
| Safari 15+ | ⚠️ 部分支持（MediaPipe GPU 降级） |
| 移动端浏览器 | ⚠️ 手势识别性能取决于设备 |

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。

---

## 🙏 致谢

- [Three.js](https://threejs.org/) — 强大的 3D 渲染库
- [MediaPipe](https://developers.google.com/mediapipe) — Google 的端侧 AI 框架
- 所有贡献者和使用者 ❤️

---

<p align="center">
  <sub>Made with 💖 and lots of particles</sub>
</p>
