// Miracle Heart — Three.js Scene Setup
// ============================================================

import * as THREE from 'https://esm.sh/three@0.160.0';
import { EffectComposer } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'https://esm.sh/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';

export let scene, camera, renderer, composer, mainGroup;
export let bloomPass;
export let starFieldMat;
export const dummy = new THREE.Object3D();
export const _v = new THREE.Vector3();

export function initThree(container) {
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x010002, 0.0008);

  // Camera
  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0, CONFIG.camDistance);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.pixelCap));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  // Environment map
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // Lighting — romantic warm palette
  scene.add(new THREE.AmbientLight(0xfff5f7, 0.25));

  // Warm golden key light
  const spotLight = new THREE.SpotLight(0xffd1b3, 160);
  spotLight.position.set(40, 90, 50);
  scene.add(spotLight);

  // Rose pink accent
  const backLight = new THREE.PointLight(0xff8fab, 90, 280);
  backLight.position.set(-50, -20, 50);
  scene.add(backLight);

  // Lavender soft fill
  const fillLight = new THREE.PointLight(0xd4b8e0, 50, 220);
  fillLight.position.set(50, -40, -30);
  scene.add(fillLight);

  // Champagne rim light
  const rimLight = new THREE.PointLight(0xffe4c4, 40, 180);
  rimLight.position.set(0, 30, -60);
  scene.add(rimLight);

  // Sapphire cool accent — blue depth
  const blueLight = new THREE.PointLight(0x7eb8da, 44, 240);
  blueLight.position.set(-60, 10, -40);
  scene.add(blueLight);

  // Amethyst purple glow
  const purpleLight = new THREE.PointLight(0xb892d8, 36, 200);
  purpleLight.position.set(55, -10, 30);
  scene.add(purpleLight);

  // Post-processing
  const renderPass = new RenderPass(scene, camera);
  const bw = Math.round(window.innerWidth * CONFIG.bloomRes);
  const bh = Math.round(window.innerHeight * CONFIG.bloomRes);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(bw, bh), 1.5, 0.4, 0.85);
  bloomPass.threshold = CONFIG.bloomThreshold;
  bloomPass.strength = CONFIG.bloomStrength;
  bloomPass.radius = CONFIG.bloomRadius;

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // Main group
  mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Resize handler (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      const nw = Math.round(window.innerWidth * CONFIG.bloomRes);
      const nh = Math.round(window.innerHeight * CONFIG.bloomRes);
      composer.setSize(nw, nh);
    }, 150);
  });

  return { scene, camera, renderer, composer, mainGroup, bloomPass };
}

// --- Star Field ---
export function createStarField() {
  const gradCanvas = document.createElement('canvas');
  gradCanvas.width = BG_W;
  gradCanvas.height = BG_H;
  const gctx = gradCanvas.getContext('2d');
  const grad = gctx.createLinearGradient(0, 0, 0, BG_H);
  grad.addColorStop(0.0, '#010002');
  grad.addColorStop(0.4, '#020104');
  grad.addColorStop(0.7, '#030105');
  grad.addColorStop(1.0, '#010002');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, BG_W, BG_H);
  // Rose petal overlay
  drawRosePetals(gctx, BG_W, BG_H);
  scene.background = new THREE.CanvasTexture(gradCanvas);

  const mats = {};
  const addStars = (count, spread, size, color, opacity) => {
    const geo = new THREE.BufferGeometry();
    const p = [];
    for (let i = 0; i < count; i++) {
      p.push(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.6,
        (Math.random() - 0.5) * spread - 350,
      );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    scene.add(new THREE.Points(geo, mat));
    return mat;
  };

  mats.mat1 = addStars(1800, 1500, 0.6, 0xffc0cb, 0.48);
  mats.mat3 = addStars(150, 1200, 2.5, 0xffffff, 0.68);
  starFieldMat = mats;
}

// --- Snow Particles ---
export function createSnow() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 400;
    pos[i * 3 + 1] = Math.random() * 200 - 50;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 400 - 200;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffd6e0,
    size: 0.5,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const snow = new THREE.Points(geo, mat);
  scene.add(snow);
  return snow;
}

// --- Background Theme System ---
const BG_W = 128;
const BG_H = 512;

