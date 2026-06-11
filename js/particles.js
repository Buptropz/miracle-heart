// Miracle Heart — Romantic Particle Systems
// ============================================================

import * as THREE from 'https://esm.sh/three@0.160.0';
import { CONFIG } from './config.js';
import { scene, mainGroup, _v, dummy } from './scene.js';

export let roseGoldMesh, champagneMesh, blushMesh, pearlMesh, sapphireMesh, amethystMesh, sparkleSystem, dustSystem;
export let logicData = {
  roseGold: [], champagne: [], blush: [], pearl: [], sapphire: [], amethyst: [],
  sparkle: [], dust: [],
  star: null, roseGoldTrail: [],
};
export let trailSystem = null;
export let ringParticlesSys = null;
export let ripplePool = [];
export let nebulaVortex = null;
let lastRippleTime = 0;
let lastRippleFrameTime = 0;

// --- Romantic color palette ---
const PALETTE = {
  roseGold:   0xe8a0b4, // 玫瑰金 — warm pink with gold
  champagne:  0xffe4c4, // 香槟 — soft cream-gold
  blush:      0xff8fab, // 腮红粉 — fresh romantic pink
  pearl:      0xfff0f5, // 珍珠白 — luminous white-pink
  deepRose:   0xff4477, // 深玫瑰 — passionate accent
  lavender:   0xc8b0e8, // 薰衣草紫 — soft purple whisper
  coral:      0xff7f7f, // 珊瑚 — warm coral glow
  gold:       0xffd700, // 纯金 — sparkling highlight
  sapphire:   0x7eb8da, // 蓝宝石 — dreamy sky blue
  amethyst:   0xb892d8, // 紫水晶 — deep romantic purple
  indigo:     0x8899dd, // 靛蓝 — midnight blue whisper
  ice:        0xc8ddf0, // 冰蓝 — frozen crystal blue
};

// --- Enhanced heart shape (fuller, rounder, more natural) ---
export function getHeartPoint(t, phi, rR) {
  const s = Math.sin(t);
  const s2 = s * s;
  const s3 = s2 * s;
  // Fuller heart curve — gentler lobes, rounder bottom
  const heartX = 14.5 * s3;
  const heartY =
    13.5 * Math.cos(t)
    - 5.5 * Math.cos(2 * t)
    - 2.2 * Math.cos(3 * t)
    - 0.8 * Math.cos(4 * t);
  // More 3D depth for a sculptural feel
  return new THREE.Vector3(
    heartX * Math.cos(phi) * rR * 1.25,
    heartY * rR * 1.25 + 3.5,
    heartX * Math.sin(phi) * rR * 0.65,
  );
}

// --- Random point on sphere ---
export function randomSpherePoint(r) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  );
}

// --- Create instanced mesh with per-particle color variation ---
function createRomanticInstancedMesh(geo, mat, count, dataArray, colorShiftRange) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Per-instance color for subtle variation
  if (mesh.instanceColor) {
    for (let i = 0; i < count; i++) {
      const shift = colorShiftRange || 0.05;
      const tint = mat.color.clone();
      tint.r += (Math.random() - 0.5) * shift;
      tint.g += (Math.random() - 0.5) * shift;
      tint.b += (Math.random() - 0.5) * shift * 0.5;
      mesh.setColorAt(i, tint);
    }
    mesh.instanceColor.needsUpdate = true;
  }
  mainGroup.add(mesh);

  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.65;
    const rR = 0.85 + 0.15 * Math.random();
    const treePos = getHeartPoint(t, phi, rR);
    const scatterPos = randomSpherePoint(38 + Math.random() * 55);
    dataArray.push({
      treePos,
      scatterPos,
      currentPos: treePos.clone(),
      scale: 0.55 + Math.random() * 0.75,
      rotSpeed: { x: Math.random() * 0.018, y: Math.random() * 0.018 },
      rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
    });
  }
  return mesh;
}

