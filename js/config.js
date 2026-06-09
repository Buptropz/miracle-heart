// Miracle Heart — Configuration
// ============================================================

export const CONFIG = {
  // Particle counts
  roseGoldCount: 1200,
  champagneCount: 550,
  blushCount: 500,
  pearlCount: 400,
  sapphireCount: 500,
  amethystCount: 500,
  sparkleCount: 500,
  dustCount: 2000,

  // Camera
  camDistance: 105,

  // Bloom post-processing defaults
  bloomStrength: 1.0,
  bloomThreshold: 0.2,
  bloomRadius: 0.7,
  bloomRes: 0.65,

  // Rendering
  pixelCap: 1.3,
  baseSphereSegs: 7,

  // Hand tracking
  handFrameStep: 2,

  // Trail
  trailLength: 5,

  // Ring gallery
  ringPhotoSpacing: 210,
};

export const STATE = {
  PARTICLE: 'particle',
  ZOOM: 'zoom',
  WALL: 'wall',
  RING: 'ring',
};
