// Miracle Heart — Main Orchestration
// ============================================================

import * as THREE from 'https://esm.sh/three@0.160.0';
import { CONFIG, STATE } from './config.js';
import { state, updateStatus } from './state.js';
import {
  initThree, createStarField, createSnow,
  scene, camera, renderer, composer, mainGroup,
  bloomPass, starFieldMat,
} from './scene.js';
import {
  createMaterialsAndMeshes, createSparkles, createDust, createTrailSystem,
  createRingParticleSystem, updateMeshLogic, updateSparkleLogic, updateDustLogic,
  updateTrailSystem,
  roseGoldMesh, champagneMesh, blushMesh, pearlMesh,
  sapphireMesh, amethystMesh,
  sparkleSystem, dustSystem, logicData, trailSystem, ringParticlesSys,
} from './particles.js';
import { initAI, cleanupGestures, handPos, handTracked } from './gestures.js';
import { initAudio, updateBeat, cleanupAudio, audioEl, audioCtx, beat } from './audio.js';
import { setupUI } from './ui.js';
import { photoMeshes, updatePhotoLogic, updateTransition, cleanupPhotos, cleanupTransition } from './photos.js';

let time = 0;
let snowSystem;
let frameTimes = [];
let fpsAvg = 60;
let rAF_main = null;

// --- Main animation loop ---
function animate() {
  rAF_main = requestAnimationFrame(animate);
  time += 0.01;

  // Adaptive framerate detection
  frameTimes.push(performance.now());
  if (frameTimes.length >= 30) {
    const elapsed = frameTimes[frameTimes.length - 1] - frameTimes[0];
    fpsAvg = 30000 / elapsed;
    frameTimes = frameTimes.slice(-15);
    if (fpsAvg < 24) {
      bloomPass.strength = Math.min(bloomPass.strength, CONFIG.bloomStrength * 0.6);
    }
  }

  // Audio beat detection
  updateBeat(document.getElementById('beat-sense')?.value || '1');

  // Star field twinkle
  if (starFieldMat) {
    starFieldMat.mat1.opacity = 0.5 + Math.sin(time * 1.5) * 0.15;
    starFieldMat.mat3.opacity = 0.7 + Math.sin(time * 3.0) * 0.25;
  }

  // Blend factor easing
  const easedBf = 1.0 - Math.pow(1.0 - state.blendFactor, 3.0);

  // Heart pulse
  let heartPulse = 1.0;
  if (state.blendFactor > 0.8) {
    const pulsePeriod = (time * 3.5) % (Math.PI * 2);
    let pulseCurve = Math.sin(pulsePeriod);
    if (pulseCurve > 0) {
      heartPulse = 1.0 + Math.pow(pulseCurve, 4.0) * 0.04 * state.blendFactor;
    }
  }
  mainGroup.scale.setScalar(heartPulse * (1.0 + beat * 0.03));

  // Update all particle systems — romantic palette
  updateMeshLogic(roseGoldMesh, logicData.roseGold, easedBf, time);
  updateMeshLogic(champagneMesh, logicData.champagne, easedBf, time);
  updateMeshLogic(blushMesh, logicData.blush, easedBf, time);
  updateMeshLogic(pearlMesh, logicData.pearl, easedBf, time);
  updateMeshLogic(sapphireMesh, logicData.sapphire, easedBf, time);
  updateMeshLogic(amethystMesh, logicData.amethyst, easedBf, time);
  updateSparkleLogic(easedBf, time);
  updateTrailSystem(state.blendFactor);
  updateDustLogic(easedBf, time);
  updatePhotoLogic(easedBf, time);

  // Central star
  if (logicData.star) {
    const star = logicData.star;
    const target = new THREE.Vector3()
      .copy(star.userData.scatterPos)
      .lerp(star.userData.treePos, easedBf);
    star.position.lerp(target, 0.04);
    star.rotation.y += 0.012 + beat * 0.01;
    star.rotation.x += 0.006;
    // Pulse star emissive with beat
    star.material.emissiveIntensity = 2.0 + beat * 2.5;
  }

  // Hand-driven rotation
  mainGroup.rotation.x = THREE.MathUtils.lerp(
    mainGroup.rotation.x, (handPos.y - 0.5) * 0.4, 0.05,
  );
  mainGroup.rotation.z = THREE.MathUtils.lerp(
    mainGroup.rotation.z, (handPos.x - 0.5) * 0.4, 0.05,
  );

  const rotMultiplier = 0.35 + 0.65 * Math.min(1, state.blendFactor / 0.3);
  mainGroup.rotation.y += state.rotationSpeed * rotMultiplier;
  if (!handTracked) {
    const sliderVal = parseFloat(document.getElementById('rot-speed')?.value || '0.002');
    state.rotationSpeed = THREE.MathUtils.lerp(state.rotationSpeed, sliderVal, 0.03);
  }

  // Snow animation
  if (snowSystem && fpsAvg > 20) {
    const p = snowSystem.geometry.attributes.position.array;
    const snowFall = 0.12 - beat * 0.05;
    for (let i = 1, n = p.length; i < n; i += 3) {
      p[i] -= snowFall;
      if (p[i] < -50) {
        p[i] = 150;
        p[i - 1] = (Math.random() - 0.5) * 400;
        p[i + 1] = (Math.random() - 0.5) * 400 - 200;
      }
    }
    snowSystem.geometry.attributes.position.needsUpdate = true;
  }

  // Photo transition update
  updateTransition();

  // Ring gallery particles
  if (ringParticlesSys) {
    if (state.currentState === STATE.RING) {
      const sys = ringParticlesSys;
      const pos = sys.points.geometry.attributes.position.array;
      const base = sys.basePos;
      for (let i = 0; i < sys.data.length; i++) {
        const d = sys.data[i];
        const baseX = base[i * 3];
        const baseZ = base[i * 3 + 2];
        const baseRadius = Math.sqrt(baseX * baseX + baseZ * baseZ);
        const angle = d.phase + time * d.speed;
        const r = baseRadius + Math.sin(time * 0.7 + d.floatOffset) * 15;
        const floatY = Math.sin(time * 0.5 + d.floatOffset) * 12;
        pos[i * 3] = Math.cos(angle) * r;
        pos[i * 3 + 1] = base[i * 3 + 1] + floatY;
        pos[i * 3 + 2] = Math.sin(angle) * r * 0.5;
      }
      sys.points.geometry.attributes.position.needsUpdate = true;
      sys.points.visible = true;
    } else {
      ringParticlesSys.points.visible = false;
    }
  }

  // Ring gallery DOM animation
  if (state.currentState === STATE.RING) {
    const ringView = document.getElementById('ring-view');
    if (ringView) {
      state.ringCurrentAngle += 0.004 + beat * 0.003;
      const imgs = ringView.querySelectorAll('.ring-img');
      const numPhotos = imgs.length;
      const spacing = CONFIG.ringPhotoSpacing || 210;
      const computedRadius = (numPhotos * spacing) / (2 * Math.PI);
      const maxRadius = Math.min(window.innerWidth, window.innerHeight) * 0.38;
      const radius = Math.max(180, Math.min(computedRadius, maxRadius));

      imgs.forEach((img, i) => {
        const a = (Math.PI * 2 / numPhotos) * i + state.ringCurrentAngle;
        const x = Math.cos(a) * radius;
        const waveY = Math.sin(time * 2.0 + i) * 14;
        const y = Math.sin(a) * radius * 0.35 + waveY;
        const depth = Math.sin(a);
        const baseScale = THREE.MathUtils.lerp(0.75, 1.25, (depth + 1) / 2);
        const pop = 0.8 * Math.exp(-Math.pow((1 - depth) * 3.5, 2));
        const scale = baseScale + pop;
        img.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;

        if (depth > 0.2 && Math.abs(Math.cos(a)) < 0.6) {
          img.classList.remove('is-background');
          img.style.zIndex = 100;
        } else {
          img.classList.add('is-background');
          img.style.zIndex = Math.floor((depth + 1) * 10);
        }
      });
    }
  }

  composer.render();
}

