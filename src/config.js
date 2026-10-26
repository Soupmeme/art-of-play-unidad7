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
  backZ: -12.42, // just behind the wall's back face (glass 0.1 thick, clear of the wall): nothing can get behind it
  height: 8,
  // Side boundary: from (±nearX, frontZ) to (±farX, wall.z), then straight back.
  nearX: 4.3, // a little past the screen edge at the front, so the hand can reach the sides
  farX: 6.05, // meets the wall's edges (half width 6), so no gap to slip past
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
  dim: 0.1, // background cell brightness (dark enough that the marquee words and the cards read)
  flicker: 0.04, // share of background cells lit at any moment
  glow: 0.35, // emissive strength of lit cells
  laneScroll: 5, // side lanes, cells per second toward the wall
  laneCell: 0.11,
  // The marquee: words of the show, spelled only with the letters of ART OF
  // PLAY (rule 1), and never ART, OF or PLAY themselves (nor words holding
  // ART, like PARTY), so the backdrop teases the act without giving it away.
  words: ['TAROT', 'TRAP', 'FLOAT', 'PARLOR', 'PROP', 'PORTAL', 'RAPT', 'PARROT', 'LOFT', 'ROYAL', 'TOP'],
};

// The magic stage: a dark auditorium, a stage floor, the backdrop wall between
// curtains, bulbs and spotlights. Every shape is a letter of the phrase; the
// floor is a plain ground, and light is light.
export const STAGE = {
  curtain: {
    cap: 0.3, // letter size in the hanging strands
    strandGap: 0.15, // spacing between strands
    fold: 0.22, // depth of the folds
    foldWidth: 0.9, // width of one fold
    inner: 5.45, // the curtains start this far from the centre...
    outer: 8.4, // ...and reach this far
    z: -11.55, // just in front of the backdrop
    top: 7.2,
    valanceBottom: 5.35, // the swag across the top
  },
  bulbs: {
    cap: 0.17, // the marquee bulbs are small glowing Os
    step: 0.5,
    y: 0.12, // along the foot of the backdrop
  },
};

export const FAN = {
  center: { x: 0, y: 0.58, z: -4.85 },
  radius: 10, // arc radius of the hand; larger is flatter
  sag: 0.35, // how much the outer cards drop along the arc (1 = a true circle)
  overlap: 0.64, // fraction of the mean advance between neighbours
  wordGap: 0.45, // only used when the hand is in reading order (shuffle off)
  maxSpan: 6.8, // the hand never gets wider than this along its arc; more cards overlap more
  // A hand of rows.min cards or more is dealt in two rows, one above the
  // other: the back row higher and further away, shifted half a card so its
  // letters show between the front row's.
  rows: { min: 8, rise: 0.62, back: 0.3, stagger: 0.42, overlap: 0.86 },
  layerStep: 0.04, // later cards sit slightly in front, like a held hand
  breatheAmplitude: 0.012, // idle breathing, units
  breatheRotation: 0.006, // radians
  breathePeriod: 4.5, // seconds
};

export const HOLD = {
  planeZ: -4.5, // held letters ride on this plane, between the glass and the fan
  minY: 0.6,
  maxY: 4.8, // above the top of the screen at the hold plane, so a flick never meets a ceiling
  sideInset: 0.35,
  maxSpeed: 32, // "arrive" steering, units/s: fast enough to keep up with a flick
  slowRadius: 0.5,
  maxAccel: 900, // units/s^2
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
    knockSpeed: 9, // a Stick letter hitting a stuck one at least this fast knocks it loose
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
  requireAnchor: true, // words only form from a letter stuck in the backdrop (Kiwi, E8)
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
  // Warm hint, render only (the bodies never move for it): the letter's mesh
  // trembles and leans toward its partner on screen.
  tremble: 0.007, // units of jitter at full warmth
  leanOffset: 0.035, // units the mesh leans toward its partner at full warmth
  leanTilt: 0.06, // radians it tips toward its partner at full warmth
};