const THEMES = {
  'midnight-rose': {
    stops: [
      { pos: 0.0, color: '#010002' },
      { pos: 0.4, color: '#020104' },
      { pos: 0.7, color: '#030105' },
      { pos: 1.0, color: '#010002' },
    ],
    fogColor: 0x010002,
    fogDensity: 0.0008,
    overlay: 'rosePetals',
    animated: false,
  },
  'love-letter': {
    stops: [
      { pos: 0.0, color: '#010102' },
      { pos: 0.5, color: '#020103' },
      { pos: 1.0, color: '#010002' },
    ],
    fogColor: 0x010103,
    fogDensity: 0.0009,
    overlay: 'inkVeins',
    animated: true,
    animInterval: 2000,
  },
  'wish-star': {
    stops: [
      { pos: 0.0, color: '#000000' },
      { pos: 0.5, color: '#000000' },
      { pos: 1.0, color: '#010101' },
    ],
    fogColor: 0x000000,
    fogDensity: 0.0006,
    overlay: 'starChart',
    animated: true,
    animInterval: 1500,
  },
};

const bgCache = {};
const bgState = {
  lastUpdate: 0,
  // wish-star state
  chartNodes: [],
  chartLines: [],
  nextMeteorTime: 0,
  meteors: [],
};

// --- Overlay: rosePetals (midnight-rose) ---
function drawRosePetals(ctx, w, h) {
  const r1 = ctx.createRadialGradient(w * 0.35, h * 0.55, 0, w * 0.35, h * 0.55, h * 0.18);
  r1.addColorStop(0, 'rgba(120, 30, 50, 0.025)');
  r1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, w, h);

  const r2 = ctx.createRadialGradient(w * 0.6, h * 0.65, 0, w * 0.6, h * 0.65, h * 0.14);
  r2.addColorStop(0, 'rgba(80, 20, 40, 0.018)');
  r2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = r2;
  ctx.fillRect(0, 0, w, h);
}

