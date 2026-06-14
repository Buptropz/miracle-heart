// Miracle Heart — Shared Mutable State
// ============================================================

import { STATE } from './config.js';

export const state = {
  currentState: STATE.PARTICLE,
  zoomTargetIndex: -1,
  currentBg: 'midnight-rose',
  blendFactor: 1,
  rotationSpeed: 0.002,
  ringCurrentAngle: 0,
};

// --- Update status bar ---
export function updateStatus(msg, color) {
  const el = document.getElementById('status-msg');
  const dot = document.getElementById('status-dot');
  if (el) el.innerText = msg;
  if (dot) {
    dot.style.background = color;
    dot.style.animation = 'none';
    dot.offsetHeight; // reflow
    dot.style.animation = 'statusPulse 2s infinite';
  }
}
