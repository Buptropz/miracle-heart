// Miracle Heart — Photo Management & Transitions
// ============================================================

import * as THREE from 'https://esm.sh/three@0.160.0';
import { scene, mainGroup, camera, _v } from './scene.js';
import { getHeartPoint, randomSpherePoint } from './particles.js';

export let photoMeshes = [];
export let photoUrls = [];
export let photoParticleCache = [];
export let transitionPoints = null;

// --- Pre-sample photo pixels for particle transition ---
export async function preSamplePhoto(url) {
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const sw = 48, sh = 36;
    const sampler = document.createElement('canvas');
    sampler.width = sw;
    sampler.height = sh;
    const sctx = sampler.getContext('2d');
    sctx.drawImage(img, 0, 0, sw, sh);
    const data = sctx.getImageData(0, 0, sw, sh).data;
    const particles = [];
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = (y * sw + x) * 4;
        if (data[idx + 3] > 30) {
          particles.push({
            nx: x / sw,
            ny: y / sh,
            r: data[idx] / 255,
            g: data[idx + 1] / 255,
            b: data[idx + 2] / 255,
          });
        }
      }
    }
    return particles;
  } catch {
    return [];
  }
}

// --- Start photo particle transition (Three.js Points) ---
export function startPhotoParticleTransition(imageUrl) {
  cleanupTransition();

  const photoEl = document.getElementById('single-photo-view');
  photoEl.style.transition = 'none';
  photoEl.style.opacity = '0';
  photoEl.style.transform = 'scale(0.92)';
  photoEl.src = imageUrl;
  void photoEl.offsetHeight;
  photoEl.style.transition =
    'opacity 0.35s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  photoEl.style.opacity = '1';
  photoEl.style.transform = 'scale(1)';

  const idx = photoUrls.indexOf(imageUrl);
  const cached = idx >= 0 && idx < photoParticleCache.length ? photoParticleCache[idx] : null;
  if (!cached || cached.length < 50) return;

  const count = Math.min(cached.length, 600);
  const step = cached.length / count;
  const pos = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const p = cached[Math.floor(i * step)];
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 30 + 4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    target[i * 3] = (p.nx - 0.5) * 24;
    target[i * 3 + 1] = -(p.ny - 0.5) * 18 + 4;
    target[i * 3 + 2] = 0;
    colors[i * 3] = p.r;
    colors[i * 3 + 1] = p.g;
    colors[i * 3 + 2] = p.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const sprCanvas = document.createElement('canvas');
  sprCanvas.width = 32;
  sprCanvas.height = 32;
  const sctx = sprCanvas.getContext('2d');
  const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(sprCanvas);

  const mat = new THREE.PointsMaterial({
    size: 1.5,
    map: tex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8,
    vertexColors: true,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.position.z = 6;
  scene.add(points);

  transitionPoints = { points, targets: target, progress: 0, imageUrl, texture: tex };
}

// --- Update transition animation ---
export function updateTransition() {
  if (!transitionPoints) return false;

  const tp = transitionPoints;
  tp.progress += 0.04;
  const p = Math.min(tp.progress, 1);
  const ease = 1 - Math.pow(1 - p, 3);

  const pos = tp.points.geometry.attributes.position.array;
  const targets = tp.targets;
  const n = tp.points.geometry.attributes.position.count;
  const speed = 0.15;
  let maxDistSq = 0;

  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    pos[i3] += (targets[i3] - pos[i3]) * speed;
    pos[i3 + 1] += (targets[i3 + 1] - pos[i3 + 1]) * speed;
    pos[i3 + 2] += (targets[i3 + 2] - pos[i3 + 2]) * speed;
    const dx = pos[i3] - targets[i3];
    const dy = pos[i3 + 1] - targets[i3 + 1];
    const dz = pos[i3 + 2] - targets[i3 + 2];
    maxDistSq = Math.max(maxDistSq, dx * dx + dy * dy + dz * dz);
  }

  tp.points.geometry.attributes.position.needsUpdate = true;
  tp.points.material.opacity = 0.8 * (1 - ease);
  tp.points.material.size = 1.3 * (1 - ease * 0.5);

  if (maxDistSq < 2.0 || tp.progress > 1.6) {
    cleanupTransition();
    return false;
  }
  return true;
}

// --- Cleanup transition ---
export function cleanupTransition() {
  if (!transitionPoints) return;
  scene.remove(transitionPoints.points);
  transitionPoints.points.geometry.dispose();
  transitionPoints.points.material.dispose();
  if (transitionPoints.texture) transitionPoints.texture.dispose();
  transitionPoints = null;
}

// --- Add 3D photo mesh to heart ---
export function addPhotoMesh(img) {
  let sw = img.width, sh = img.height;
  const MAX_TEX = 1024;
  let tex;
  if (sw > MAX_TEX || sh > MAX_TEX) {
    if (sw > sh) {
      sh = Math.round(sh * MAX_TEX / sw);
      sw = MAX_TEX;
    } else {
      sw = Math.round(sw * MAX_TEX / sh);
      sh = MAX_TEX;
    }
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, sw, sh);
    tex = new THREE.CanvasTexture(c);
  } else {
    tex = new THREE.Texture(img);
  }
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;

  let w = 4.8, h = 4.8;
  if (img.width > img.height) h = 4.8 * (img.height / img.width);
  else w = 4.8 * (img.width / img.height);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide }),
  );
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.15, h + 0.15, 0.05),
    new THREE.MeshPhysicalMaterial({
      color: 0xff758c, roughness: 0.2, metalness: 0.8, clearcoat: 1.0,
    }),
  );
  frame.position.z = -0.04;
  mesh.add(frame);

  const t = Math.random() * Math.PI * 2;
  const phi = (Math.random() - 0.5) * Math.PI * 0.55;
  const rR = 0.9 + 0.1 * Math.random();
  const hPos = getHeartPoint(t, phi, rR);
  mesh.userData = { treePos: hPos, scatterPos: randomSpherePoint(50) };
  mesh.position.copy(mesh.userData.treePos);
  photoMeshes.push(mesh);
  mainGroup.add(mesh);
}

// --- Update photo logic per frame ---
export function updatePhotoLogic(bf, time) {
  const len = photoMeshes.length;
  if (!len) return;
  const yOffsetScale = (1 - bf) * 0.02;
  const targetBase = 1.8, targetRange = 0.7;
  for (let i = 0; i < len; i++) {
    const mesh = photoMeshes[i];
    _v.copy(mesh.userData.scatterPos).lerp(mesh.userData.treePos, bf);
    if (yOffsetScale > 0.001) mesh.position.y += Math.sin(time + i) * yOffsetScale;
    mesh.lookAt(camera.position);
    mesh.position.lerp(_v, 0.08);
    const targetScale = targetBase + targetRange * (1 - bf);
    mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.08));
  }
}

// --- Cleanup photos ---
export function cleanupPhotos() {
  photoUrls.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
  photoParticleCache = [];
  photoUrls = [];
  photoMeshes = [];
}
