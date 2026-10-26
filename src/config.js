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
  // High enough that letters lying on the table are seen from above, not edge-on,
  // and the far table appears above the fan on screen, not behind it.
  position: { x: 0, y: 3.2, z: 0 },
  lookAt: { x: 0, y: 0.6, z: -12 },
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
  frontZ: -4.3, // invisible glass between the camera and the play area
  backZ: -14,
  height: 8,
  // Side boundary: from (±nearX, frontZ) to (±farX, wall.z), then straight back.
  nearX: 3.9, // wide enough that the fan's outer letters start inside the room
  farX: 6.4,
  laneHeight: 0.22, // the low side lanes drawn along the side glass
  laneWidth: 0.12,
  tableFriction: 0.6,
  tableRestitution: 0.2,
};

// The wall is one solid slab on screen, backed by a grid of invisible brick
// colliders (so the decay scheduler can later release them one by one).
export const WALL = {
  z: -12, // front face
  depth: 0.3,
  cols: 20,
  rows: 9,
  brickWidth: 0.6,
  brickHeight: 0.55,
  friction: 0.6,
  restitution: 0.2,
};

// The type animation on the wall and side lanes: a grid of character cells,
// each showing a letter of the phrase. On the wall, a large ART OF PLAY made
// of those cells scrolls sideways in whole-cell steps, with rows that glitch
// out of line now and then.
export const ASCII = {
  cellsPerBrick: { x: 5, y: 4 }, // wall cells: 100 x 36, aligned with the bricks
  scroll: 7, // cells per second
  jag: 4, // largest row glitch, in cells
  jagRate: 1.6, // glitch changes per second
  jagShare: 0.3, // share of rows out of line at any moment
  bannerHeight: 0.62, // big letters, as a share of the wall height
  bannerCenter: 0.6, // raised a little so the fan does not hide the banner
  dim: 0.13, // background cell brightness
  flicker: 0.04, // share of background cells lit at any moment
  glow: 0.35, // emissive strength of lit cells
  laneScroll: 5, // side lanes, cells per second toward the wall
  laneCell: 0.11,
};

export const FAN = {
  center: { x: 0, y: 0.58, z: -4.85 },
  radius: 10, // arc radius of the hand; larger is flatter
  sag: 0.35, // how much the outer cards drop along the arc (1 = a true circle)
  overlap: 0.64, // fraction of the mean advance between neighbours
  wordGap: 0.45,
  layerStep: 0.04, // later cards sit slightly in front, like a held hand
  breatheAmplitude: 0.012, // idle breathing, units
  breatheRotation: 0.006, // radians
  breathePeriod: 4.5, // seconds
};

export const HOLD = {
  planeZ: -4.5, // held letters ride on this plane, between the glass and the fan
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
  spinGain: 2, // rad/s per screen-height/s of sideways pointer motion
  maxSpin: 9, // rad/s
  aimInset: 0.3, // keeps the aim point inside the wall
};

// Letter effect rules (brief 5.4). NON-PHYSICAL (4a), layered on real physics.
export const EFFECTS = {
  stick: {
    minSpeed: 11, // units/s at impact; slower letters bounce off like any card
    approachCone: 40, // degrees between the flight direction and straight into the wall
    faceCone: 50, // degrees between the letter's face and the wall face
    bite: 0.012, // how far the embedded letter sinks into the wall face
  },
  curve: {
    gain: 0.12, // sideways acceleration per (rad/s of spin x units/s of speed)
    biasSpin: -5, // rad/s every Curve throw starts with (clockwise: hooks right)
  },
  ripple: {
    restitution: 0.5, // bounce of O and Y (other letters: CARD.restitution)
    minSpeed: 3, // units/s at impact to send a ripple
    radius: 2.5, // reach of the ripple, units
    strength: 2.0, // velocity change at 1 unit, falls off as 1/d
    minDistance: 0.4, // caps the kick for letters very close to the impact
    lift: 0.5, // upward share of the kick
    cooldown: 0.25, // seconds between ripples from the same letter
    wallShake: true, // Ripple hits on the wall stress nearby bricks (used by decay, M4)
    shakeRadius: 1.0,
    shakeAmount: 0.35,
  },
};

// Word resolution (brief 5.5). The word function is pure (src/words/resolve.js);
// the pull is NON-PHYSICAL (4b). Distances in card heights.
export const WORD_RULES = {
  hintRadius: 2.5, // correct neighbours closer than this tremble (warm)
  pullRadius: 1.5, // ... closer than this are drawn into their slots
  depthTolerance: 1.0, // pull only when the pair is roughly at the same depth
  snapDistance: 0.12, // every member within this of its slot (and aligned) locks the word
  alignAngle: 15, // degrees: how upright and camera-facing a member must be to lock
  tracking: 0.08, // extra space between letters in a word, so cards do not overlap
  wallGap: 0.02, // free members of an anchored word hover this far in front of the wall
  tableBaseline: 0.02, // baseline of a word with no anchor: it stands on the table
  // Pull: a damped spring toward the slot, plus a lift that cancels gravity.
  pullStiffness: 40, // 1/s^2
  pullDamping: 0.9, // damping ratio (1 = critically damped)
  pullMaxAccel: 80, // units/s^2
  pullUprightGain: 6,
  pullUprightBlend: 8,
  // Warm hint on free letters: a rattle plus a lean toward the partner.
  trembleKick: 3.0, // rad/s per step at full warmth (averages out to a small wobble)
  trembleFrequency: 9, // Hz
  leanAccel: 1.2, // units/s^2 toward the partner at full warmth
  stuckTremble: 0.006, // units: render-only tremble of a stuck letter at full warmth
};

export const FINALE = {
  center: { x: 0, y: 1.7, z: -8 }, // baseline centre of the ART OF PLAY line
  wordGap: 0.7, // space between words, card heights
  duration: 1.6, // seconds to glide into the line
  hold: 4, // seconds the line is held lit (the reset is M4's quiet rule)
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
  wall: 0x6b1a20, // solid oxblood slab, set off from the green felt
  wallInk: 0xf2c9a7, // lit type cells on the wall and lanes
  glow: 0xffb347,
};
