// Miracle Heart — UI Controls & DOM Management
// ============================================================

import { STATE } from './config.js';
import { state, updateStatus } from './state.js';
import { bloomPass } from './scene.js';
import { setBackground as setSceneBg } from './scene.js';
import { audioEl, audioCtx } from './audio.js';
import {
  photoUrls, photoParticleCache,
  addPhotoMesh, startPhotoParticleTransition, cleanupTransition,
} from './photos.js';

// --- Update HTML overlay visibility ---
export function updateHTMLOverlay() {
  if (state.currentState !== STATE.ZOOM) cleanupTransition();

  const wrapper = document.getElementById('canvas-wrapper');
  wrapper.classList.remove('show-zoom', 'show-wall', 'show-ring');

  if (state.currentState === STATE.ZOOM) {
    const imgTarget = photoUrls[state.zoomTargetIndex];
    if (imgTarget) startPhotoParticleTransition(imgTarget);
    wrapper.classList.add('show-zoom');
  } else if (state.currentState === STATE.WALL) {
    wrapper.classList.add('show-wall');
  } else if (state.currentState === STATE.RING) {
    wrapper.classList.add('show-ring');
  }
}

// --- Render meteor wall ---
export function renderMeteorWall() {
  const wall = document.getElementById('wall-view');
  wall.innerHTML = '';
  photoUrls.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'meteor-img';
    img.style.animation =
      `meteorFly 1.0s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s forwards`;
    wall.appendChild(img);
  });
}

// --- Render ring gallery ---
export function renderRingView() {
  const ring = document.getElementById('ring-view');
  ring.innerHTML = '';
  if (photoUrls.length === 0) return;
  photoUrls.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'ring-img';
    ring.appendChild(img);
  });
}

// --- Setup all UI event listeners ---
export function setupUI() {
  const titleEl = document.getElementById('main-title');

  // Toggle settings panel
  document.getElementById('toggle-btn').addEventListener('click', () => {
    document.getElementById('ui-panel').classList.toggle('hidden');
  });

  // Fullscreen
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      document.getElementById('btn-fullscreen').innerText = '❌ 退出全屏';
    } else {
      document.exitFullscreen();
      document.getElementById('btn-fullscreen').innerText = '⛶ 全屏模式';
    }
  });

  // Camera toggle
  document.getElementById('btn-toggle-cam').addEventListener('click', () => {
    document.getElementById('video-container').classList.toggle('hidden-cam');
  });

  // Title customization
  document.getElementById('custom-text').addEventListener('input', (e) => {
    titleEl.innerText = e.target.value;
  });
  document.getElementById('font-size').addEventListener('input', (e) => {
    titleEl.style.fontSize = e.target.value + 'rem';
    document.getElementById('val-font-size').innerText = e.target.value;
  });
  document.getElementById('font-family').addEventListener('change', (e) => {
    titleEl.style.fontFamily = e.target.value;
  });

  // Background theme
  document.getElementById('bg-select').addEventListener('change', (e) => {
    state.currentBg = setSceneBg(e.target.value);
  });

  // Rotation speed slider
  document.getElementById('rot-speed').addEventListener('input', (e) => {
    state.rotationSpeed = parseFloat(e.target.value);
    document.getElementById('val-rot').innerText = state.rotationSpeed.toFixed(3);
  });

  // Beat sensitivity
  document.getElementById('beat-sense').addEventListener('input', (e) => {
    document.getElementById('val-beat').innerText = parseFloat(e.target.value).toFixed(1);
  });

  // Bloom strength
  document.getElementById('bloom-strength').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById('val-bloom').innerText = v.toFixed(1);
    if (bloomPass) bloomPass.strength = v;
  });

  // Music upload
  document.getElementById('music-input').addEventListener('change', (e) => {
    if (e.target.files[0] && audioEl) {
      audioEl.src = URL.createObjectURL(e.target.files[0]);
      audioEl.play().then(() => {
        document.getElementById('btn-play-pause').innerText = '⏸';
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      }).catch((err) => console.log(err));
    }
  });

  // Play/Pause
  document.getElementById('btn-play-pause').addEventListener('click', () => {
    if (!audioEl) return;
    if (audioEl.paused) {
      audioEl.play();
      document.getElementById('btn-play-pause').innerText = '⏸';
    } else {
      audioEl.pause();
      document.getElementById('btn-play-pause').innerText = '▶';
    }
  });

  // Volume
  document.getElementById('volume-slider').addEventListener('input', (e) => {
    if (audioEl) audioEl.volume = e.target.value;
  });

  // QR Code share
  document.getElementById('btn-share-qr').addEventListener('click', async () => {
    const modal = document.getElementById('qr-modal');
    const canvas = document.getElementById('qr-canvas');
    const urlEl = document.getElementById('qr-url');
    try {
      const QRCode = (await import('https://esm.sh/qrcode@1.5.3')).default;
      const url = window.location.href;
      await QRCode.toCanvas(canvas, url, {
        width: 200,
        margin: 2,
        color: { dark: '#ffb6c1', light: '#181225' },
      });
      urlEl.textContent = url;
      modal.classList.add('show');
    } catch (e) {
      console.error('QR Code error:', e);
    }
  });

  document.getElementById('qr-close').addEventListener('click', () => {
    document.getElementById('qr-modal').classList.remove('show');
  });

  // Photo upload
  document.getElementById('file-input').addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    const files = Array.from(e.target.files);
    updateStatus(`📸 正在处理 ${files.length} 张照片...`, '#ffaa00');

    for (const file of files) {
      const blobUrl = URL.createObjectURL(file);
      photoUrls.push(blobUrl);

      const img = await new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.src = blobUrl;
      });

      // Pre-sample for particle cache
      const sw = 48, sh = 36;
      const sampler = document.createElement('canvas');
      sampler.width = sw;
      sampler.height = sh;
      const sctx = sampler.getContext('2d');
      sctx.drawImage(img, 0, 0, sw, sh);
      const data = sctx.getImageData(0, 0, sw, sh).data;
      const particles = [];
      for (let y = 0; y < sh; y++)
        for (let x = 0; x < sw; x++) {
          const idx = (y * sw + x) * 4;
          if (data[idx + 3] > 30)
            particles.push({
              nx: x / sw,
              ny: y / sh,
              r: data[idx] / 255,
              g: data[idx + 1] / 255,
              b: data[idx + 2] / 255,
            });
        }
      photoParticleCache.push(particles);

      // Add 3D mesh to heart
      addPhotoMesh(img);

      // Yield to main thread
      await new Promise((r) => setTimeout(r, 0));
    }

    setTimeout(
      () => updateStatus(`📸 已注入 ${photoUrls.length} 枚甜蜜记忆`, '#ff758c'),
      500,
    );
  });
}
