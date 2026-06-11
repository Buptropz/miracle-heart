// Miracle Heart — Cover Firefly Particle System
// ============================================================

const PARTICLE_COUNT = 400;
const COLORS = ['#ffd700', '#ffb6c1', '#fff5e6']; // amber, pink, warm white

let canvas, ctx;
let particles = [];
let animId = null;
let heartCenter = null;

class Firefly {
  constructor(w, h) {
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
  }

  update(w, h) {
    this.flickerPhase += this.flickerSpeed;

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

  // Update heart center each frame (handles layout shifts)
  updateHeartCenter();

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

  window.addEventListener('resize', resize);
  animate();
}

export function destroyCover() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  particles = [];
  heartCenter = null;
}