// --- Bootstrap ---
document.getElementById('btn-start').addEventListener('click', async () => {
  const screen = document.getElementById('start-screen');
  screen.style.opacity = '0';
  setTimeout(() => {
    screen.style.display = 'none';
  }, 1000);

  document.getElementById('main-title').style.opacity = '1';
  document.getElementById('video-container').classList.remove('hidden-cam');
  updateStatus('💖 正在唤醒属于你们的星云空间...', '#ff758c');

  // Init Three.js
  const container = document.getElementById('canvas-container');
  initThree(container);
  createStarField();
  snowSystem = createSnow();
  createMaterialsAndMeshes();
  createSparkles();
  createDust();
  createTrailSystem();
  createRingParticleSystem();

  // Init audio
  initAudio(updateStatus);
  if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();

  // Init hand tracking (non-blocking — doesn't prevent particles from rendering)
  initAI().catch((err) => {
    console.warn('Hand tracking unavailable:', err);
    updateStatus('⚠️ 摄像头未就绪 · 粒子星云仍可正常体验', '#ffaa00');
  });

  // Setup UI
  setupUI();

  // Start render loop
  animate();
});

// --- Cleanup on unload ---
window.addEventListener('beforeunload', () => {
  cleanupGestures();
  cleanupAudio();
  cleanupPhotos();
  cleanupTransition();

  if (trailSystem && trailSystem.mesh) {
    mainGroup.remove(trailSystem.mesh);
    trailSystem.mesh.geometry.dispose();
    trailSystem.mesh.material.dispose();
  }
  if (ringParticlesSys && ringParticlesSys.points) {
    scene.remove(ringParticlesSys.points);
    ringParticlesSys.points.geometry.dispose();
    ringParticlesSys.points.material.dispose();
  }
  if (renderer) renderer.dispose();
  if (rAF_main) cancelAnimationFrame(rAF_main);
});
