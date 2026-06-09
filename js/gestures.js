// Miracle Heart — Hand Tracking & Gesture Recognition
// ============================================================

import * as THREE from 'https://esm.sh/three@0.160.0';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';
import { CONFIG, STATE } from './config.js';
import { state, updateStatus } from './state.js';
import { photoUrls } from './photos.js';
import { updateHTMLOverlay, renderRingView, renderMeteorWall } from './ui.js';

export let handPos = { x: 0.5, y: 0.5 };
export let handTracked = false;

let lastVideoTime = -1;
let lastRightGripChange = 0;
let lastGripDisplay = -1;
let handFrameSkip = 0;
let lastLeftGesture = 'none';
let prevHandsState = { left: { active: false }, right: { active: false } };
let mediaStream = null;
let rAF_video = null;

// --- Initialize MediaPipe ---
export async function initAI() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
    );
    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    });

    const video = document.getElementById('input-video');
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = mediaStream;

    video.addEventListener('loadeddata', () => {
      updateStatus('✨ 浪漫交互系统已就绪 · 请牵起她的手一同见证', '#ff758c');
      processVideo(landmarker, video);
    });
  } catch (error) {
    console.error('AI engine error:', error);
    updateStatus('⚠️ 未开启摄像头或检测环境限制', '#ff4466');
  }
}

// --- Process video frames ---
function processVideo(landmarker, video) {
  handFrameSkip++;
  if (video.currentTime !== lastVideoTime && handFrameSkip % CONFIG.handFrameStep === 0) {
    lastVideoTime = video.currentTime;
    const result = landmarker.detectForVideo(video, performance.now());
    handleResult(result, video);
  } else if (video.currentTime !== lastVideoTime && handFrameSkip % CONFIG.handFrameStep === 1) {
    const result = landmarker.detectForVideo(video, performance.now());
    if (result.landmarks && result.landmarks.length > 0) {
      const hands = result.landmarks.map((m, idx) => ({
        marks: m,
        label: result.handedness?.[idx]?.[0]?.label || 'Unknown',
        x: m[9].x,
      }));
      let rightHand = null;
      if (hands.length === 2) {
        hands.sort((a, b) => a.x - b.x);
        rightHand = hands[0];
      } else if (hands.length === 1 && hands[0].x < 0.45) {
        rightHand = hands[0];
      }
      if (rightHand) {
        handPos.x = handPos.x * 0.85 + (1 - rightHand.marks[9].x) * 0.15;
        handPos.y = handPos.y * 0.85 + rightHand.marks[9].y * 0.15;
        handTracked = true;
      }
    }
  }
  rAF_video = requestAnimationFrame(() => processVideo(landmarker, video));
}

// --- Handle detection results ---
function handleResult(result, video) {
  const canvas = document.getElementById('skeleton-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (result.landmarks && result.landmarks.length > 0) {
    document.getElementById('video-container').style.borderColor =
      'rgba(255, 117, 140, 0.8)';

    const detected = result.landmarks.map((marks, idx) => {
      let label = 'Unknown';
      if (result.handedness && result.handedness[idx] && result.handedness[idx].length > 0) {
        label =
          result.handedness[idx][0].label ||
          result.handedness[idx][0].categoryName ||
          'Unknown';
      }
      drawHand(ctx, marks, canvas.width, canvas.height);

      const H = Math.sqrt(
        (marks[5].x - marks[0].x) ** 2 + (marks[5].y - marks[0].y) ** 2,
      );
      let totalDist = 0;
      [8, 12, 16, 20].forEach(
        (tip) =>
          (totalDist += Math.sqrt(
            (marks[tip].x - marks[0].x) ** 2 + (marks[tip].y - marks[0].y) ** 2,
          )),
      );
      const grip = Math.max(0, Math.min(1, 1 - (totalDist / 4 - H * 0.6) / (H * 1.8)));
      const pinchDist = Math.sqrt(
        (marks[4].x - marks[8].x) ** 2 + (marks[4].y - marks[8].y) ** 2,
      );
      return { marks, label, grip, isPinch: pinchDist < H * 0.38, x: marks[9].x };
    });

    let rightHand = null;
    let leftHand = null;
    if (detected.length === 2) {
      detected.sort((a, b) => a.x - b.x);
      rightHand = detected[0];
      leftHand = detected[1];
    } else if (detected.length === 1) {
      const h = detected[0];
      if (h.x < 0.45) rightHand = h;
      else if (h.x > 0.55) leftHand = h;
      else {
        if (prevHandsState.right.active) rightHand = h;
        else leftHand = h;
      }
    }

    prevHandsState.right.active = !!rightHand;
    prevHandsState.left.active = !!leftHand;
    handTracked = !!rightHand;

    if (rightHand) applyRightHand(rightHand);
    if (leftHand) applyLeftHand(leftHand);
  } else {
    prevHandsState.right.active = false;
    prevHandsState.left.active = false;
    handTracked = false;
    document.getElementById('video-container').style.borderColor =
      'rgba(255, 182, 193, 0.4)';
  }
}

