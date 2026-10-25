// World layout and engine settings. 1 world unit = one card (cap) height.
// The table top is the plane y = 0, the camera looks down -z toward the wall.

export const WORLD = {
  gravity: { x: 0, y: -9.81, z: 0 },
  physicsStep: 1 / 60, // fixed step in seconds, keeps runs reproducible
  maxStepsPerFrame: 5, // after a long stall, drop time instead of spiralling
  wallDistance: 10, // camera to wall, in card heights (brief 5.1: 8 to 12)
};

export const CAMERA = {
  fov: 40,
  position: { x: 0, y: 1.5, z: 0 },
  lookAt: { x: 0, y: 1.0, z: -WORLD.wallDistance },
  near: 0.05,
  far: 100,
};

export const PALETTE = {
  felt: 0x0f1a16,
  ivory: 0xefe6d2,
  oxblood: 0x6e1a1f,
  brickInk: 0x1d2a25,
  glow: 0xffb347,
};