// Decoys (Kiwi's amendment, 2026-10-25): extra letter-cards shed by the wall.
// They obey their letter's family but never warm, pull or lock, and never
// stay: a stuck decoy melts back into the wall, a loose one erodes away.
// NON-PHYSICAL (4e): shedding, melting and eroding.
export const DECOYS = {
  count: 4, // most decoys at once, in the hand and shed; 0 turns the mechanic off (for playtest comparison)
  inHandMin: 1, // decoys shuffled into the hand at the start of a round
  inHandMax: 2,
  chars: 'ARTOFPLY',
  firstAfter: 5, // seconds of play (from the first hold) before the first shed
  intervalMin: 4, // seconds between sheds
  intervalMax: 8,
  lifetime: 35, // seconds a loose decoy lasts
  erodeTime: 6, // the last seconds of its life, eroding visibly
  meltTime: 1.2, // seconds for a stuck decoy to melt into the wall
  popSpeed: 2.4, // units/s out of the wall face, toward the camera
  popLift: 1.5, // units/s upward as it pops out
  // The graded tell: how broken up a decoy looks (0 to 1).
  tellBase: 0.15, // at rest: faint glitch lines
  tellHeld: 0.55, // while held
  // ... rising to 1 as it nears the slot it pretends to fill (impostor warmth).
};

// The opening of a round (Kiwi, 2026-10-25). NON-PHYSICAL (4d): staging.
// The picture fades in from black while the camera eases forward, and the
// dealer shuffles: the deck splits in two, riffles back together, and the
// cards are dealt into the hand in a random order, with one or two decoys.
export const OPENING = {
  fade: 1.2, // seconds from black
  dollyFrom: 1.6, // camera starts this far back, units
  dolly: 2.8, // seconds to ease into place
  deck: { x: 0, y: 1.0, z: -4.8 }, // where the deck sits before the deal
  split: 0.55, // seconds for the deck to split into two halves
  halfOffset: 1.4, // how far apart the halves sit
  riffleStep: 0.075, // seconds between cards dropping back onto the pile
  dealStep: 0.1, // seconds between cards dealt into the hand
  flight: 0.32, // seconds each card takes for a hop
  lift: 0.45, // how high a hop arcs
};

// Soft pressure (brief 5.6): the wall decays. NON-PHYSICAL (4c): the scheduler
// decides which bricks go and when; once released they fall under physics.
export const DECAY = {
  grace: 40, // seconds of play before scheduled decay starts
  rise: 1 / 150, // D gained per second after the grace period (0 to 1 in 150 s)
  lockDrop: 0.25, // a locked word lowers D by this...
  respite: 20, // ...and stops scheduled events for this many seconds
  intervalMax: 9, // seconds between events at D = 0
  intervalMin: 2.5, // ... and at D = 1
  clusterMax: 4, // bricks per event at D = 1 (1 at D = 0)
  telegraph: 0.6, // seconds a chosen brick shudders before it falls
  stressWeight: 3, // how much Ripple stress raises a brick's chance to be picked
  stressRelease: 1, // a brick stressed this much goes on its own, grace or not (about 3 Ripple hits)
  releasePush: 1.0, // units/s outward as a brick lets go, so it tips off the wall
  releaseFriction: 0.1, // a released brick is slick, so it slides off the brick below instead of resting on it
  collapseFraction: 0.6, // when this share of bricks has fallen, the round resets
};

export const RESET = {
  quietSeconds: 25, // no hold or throw for this long, once play has started: reset
  fadeOut: 0.9, // seconds to fade to black before the new round's opening
};

// Lighting cues (render/lighting.js): levels as fractions of the base rig.
export const STAGE_LIGHTS = {
  rate: 3, // per second: how quickly lights ease to a new level
  holdFollow: 1.8, // follow spot on a held card
  holdAngle: 0.13,
  finaleFollow: 3.2, // follow spot on the finished line
  finaleAngle: 0.3,
  finaleTarget: { x: 0, y: 2.2, z: -8 },
  finaleHouse: 0.3, // the house dims to 30%...
  finaleKey: 0.35, // ...the key to 35%...
  finaleWash: 0.3, // ...the backdrop washes to 30%...
  finaleFoot: 0.5, // ...the footlights to half
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
  house: 0x0a0708, // the dark auditorium around the stage
  floor: 0x241a15, // the stage boards, a plain dark ground
  ivory: 0xefe6d2,
  oxblood: 0x6e1a1f,
  wall: 0x151114, // the backdrop: near black, so the marquee type and the ivory cards read
  wallInk: 0xe9d6b0, // lit type cells on the backdrop and lanes
  lane: 0x2c1e17, // the low lanes at the stage's sides
  curtain: 0x7a1620, // deep red velvet, made of letters
  bulb: 0xffe3ad, // warm marquee bulbs
  glow: 0xffb347, // locked words: the one accent
};