// --- Create main romantic particle meshes ---
export function createMaterialsAndMeshes() {
  // ★ Rose Gold — main heart body, warm metallic pink
  const roseGoldMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.roseGold, metalness: 0.85, roughness: 0.12,
    clearcoat: 1.0, emissive: PALETTE.deepRose, emissiveIntensity: 0.25,
  });
  // ★ Champagne — golden accent
  const champagneMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.champagne, metalness: 0.95, roughness: 0.08,
    clearcoat: 1.0, emissive: PALETTE.gold, emissiveIntensity: 0.15,
  });
  // ★ Blush — fresh pink, translucent gem
  const blushMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.blush, metalness: 0.3, roughness: 0.05,
    transmission: 0.6, thickness: 1.8,
    emissive: PALETTE.coral, emissiveIntensity: 0.3,
  });
  // ★ Pearl — luminous white-pink highlights
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.pearl, metalness: 0.6, roughness: 0.05,
    transmission: 0.7, thickness: 2.0,
    emissive: PALETTE.lavender, emissiveIntensity: 0.2,
  });
  // ★ Sapphire — dreamy blue crystals
  const sapphireMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.sapphire, metalness: 0.4, roughness: 0.08,
    transmission: 0.55, thickness: 1.6,
    emissive: PALETTE.indigo, emissiveIntensity: 0.35,
  });
  // ★ Amethyst — deep purple gemstones
  const amethystMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.amethyst, metalness: 0.35, roughness: 0.06,
    transmission: 0.65, thickness: 2.0,
    emissive: PALETTE.lavender, emissiveIntensity: 0.4,
  });

  const segs = CONFIG.baseSphereSegs;

  // Rose gold: small spheres (main body)
  roseGoldMesh = createRomanticInstancedMesh(
    new THREE.SphereGeometry(0.5, segs, segs),
    roseGoldMat, CONFIG.roseGoldCount, logicData.roseGold, 0.06,
  );
  // Champagne: tiny cubes (sparkling accents)
  champagneMesh = createRomanticInstancedMesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    champagneMat, CONFIG.champagneCount, logicData.champagne, 0.04,
  );
  // Blush: octahedrons (gem-like)
  blushMesh = createRomanticInstancedMesh(
    new THREE.OctahedronGeometry(0.45, 0),
    blushMat, CONFIG.blushCount, logicData.blush, 0.05,
  );
  // Pearl: small cones (diamond sparkles)
  pearlMesh = createRomanticInstancedMesh(
    new THREE.ConeGeometry(0.3, 0.7, 6),
    pearlMat, CONFIG.pearlCount, logicData.pearl, 0.03,
  );
  // Sapphire: small octahedrons (blue crystals)
  sapphireMesh = createRomanticInstancedMesh(
    new THREE.OctahedronGeometry(0.4, 0),
    sapphireMat, CONFIG.sapphireCount, logicData.sapphire, 0.06,
  );
  // Amethyst: small dodecahedrons (purple gems)
  amethystMesh = createRomanticInstancedMesh(
    new THREE.DodecahedronGeometry(0.35, 0),
    amethystMat, CONFIG.amethystCount, logicData.amethyst, 0.06,
  );

  // ★ Central luminous star — the heart's core
  const star = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.5, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0.7, roughness: 0,
      emissive: PALETTE.blush, emissiveIntensity: 2.5,
      clearcoat: 1.0,
    }),
  );
  star.userData = {
    treePos: new THREE.Vector3(0, 20, 0),
    scatterPos: new THREE.Vector3(0, 55, 0),
  };
  star.position.copy(star.userData.treePos);
  mainGroup.add(star);
  logicData.star = star;
}

// --- Sparkle particles — tiny twinkling lights around the heart ---
export function createSparkles() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(CONFIG.sparkleCount * 3);
  const colors = new Float32Array(CONFIG.sparkleCount * 3);

  for (let i = 0; i < CONFIG.sparkleCount; i++) {
    const t = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.7;
    const rR = 0.9 + 0.2 * Math.random();
    const hp = getHeartPoint(t, phi, rR);
    // Slight random offset for twinkle effect
    pos[i * 3] = hp.x + (Math.random() - 0.5) * 3;
    pos[i * 3 + 1] = hp.y + (Math.random() - 0.5) * 3;
    pos[i * 3 + 2] = hp.z + (Math.random() - 0.5) * 3;

    // Random romantic color — warm + cool balance
    const colorChoice = Math.random();
    if (colorChoice < 0.25) {
      colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.71; colors[i * 3 + 2] = 0.76; // rose gold
    } else if (colorChoice < 0.45) {
      colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.89; colors[i * 3 + 2] = 0.77; // champagne
    } else if (colorChoice < 0.60) {
      colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.72; colors[i * 3 + 2] = 0.88; // sapphire blue
    } else if (colorChoice < 0.75) {
      colors[i * 3] = 0.75; colors[i * 3 + 1] = 0.58; colors[i * 3 + 2] = 0.85; // amethyst purple
    } else if (colorChoice < 0.88) {
      colors[i * 3] = 0.82; colors[i * 3 + 1] = 0.72; colors[i * 3 + 2] = 0.90; // lavender
    } else {
      colors[i * 3] = 0.82; colors[i * 3 + 1] = 0.90; colors[i * 3 + 2] = 0.96; // ice blue-white
    }

    logicData.sparkle.push({
      treePos: new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]),
      scatterPos: randomSpherePoint(70),
      currentPos: new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]),
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      baseSize: 0.3 + Math.random() * 0.8,
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  sparkleSystem = new THREE.Points(geo, mat);
  mainGroup.add(sparkleSystem);
}

