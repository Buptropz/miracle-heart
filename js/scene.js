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
  scene.fog = new THREE.FogExp2(0x06040a, 0.002);

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
  const blueLight = new THREE.PointLight(0x7eb8da, 55, 240);
  blueLight.position.set(-60, 10, -40);
  scene.add(blueLight);

  // Amethyst purple glow
  const purpleLight = new THREE.PointLight(0xb892d8, 45, 200);
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
  gradCanvas.width = 2;
  gradCanvas.height = 512;
  const gctx = gradCanvas.getContext('2d');
  const grad = gctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#0a0513');
  grad.addColorStop(0.50, '#150926');
  grad.addColorStop(1.0, '#05020a');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 2, 512);
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

  mats.mat1 = addStars(1800, 1500, 0.6, 0xffc0cb, 0.6);
  mats.mat3 = addStars(150, 1200, 2.5, 0xffffff, 0.85);
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
    color: 0xfff0f5,
    size: 0.5,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const snow = new THREE.Points(geo, mat);
  scene.add(snow);
  return snow;
}

// --- Set Background Theme ---
export function setBackground(type, currentBg) {
  currentBg = type;
  document.body.className = 'bg-' + type;

  if (type === 'black') {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 512;
    const gctx = c.getContext('2d');
    const g = gctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0a0513');
    g.addColorStop(0.5, '#150926');
    g.addColorStop(1, '#05020a');
    gctx.fillStyle = g;
    gctx.fillRect(0, 0, 2, 512);
    scene.background = new THREE.CanvasTexture(c);
    scene.fog.color.setHex(0x06040a);
  } else {
    const colors = { deep: 0x050518, warm: 0x1a0808, aurora: 0x061218 };
    scene.background = new THREE.Color(colors[type] || 0x050518);
    scene.fog.color.setHex(colors[type] || 0x050518);
  }
  return currentBg;
}