// --- Right hand: controls blend factor and rotation ---
function applyRightHand(data) {
  const now = performance.now();
  const { marks, grip } = data;

  let targetBlend = 0;
  if (grip < 0.3) targetBlend = 0;
  else if (grip > 0.55) targetBlend = 1;
  else targetBlend = (grip - 0.3) / 0.25;

  state.blendFactor = THREE.MathUtils.lerp(state.blendFactor, targetBlend, 0.2);

  handPos.x = handPos.x * 0.85 + (1 - marks[9].x) * 0.15;
  handPos.y = handPos.y * 0.85 + marks[9].y * 0.15;
  handTracked = true;

  const openness = 1 - grip;
  const targetSpeed = 0.0005 + openness * 0.03;
  state.rotationSpeed = THREE.MathUtils.lerp(state.rotationSpeed, targetSpeed, 0.08);

  const pct = Math.round(targetBlend * 100);
  if (now - lastRightGripChange > 400 && pct !== lastGripDisplay) {
    lastGripDisplay = pct;
    lastRightGripChange = now;
    let msg, color;
    if (pct < 15) {
      msg = `💥 星云散落 · 漫天星芒只为你倾泻 [${pct}%]`;
      color = '#ffb6c1';
    } else if (pct < 50) {
      msg = `💫 宇宙微尘正在聆听你们的心跳... [${pct}%]`;
      color = '#ffd700';
    } else if (pct < 85) {
      msg = `❤️ 爱意正在慢慢凝聚成形... [${pct}%]`;
      color = '#ff758c';
    } else {
      msg = `✨ 完美心形 · 这是送给你的宇宙奇迹`;
      color = '#ff3355';
    }
    updateStatus(msg, color);
  }
}

// --- Left hand: gesture triggers (pinch/scissors/fist) ---
function applyLeftHand(data) {
  const { marks, grip, isPinch } = data;

  const d = (tip, mcp) => {
    const tipD = Math.sqrt(
      (marks[tip].x - marks[0].x) ** 2 + (marks[tip].y - marks[0].y) ** 2,
    );
    const mcpD = Math.sqrt(
      (marks[mcp].x - marks[0].x) ** 2 + (marks[mcp].y - marks[0].y) ** 2,
    );
    return tipD / mcpD;
  };
  const isScissors =
    d(8, 5) > 1.3 && d(12, 9) > 1.3 && d(16, 13) < 0.95 && d(20, 17) < 0.95;

  let gesture = 'none';
  if (grip > 0.7) gesture = 'fist';
  else if (isPinch) gesture = 'pinch';
  else if (isScissors) gesture = 'scissors';

  if (gesture !== lastLeftGesture) {
    if (gesture === 'pinch') {
      triggerPhotoFlow();
    } else if (gesture === 'scissors') {
      if (photoUrls.length > 0 && state.currentState !== STATE.RING) {
        state.currentState = STATE.RING;
        renderRingView();
        updateHTMLOverlay();
        updateStatus('✌️ 唤醒立体画廊 · 记录属于我们的点点滴滴 🖼️', '#dd88ff');
      }
    } else if (gesture === 'fist') {
      if (state.currentState !== STATE.PARTICLE) {
        state.currentState = STATE.PARTICLE;
        updateHTMLOverlay();
        updateStatus('✊ 隐入繁星 · 爱意永不落幕', '#ff758c');
      }
    }
    lastLeftGesture = gesture;
  }
}

// --- Draw hand skeleton ---
function drawHand(ctx, marks, w, h) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,117,140,0.7)';
  ctx.fillStyle = '#ffffff';
  const connections = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17],
  ];
  ctx.beginPath();
  for (const [a, b] of connections) {
    ctx.moveTo(marks[a].x * w, marks[a].y * h);
    ctx.lineTo(marks[b].x * w, marks[b].y * h);
  }
  ctx.stroke();
  for (const p of [4, 8, 12, 16, 20, 0]) {
    ctx.beginPath();
    ctx.arc(marks[p].x * w, marks[p].y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Photo flow state machine ---
function triggerPhotoFlow() {
  if (photoUrls.length === 0) {
    updateStatus('💓 记得先上传属于你们的照片哦', '#ff8800');
    return;
  }
  if (state.currentState === STATE.PARTICLE) {
    state.currentState = STATE.ZOOM;
    state.zoomTargetIndex = 0;
    preloadNextPhoto(0);
  } else if (state.currentState === STATE.ZOOM) {
    state.zoomTargetIndex++;
    if (state.zoomTargetIndex >= photoUrls.length) {
      state.currentState = STATE.WALL;
      renderMeteorWall();
    } else {
      preloadNextPhoto(state.zoomTargetIndex);
    }
  } else if (state.currentState === STATE.WALL) {
    state.currentState = STATE.RING;
    renderRingView();
  } else if (state.currentState === STATE.RING) {
    state.currentState = STATE.ZOOM;
    state.zoomTargetIndex = 0;
  }
  updateHTMLOverlay();
}

// --- Preload next photo ---
function preloadNextPhoto(currentIdx) {
  const nextIdx = currentIdx + 1;
  if (nextIdx < photoUrls.length) {
    const pre = new Image();
    pre.src = photoUrls[nextIdx];
  }
}

// --- Cleanup ---
export function cleanupGestures() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (rAF_video) {
    cancelAnimationFrame(rAF_video);
    rAF_video = null;
  }
}