// --- Overlay: inkVeins (love-letter) ---
function drawInkVeins(ctx, w, h, time) {
  const t = time * 0.001;
  const veins = [
    { xBase: 0.3, yBase: 0.38, radius: 0.19, color: 'rgba(200, 140, 150, 0.035)', period: 75, phase: 0 },
    { xBase: 0.65, yBase: 0.52, radius: 0.17, color: 'rgba(150, 120, 180, 0.03)', period: 65, phase: 2.1 },
    { xBase: 0.48, yBase: 0.6, radius: 0.21, color: 'rgba(180, 150, 120, 0.025)', period: 90, phase: 4.3 },
  ];

  veins.forEach(v => {
    const x = w * (v.xBase + Math.sin(t / v.period * Math.PI * 2 + v.phase) * 0.12);
    const y = h * (v.yBase + Math.cos(t / v.period * Math.PI * 2 + v.phase) * 0.1);
    const r = h * v.radius;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, v.color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

// --- Overlay: starChart (wish-star) ---
function initChartNodes(w, h) {
  if (bgState.chartNodes.length > 0) return;
  const count = 10;
  for (let i = 0; i < count; i++) {
    bgState.chartNodes.push({
      x: w * 0.1 + Math.random() * w * 0.8,
      y: h * 0.08 + Math.random() * h * 0.84,
      baseAlpha: 0.05 + Math.random() * 0.07,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.7 + Math.random() * 1.6,
    });
  }
  for (let i = 0; i < bgState.chartNodes.length; i++) {
    for (let j = i + 1; j < bgState.chartNodes.length; j++) {
      const a = bgState.chartNodes[i];
      const b = bgState.chartNodes[j];
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist < w * 0.45) {
        bgState.chartLines.push({ from: i, to: j });
      }
    }
  }
}

function drawStarChart(ctx, w, h, time) {
  initChartNodes(w, h);
  const t = time * 0.001;

  // Constellation lines
  ctx.strokeStyle = 'rgba(180, 160, 140, 0.035)';
  ctx.lineWidth = 0.4;
  bgState.chartLines.forEach(line => {
    const a = bgState.chartNodes[line.from];
    const b = bgState.chartNodes[line.to];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  // Twinkling nodes
  bgState.chartNodes.forEach(node => {
    const twinkle = 0.5 + 0.5 * Math.sin(t * node.twinkleSpeed + node.twinklePhase);
    const alpha = node.baseAlpha * (0.4 + twinkle * 0.6);
    const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 6);
    glow.addColorStop(0, `rgba(210, 180, 145, ${Math.min(alpha * 2.5, 0.22)})`);
    glow.addColorStop(0.3, `rgba(200, 170, 140, ${alpha})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(node.x - 8, node.y - 8, 16, 16);
  });

  // Meteor spawn
  if (!bgState.nextMeteorTime) bgState.nextMeteorTime = time + 8000 + Math.random() * 7000;
  if (time > bgState.nextMeteorTime) {
    const startX = Math.random() * w * 0.9;
    const startY = Math.random() * h * 0.5;
    bgState.meteors.push({
      x: startX, y: startY,
      vx: 25 + Math.random() * 40,
      vy: 18 + Math.random() * 28,
      life: 0,
      maxLife: 1.2 + Math.random() * 0.6,
    });
    bgState.nextMeteorTime = time + 8000 + Math.random() * 7000;
  }

  // Draw & update meteors
  bgState.meteors = bgState.meteors.filter(m => {
    m.life += 0.016;
    if (m.life > m.maxLife) return false;
    const progress = m.life / m.maxLife;
    const fade = 1 - progress;
    const cx = m.x + m.vx * m.life;
    const cy = m.y + m.vy * m.life;
    const tx = cx - m.vx * 0.18;
    const ty = cy - m.vy * 0.18;
    const grad = ctx.createLinearGradient(cx, cy, tx, ty);
    grad.addColorStop(0, `rgba(255, 195, 170, ${fade * 0.28})`);
    grad.addColorStop(0.5, `rgba(255, 185, 160, ${fade * 0.12})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    return true;
  });
}

// --- Draw overlay dispatcher ---
function drawOverlay(ctx, w, h, type, time) {
  if (type === 'rosePetals') drawRosePetals(ctx, w, h);
  else if (type === 'inkVeins') drawInkVeins(ctx, w, h, time);
  else if (type === 'starChart') drawStarChart(ctx, w, h, time);
}

// --- Build background texture ---
function buildBgTexture(type, time) {
  const theme = THEMES[type];
  if (!theme) return null;

  const canvas = document.createElement('canvas');
  canvas.width = BG_W;
  canvas.height = BG_H;
  const ctx = canvas.getContext('2d');

  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, 0, BG_H);
  theme.stops.forEach(s => grad.addColorStop(s.pos, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BG_W, BG_H);

  // Overlay
  if (theme.overlay) {
    drawOverlay(ctx, BG_W, BG_H, theme.overlay, time || 0);
  }

  return { canvas, texture: new THREE.CanvasTexture(canvas) };
}

// --- Public: set background theme ---
export function setBackground(type) {
  const theme = THEMES[type];
  if (!theme) return type;

  document.body.className = 'bg-' + type;

  if (!bgCache[type]) {
    bgCache[type] = buildBgTexture(type, 0);
  } else if (!theme.animated) {
    // Static themes are already cached and correct — reuse
  } else {
    // Animated: rebuild to get fresh overlay
    const entry = buildBgTexture(type, performance.now());
    bgCache[type].texture.dispose();
    bgCache[type] = entry;
  }

  scene.background = bgCache[type].texture;
  scene.fog.color.setHex(theme.fogColor);
  scene.fog.density = theme.fogDensity;

  bgState.lastUpdate = performance.now();
  return type;
}

// --- Public: update animated background overlays ---
export function updateBackgroundAnim(now, currentBg) {
  const theme = THEMES[currentBg];
  if (!theme || !theme.animated) return;

  if (now - bgState.lastUpdate < theme.animInterval) return;
  bgState.lastUpdate = now;

  const cache = bgCache[currentBg];
  if (!cache) return;

  const ctx = cache.canvas.getContext('2d');

  // Redraw base gradient
  ctx.clearRect(0, 0, BG_W, BG_H);
  const grad = ctx.createLinearGradient(0, 0, 0, BG_H);
  theme.stops.forEach(s => grad.addColorStop(s.pos, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BG_W, BG_H);

  // Redraw overlay with current time
  if (theme.overlay) {
    drawOverlay(ctx, BG_W, BG_H, theme.overlay, now);
  }

  cache.texture.needsUpdate = true;
}

// --- Set Background Theme (legacy compat — replaced by setBackground above) ---
// The old setBackground(type, currentBg) is removed.
// Callers should use: state.currentBg = setBackground(type);

