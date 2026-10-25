// World layout, engine settings and tunable parameters.
// 1 world unit = one card (cap) height. The table top is the plane y = 0 and
// the camera looks down -z toward the wall. Values marked "tune" are starting
// values; the dev panel (?dev) edits these same objects live.

export const WORLD = {
  gravity: { x: 0, y: -9.81, z: 0 },
  physicsStep: 1 / 60, // fixed step in seconds, keeps runs reproducible
  maxStepsPerFrame: 5, // after a long stall, drop time instead of spiralling
  seed: 1,
};

export const CAMERA = {
  fov: 50, // vertical, degrees, at 16:9 and wider
  minHorizontalHalfTan: 0.83, // narrower windows widen the vertical fov to keep this
  position: { x: 0, y: 1.5, z: 0 },
  lookAt: { x: 0, y: 1.0, z: -12 },
  near: 0.05,
  far: 100,
};

export const CARD = {
  capHeight: 1,
  thickness: 0.03,
  colliderCell: 0.08, // raster cell for the compound box collider
  density: 1,
  friction: 0.5, // tune
  restitution: 0.15, // tune: cards are floppy, they should not bounce like balls
  angularDamping: 0.4, // tune: how fast spin dies out
};

// Air drag on every letter, identical for all (honest physics, DECISIONS flag 3):
// acceleration = -coefficient * |v| * v.
export const AIR = { coefficient: 0.015 };

export const ROOM = {
  frontZ: -4.35, // invisible glass between the camera and the play area
  backZ: -14,
  height: 8,
  // Side boundary: from (±nearX, frontZ) to (±farX, wall.z), then straight back.
  nearX: 3.9, // wide enough that the fan's outer letters start inside the room
  farX: 6.4,
  railCapHeight: 0.24,
  tableFriction: 0.6,
  tableRestitution: 0.2,
};

export const WALL = {
  z: -12, // front face
  depth: 0.3,
  rows: 9,
  rowHeight: 0.55,
  capHeight: 0.46,
  width: 12, // rows are filled up to this width, then centred
  rowStartStep: 4, // each row starts 4 letters further into the phrase (stagger)
  friction: 0.6,
  restitution: 0.2,
};

export const FAN = {
  center: { x: 0, y: 0.95, z: -5.2 },
  radius: 10, // arc radius of the hand; larger is flatter
  overlap: 0.64, // fraction of the mean advance between neighbours
  wordGap: 0.45,
  layerStep: 0.04, // later cards sit slightly in front, like a held hand
  breatheAmplitude: 0.012, // idle breathing, units
  breatheRotation: 0.006, // radians
  breathePeriod: 4.5, // seconds
};

export const HOLD = {
  planeZ: -4.6, // held letters ride on this plane, between the glass and the fan
  minY: 0.6,
  maxY: 3.2,
  sideInset: 0.6,
  maxSpeed: 22, // "arrive" steering, units/s
  slowRadius: 0.5,
  maxAccel: 600, // units/s^2
  uprightGain: 14, // rad/s per rad of tilt
  uprightBlend: 25, // 1/s, how fast angular velocity follows the target
};

// 2D pointer motion to 3D throw (DECISIONS: "Throw mapping"). Pointer speeds are
// in screen heights per second, so they do not depend on window size.
export const THROW = {
  smoothingMs: 80,
  dropSpeed: 0.6, // below this, release is a drop
  fullSpeed: 2.6, // at or above this, full power
  minLaunch: 6, // units/s at the lowest throwing power
  maxLaunch: 15, // units/s at full power
  gravityComp: 1.1, // aims as if gravity were this much stronger, to offset drag
  spinGain: 4, // rad/s per screen-height/s of sideways pointer motion
  maxSpin: 18, // rad/s
  aimInset: 0.3, // keeps the aim point inside the wall
};

export const STATUS_RULES = {
  restSpeed: 0.15,
  restSpin: 0.6,
  restTime: 0.25, // seconds below both thresholds to count as resting
  wakeSpeed: 0.8, // a resting letter knocked faster than this is flying again
};

export const PALETTE = {
  felt: 0x0f1a16,
  ivory: 0xefe6d2,
  oxblood: 0x6e1a1f,
  brickInk: 0x33433b,
  glow: 0xffb347,
};