// --- Dust particles — warm romantic mist swirling up from the heart ---
export function createDust() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(CONFIG.dustCount * 3);
  const colors = new Float32Array(CONFIG.dustCount * 3);

  for (let i = 0; i < CONFIG.dustCount; i++) {
    const t = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.6;
    const rR = 0.82 + 0.18 * Math.random();
    const hp = getHeartPoint(t, phi, rR);
    pos[i * 3] = hp.x;
    pos[i * 3 + 1] = hp.y;
    pos[i * 3 + 2] = hp.z;

    // Romantic warm+cool mix dust colors
    const hueRoll = Math.random();
    let dustHue;
    if (hueRoll < 0.3) dustHue = 0.92 + Math.random() * 0.1;       // pink-rose
    else if (hueRoll < 0.5) dustHue = 0.55 + Math.random() * 0.1;  // blue-sapphire
    else if (hueRoll < 0.7) dustHue = 0.72 + Math.random() * 0.08; // purple-amethyst
    else if (hueRoll < 0.85) dustHue = 0.12 + Math.random() * 0.06; // gold-champagne
    else dustHue = 0.78 + Math.random() * 0.1;                      // lavender-violet
    const dustColor = new THREE.Color().setHSL(dustHue % 1, 0.7, 0.55 + Math.random() * 0.35);
    colors[i * 3] = dustColor.r;
    colors[i * 3 + 1] = dustColor.g;
    colors[i * 3 + 2] = dustColor.b;

    logicData.dust.push({
      treePos: hp.clone(),
      scatterPos: randomSpherePoint(80),
      currentPos: hp.clone(),
      velocity: Math.random() * 0.04 + 0.015,
    });
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  dustSystem = new THREE.Points(geo, mat);
  mainGroup.add(dustSystem);
}

