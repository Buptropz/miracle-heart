// Miracle Heart — Cover Firefly Particle System
// ============================================================

const PARTICLE_COUNT = 400;
const COLORS = ['#ffd700', '#ffb6c1', '#fff5e6'];

let canvas, ctx;
let particles = [];
let animId = null;
let heartCenter = null;
let cardCenters = [];
let phase = 'intro';         // 'intro' | 'charging' | 'scattering' | 'gesture'
let phaseStartTime = 0;

class Firefly {
  constructor(w, h) {
    this.x = 0;
    this.y = 0;
    this.size = 0;
    this.speed = 0;
    this.wanderPhase = 0;
    this.wanderSpeed = 0;
    this.flickerPhase = 0;
    this.flickerSpeed = 0;
    this.color = '';
    this.attracted = false;
    this.angle = 0;
    this.orbitRadius = 0;
    this.orbitSpeed = 0;
    this.vx = 0;
    this.vy = 0;
    this._targetCard = null;
    this.reset(w, h, true);
  }

  reset(w, h, initial) {
    this.x = Math.random() * w;
    this.y = initial ? Math.random() * h : h + Math.random() * 40;
    this.size = 0.8 + Math.random() * 2.7;
    this.speed = 0.3 + Math.random() * 1.2;
    this.wanderPhase = Math.random() * Math.PI * 2;
    this.wanderSpeed = 0.005 + Math.random() * 0.015;
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.flickerSpeed = 0.02 + Math.random() * 0.05;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.attracted = Math.random() < 0.2;
    this.angle = Math.random() * Math.PI * 2;
    this.orbitRadius = 30 + Math.random() * 70;
    this.orbitSpeed = (0.005 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1);
    this.vx = 0;
    this.vy = 0;
    this._targetCard = null;
  }

  update(w, h) {
    this.flickerPhase += this.flickerSpeed;

    if (phase === 'intro') {
      this._updateIntro(w, h);
    } else if (phase === 'charging') {
      this._updateCharging();
    } else if (phase === 'scattering') {
      this._updateScattering(w, h);
    } else if (phase === 'gesture') {
      this._updateGesture(w, h);
    }
  }

  _updateIntro(w, h) {
    if (this.attracted && heartCenter) {
      this.angle += this.orbitSpeed;
      const tx = heartCenter.x + Math.cos(this.angle) * this.orbitRadius;
      const ty = heartCenter.y + Math.sin(this.angle) * this.orbitRadius * 0.55;
      this.x += (tx - this.x) * 0.015;
      this.y += (ty - this.y) * 0.015;
    } else {
      this.y -= this.speed;
      this.x += Math.sin(this.wanderPhase + this.y * 0.008) * 0.35;
      this.wanderPhase += this.wanderSpeed;
    }
    if (this.y < -30 || this.x < -30 || this.x > w + 30) {
      this.reset(w, h, false);
    }
  }

  _updateCharging() {
    // Particles hover in place, slight outward expansion
    this.speed *= 0.92;
    this.y -= this.speed * 0.1;
    this.x += Math.sin(this.wanderPhase) * 0.1;
    this.wanderPhase += this.wanderSpeed;
  }

  _updateScattering(w, h) {
    if (!heartCenter) {
      this.y -= this.speed;
      return;
    }
    // Accelerate away from heartbeat center
    if (this.vx === 0 && this.vy === 0) {
      const dx = this.x - heartCenter.x;
      const dy = this.y - heartCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const baseSpeed = 3 + Math.random() * 3; // 3-6 px/frame
      this.vx = (dx / dist) * baseSpeed;
      this.vy = (dy / dist) * baseSpeed;
    }
    this.vx *= 1.02; // slight acceleration
    this.vy *= 1.02;
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -60 || this.x > w + 60 || this.y < -60 || this.y > h + 60) {
      this.vx = 0;
      this.vy = 0;
    }
  }

  _updateGesture(w, h) {
    // 40% of particles get pulled toward gesture cards
    if (!this._targetCard && cardCenters.length > 0 && Math.random() < 0.4) {
      this._targetCard = cardCenters[Math.floor(Math.random() * cardCenters.length)];
      this.orbitRadius = 15 + Math.random() * 40;
      this.orbitSpeed = (0.02 + Math.random() * 0.04) * (Math.random() > 0.5 ? 1 : -1);
      this.angle = Math.random() * Math.PI * 2;
    }

    if (this._targetCard) {
      this.angle += this.orbitSpeed;
      const tx = this._targetCard.x + Math.cos(this.angle) * this.orbitRadius;
      const ty = this._targetCard.y + Math.sin(this.angle) * this.orbitRadius * 0.6;
      this.x += (tx - this.x) * 0.04;
      this.y += (ty - this.y) * 0.04;
      this.size *= 0.998; // gradually shrink
    } else {
      // Free particles: very slow drift
      this.y -= this.speed * 0.15;
      this.x += Math.sin(this.wanderPhase + this.y * 0.003) * 0.15;
      this.wanderPhase += this.wanderSpeed * 0.5;
    }

    this.vx *= 0.95;
    this.vy *= 0.95;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y < -30 || this.x < -30 || this.x > w + 30) {
      this.reset(w, h, false);
    }
  }

  draw(ctx) {
    const flicker = 0.35 + 0.65 * Math.abs(Math.sin(this.flickerPhase));
    const alpha = flicker * 0.65;

    ctx.save();
    const r = this.size * 2.5;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0, this.color);
    grad.addColorStop(0.35, this.color);
    grad.addColorStop(1, 'transparent');

    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function updateHeartCenter() {
  const ring = document.getElementById('heartbeat-ring');
  if (!ring) { heartCenter = null; return; }
  const rect = ring.getBoundingClientRect();
  const cRect = canvas.getBoundingClientRect();
  heartCenter = {
    x: rect.left + rect.width / 2 - cRect.left,
    y: rect.top + rect.height / 2 - cRect.top,
  };
}

function updateCardCenters() {
  const cards = document.querySelectorAll('.gesture-card');
  cardCenters = [];
  const cRect = canvas.getBoundingClientRect();
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    cardCenters.push({
      x: rect.left + rect.width / 2 - cRect.left,
      y: rect.top + rect.height / 2 - cRect.top,
    });
  });
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  updateHeartCenter();
}

function animate() {
  animId = requestAnimationFrame(animate);

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  updateHeartCenter();

  // Phase transitions
  if (phase === 'charging' && performance.now() - phaseStartTime > 200) {
    phase = 'scattering';
    phaseStartTime = performance.now();
    // Initialize scatter velocities
    for (const p of particles) {
      p.vx = 0;
      p.vy = 0;
    }
  }
  if (phase === 'scattering' && performance.now() - phaseStartTime > 600) {
    phase = 'gesture';
    phaseStartTime = performance.now();
    updateCardCenters();
  }

  for (const p of particles) {
    p.update(w, h);
    p.draw(ctx);
  }
}

export function initCover() {
  canvas = document.getElementById('firefly-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  resize();

  const w = window.innerWidth;
  const h = window.innerHeight;
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Firefly(w, h));
  }

  phase = 'intro';
  phaseStartTime = 0;
  window.addEventListener('resize', resize);
  animate();
}

export function triggerScatter() {
  phase = 'charging';
  phaseStartTime = performance.now();
}

export function destroyCover() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  particles = [];
  heartCenter = null;
  cardCenters = [];
  phase = 'intro';
}