// --- Trail system (shader-based, warm pink-gold gradient) ---
export function createTrailSystem() {
  const total = CONFIG.roseGoldCount * CONFIG.trailLength;
  const pos = new Float32Array(total * 3);
  const alphas = new Float32Array(total);
  const sizes = new Float32Array(total);
  for (let i = 0; i < CONFIG.roseGoldCount; i++) {
    for (let j = 0; j < CONFIG.trailLength; j++) {
      const idx = i * CONFIG.trailLength + j;
      const t = 1 - j / CONFIG.trailLength;
      alphas[idx] = t * t * 0.5;
      sizes[idx] = 0.12 + t * 0.3;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(PALETTE.roseGold) } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (250.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float strength = 1.0 - smoothstep(0.0, 0.5, d) * 0.3;
        gl_FragColor = vec4(uColor, strength * vAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Points(geo, mat);
  mainGroup.add(mesh);

  const trails = Array.from({ length: CONFIG.roseGoldCount }, () =>
    Array.from({ length: CONFIG.trailLength }, () => new THREE.Vector3(0, 0, 0)),
  );
  logicData.roseGoldTrail = trails;
  trailSystem = { mesh, trailLen: CONFIG.trailLength, positions: pos };
}

// --- Ring gallery floating particles ---
export function createRingParticleSystem() {
  const count = 600;
  const pos = new Float32Array(count * 3);
  const data = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 140 + Math.random() * 190;
    pos[i * 3] = Math.cos(angle) * radius;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 2] = Math.sin(angle) * radius * 0.45;
    data.push({
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.006,
      floatOffset: Math.random() * 100,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: PALETTE.roseGold, size: 0.5, transparent: true,
    opacity: 0.35, blending: THREE.AdditiveBlending,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  scene.add(points);
  ringParticlesSys = { points, data, basePos: new Float32Array(pos) };
}

// --- Heartbeat ripple pool (L3) ---
export function createRipplePool() {
  const MAX_RIPPLES = 6;
  const RIPPLE_PARTICLES = 120;

  for (let i = 0; i < MAX_RIPPLES; i++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(RIPPLE_PARTICLES * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: PALETTE.roseGold,
      size: 0.8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    points.frustumCulled = false;
    mainGroup.add(points);

    // Pre-compute per-particle angles and thickness offsets for stability
    const angles = new Float32Array(RIPPLE_PARTICLES);
    const offsets = new Float32Array(RIPPLE_PARTICLES);
    for (let j = 0; j < RIPPLE_PARTICLES; j++) {
      angles[j] = (j / RIPPLE_PARTICLES) * Math.PI * 2;
      offsets[j] = (Math.random() - 0.5) * 2;
    }

    ripplePool.push({
      points,
      active: false,
      age: 0,
      baseColor: new THREE.Color(PALETTE.roseGold),
      angles,
      offsets,
    });
  }
}

// --- Update ripple lifecycle ---
export function updateRipples(now, beat, blendFactor) {
  const MAX_RIPPLES = 6;
  const RIPPLE_PARTICLES = 120;
  const LIFETIME = 1.8;
  const COOLDOWN = 0.2;

  // Compute real delta time
  const dt = lastRippleFrameTime ? Math.min(now - lastRippleFrameTime, 0.1) : 0.016;
  lastRippleFrameTime = now;

  // Auto-heartbeat when no music: ~72 BPM = one beat per 0.833s
  const autoBeat = Math.sin(now * Math.PI * 2 / 0.833) * 0.5 + 0.5;
  const effectiveBeat = beat > 0.02 ? beat : (autoBeat > 0.55 ? autoBeat : 0);

  if (blendFactor <= 0.8) {
    for (const r of ripplePool) {
      if (r.active) {
        r.active = false;
        r.points.visible = false;
        r.points.material.opacity = 0;
      }
    }
    return;
  }

  // Trigger new ripple on beat
  if (effectiveBeat > 0.45 && (now - lastRippleTime) > COOLDOWN) {
    for (const r of ripplePool) {
      if (!r.active) {
        r.active = true;
        r.age = 0;
        r.points.visible = true;
        lastRippleTime = now;
        break;
      }
    }
  }

  // Update each active ripple
  for (const r of ripplePool) {
    if (!r.active) continue;

    r.age += dt;

    if (r.age > LIFETIME) {
      r.active = false;
      r.points.visible = false;
      r.points.material.opacity = 0;
      continue;
    }

    let radius, opacity, thickness;
    if (r.age < 0.3) {
      const t = r.age / 0.3;
      radius = t * 15;
      opacity = 0.8;
      thickness = 0.8;
    } else if (r.age < 1.2) {
      const t = (r.age - 0.3) / 0.9;
      radius = 15 + t * 50;
      opacity = 0.8 - t * 0.5;
      thickness = 0.8 + t * 3.2;
    } else {
      const t = (r.age - 1.2) / 0.6;
      radius = 65;
      opacity = 0.3 * (1 - t);
      thickness = 4;
    }

    const pos = r.points.geometry.attributes.position.array;
    for (let i = 0; i < RIPPLE_PARTICLES; i++) {
      const angle = r.angles[i];
      const rOffset = r.offsets[i] * thickness * 0.5;
      const rr = radius + rOffset;
      pos[i * 3] = Math.cos(angle) * rr;
      pos[i * 3 + 1] = 3.5 + (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 2] = Math.sin(angle) * rr * 0.45;
    }

    r.points.geometry.attributes.position.needsUpdate = true;
    r.points.material.opacity = opacity;
    r.points.material.size = 0.5 + thickness * 0.15;
  }
}

// --- Nebula vortex (L1) ---
export function createNebulaVortex() {
  const count = 4000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const innerRadius = 80;
  const outerRadius = 220;
  const yScale = 0.15;

  const innerColor = new THREE.Color(0xe8a0b4); // rose gold
  const midColor = new THREE.Color(0xb892d8);   // amethyst
  const outerColor = new THREE.Color(0x7eb8da); // ice blue
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const t = Math.random();
    const radius = innerRadius + t * (outerRadius - innerRadius);

    pos[i * 3] = Math.cos(angle) * radius;
    pos[i * 3 + 1] = (Math.random() - 0.5) * yScale * radius * 2;
    pos[i * 3 + 2] = Math.sin(angle) * radius;

    if (t < 0.33) {
      color.lerpColors(innerColor, midColor, t / 0.33);
    } else if (t < 0.66) {
      color.lerpColors(midColor, outerColor, (t - 0.33) / 0.33);
    } else {
      color.lerpColors(outerColor, new THREE.Color(0xc8ddf0), (t - 0.66) / 0.34);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  nebulaVortex = new THREE.Points(geo, mat);
  scene.add(nebulaVortex);
}

export function updateNebulaVortex(time, beat, rotSpeed) {
  if (!nebulaVortex) return;
  nebulaVortex.rotation.y += rotSpeed * 0.5;
  const breathe = 1 + beat * 0.05;
  nebulaVortex.scale.setScalar(THREE.MathUtils.lerp(nebulaVortex.scale.x, breathe, 0.1));
}

// --- Update mesh logic per frame ---
export function updateMeshLogic(mesh, dataArray, bf, time) {
  const sinTime = time * 2;
  const len = dataArray.length;
  const yWobble = bf < 0.9 ? 0.008 * (1 - bf) : 0;
  const lerpRate = 0.06;
  for (let i = 0; i < len; i++) {
    const item = dataArray[i];
    _v.copy(item.scatterPos).lerp(item.treePos, bf);
    if (yWobble > 0.001) item.currentPos.y += Math.sin(sinTime + i * 0.1) * yWobble;
    item.currentPos.lerp(_v, lerpRate);
    item.rotation.x += item.rotSpeed.x;
    item.rotation.y += item.rotSpeed.y;
    dummy.position.copy(item.currentPos);
    dummy.rotation.copy(item.rotation);
    dummy.scale.setScalar(item.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

// --- Update sparkle logic (twinkling) ---
export function updateSparkleLogic(bf, time) {
  if (!sparkleSystem) return;
  const pos = sparkleSystem.geometry.attributes.position.array;
  const len = logicData.sparkle.length;
  for (let i = 0; i < len; i++) {
    const item = logicData.sparkle[i];
    _v.copy(item.scatterPos).lerp(item.treePos, bf);
    item.currentPos.lerp(_v, 0.05);
    const i3 = i * 3;
    const twinkle = 1 + Math.sin(time * item.speed + item.phase) * 0.3;
    pos[i3] = item.currentPos.x * twinkle;
    pos[i3 + 1] = item.currentPos.y * twinkle;
    pos[i3 + 2] = item.currentPos.z * twinkle;
  }
  sparkleSystem.geometry.attributes.position.needsUpdate = true;
  // Pulse opacity with blend factor
  sparkleSystem.material.opacity = 0.35 + bf * 0.5 + Math.sin(time * 2) * 0.1;
}

// --- Update dust logic per frame ---
export function updateDustLogic(bf, time) {
  const positions = dustSystem.geometry.attributes.position.array;
  const len = logicData.dust.length;
  const dustTime = time;
  const moveScale = bf * 0.2;
  const spreadScale = bf;
  for (let i = 0; i < len; i++) {
    const item = logicData.dust[i];
    if (bf > 0.1) {
      item.currentPos.y += item.velocity * moveScale;
      item.currentPos.x += Math.sin(dustTime + i * 0.1) * 0.025 * spreadScale;
      if (item.currentPos.y > 22) {
        const resetPos = getHeartPoint(Math.PI, (Math.random() - 0.5) * Math.PI, 0.2 + 0.8 * Math.random());
        item.currentPos.copy(resetPos);
        item.currentPos.y = -14;
      }
    }
    _v.copy(item.scatterPos).lerp(item.treePos, bf);
    item.currentPos.lerp(_v, 0.04);
    const i3 = i * 3;
    positions[i3] = item.currentPos.x;
    positions[i3 + 1] = item.currentPos.y;
    positions[i3 + 2] = item.currentPos.z;
  }
  dustSystem.geometry.attributes.position.needsUpdate = true;
}

// --- Update trail system ---
export function updateTrailSystem(blendFactor) {
  if (!trailSystem) return;
  if (blendFactor > 0.12) {
    const trailPos = trailSystem.positions;
    const trailData = logicData.roseGoldTrail;
    if (trailData && trailData.length > 0) {
      for (let i = 0; i < Math.min(logicData.roseGold.length, CONFIG.roseGoldCount); i++) {
        const currentPos = logicData.roseGold[i].currentPos;
        const trail = trailData[i];
        for (let j = trail.length - 1; j > 0; j--) trail[j].copy(trail[j - 1]);
        trail[0].copy(currentPos);
        for (let j = 0; j < trail.length; j++) {
          const idx = i * trail.length + j;
          trailPos[idx * 3] = trail[j].x;
          trailPos[idx * 3 + 1] = trail[j].y;
          trailPos[idx * 3 + 2] = trail[j].z;
        }
      }
      trailSystem.mesh.geometry.attributes.position.needsUpdate = true;
      trailSystem.mesh.visible = true;
    }
  } else if (trailSystem) {
    trailSystem.mesh.visible = false;
  }
}
