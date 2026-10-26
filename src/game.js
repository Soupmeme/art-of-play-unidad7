// The game state: letter-cards (the nine letters plus any decoys), wall and
// room, and what happens each physics step. Rendering and input live
// elsewhere; this module only touches bodies and data.

import { STATUS, HOLDABLE, WORDS, createLetters, wordStarts } from './letters/letters.js';
import { FAMILY } from './letters/families.js';
import { letterForm, wordLayout } from './letters/glyphs.js';
import { fanLayout } from './letters/fan.js';
import { stickCheck, embedPose, curveAcceleration, rippleKicks, rippleShake } from './letters/effects.js';
import { createDecoyState, createShedder, decoyTell, decoyErosion } from './letters/decoys.js';
import { resolveWords, letterSnapshot, impostorWarmth } from './words/resolve.js';
import { finaleLayout, finalePose } from './staging/finale.js';
import { shuffleHand, openingTracks, trackPose, openingCurtain } from './staging/opening.js';
import { layoutWall, createBrickBodies } from './wall/wall.js';
import { createDecayScheduler } from './wall/decay.js';
import { createRoom } from './physics/room.js';
import { applyAirDrag, steerArrive, steerUpright } from './physics/forces.js';
import { createRng, deriveSeed } from './core/rng.js';
import { CARD, AIR, ROOM, WALL, FAN, HOLD, EFFECTS, WORD_RULES, DECOYS, OPENING, DECAY, RESET, FINALE, STATUS_RULES, WORLD } from './config.js';

// Collision groups, Rapier's packed form: (membership << 16) | filter.
// NON-PHYSICAL (4d): letters resting in the fan only touch the room, so a
// thrown or held letter passes over the hand instead of crashing into it.
const GROUP = { world: 0b001, letter: 0b010, fan: 0b100 };
const IN_PLAY = (GROUP.letter << 16) | (GROUP.world | GROUP.letter);
const IN_FAN = (GROUP.fan << 16) | GROUP.world;

function setGroups(body, groups) {
  for (let i = 0; i < body.numColliders(); i++) body.collider(i).setCollisionGroups(groups);
}

const quatZ = (angle) => ({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ZERO = { x: 0, y: 0, z: 0 };
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const IMPACT_HISTORY = 16;
const MAX_DECOYS = 5; // ids 9 to 13 are reserved for decoys

// round: what a new round does. The defaults are the real game; tests turn
// parts off to get a known starting hand (reading order, no decoys, no opening).
//   shuffle:    the hand is dealt in a random order with no hint pair side by side
//   handDecoys: one or two decoys are shuffled into the hand
//   opening:    the dealer's shuffle, fade-in and camera push play first
export function createGame(physics, { seed = WORLD.seed, round: roundOptions = {} } = {}) {
  const roundRules = { shuffle: true, handDecoys: true, opening: true, ...roundOptions };
  const { rapier, world } = physics;

  const letters = createLetters();
  const decoys = [];
  const freeDecoyIds = Array.from({ length: MAX_DECOYS }, (_, i) => letters.length + i);
  const cardById = new Map(letters.map((l) => [l.id, l]));
  const cards = () => (decoys.length ? letters.concat(decoys) : letters);

  // Per-card data, indexed by card id (decoy slots are filled while alive).
  const formOf = (char) =>
    letterForm(char, { capHeight: CARD.capHeight, depth: CARD.thickness, colliderCell: CARD.colliderCell });
  const forms = letters.map((l) => formOf(l.char));
  const bodies = [];
  const colliderHandles = [];
  const preVelocity = []; // velocity before this step: the impact velocity
  const lastRipple = [];

  // The hand: card ids in fan order, and the fan pose of each slot.
  let handOrder = [];
  let fan = [];
  const slotOf = new Map();
  function layoutHand(order) {
    handOrder = order;
    const inReadingOrder = order.every((id, i) => id === i) && order.length === letters.length;
    fan = fanLayout({
      advances: order.map((id) => forms[id].advance),
      wordStarts: inReadingOrder ? wordStarts() : [],
      center: FAN.center,
      radius: FAN.radius,
      overlap: FAN.overlap,
      wordGap: FAN.wordGap,
      layerStep: FAN.layerStep,
      sag: FAN.sag,
      maxSpan: FAN.maxSpan,
    });
    slotOf.clear();
    order.forEach((id, slot) => slotOf.set(id, slot));
  }
  const fanPose = (id) => fan[slotOf.get(id)];

  const bricks = layoutWall(WALL);
  const brickBodies = createBrickBodies(physics, bricks, WALL);
  const wall = {
    z: WALL.z,
    top: WALL.rows * WALL.brickHeight,
    halfWidth: (WALL.cols * WALL.brickWidth) / 2,
  };
  const room = createRoom(physics, ROOM, WALL.z);

  // Which collider belongs to which brick or card, to read contact events.
  const brickOfCollider = new Map();
  brickBodies.forEach((body, index) => brickOfCollider.set(body.collider(0).handle, index));
  const cardOfCollider = new Map();

  // Idle breathing of the fan. NON-PHYSICAL (4d): the fan is a kinematic rack
  // that holds the letters at rest; it is part of the staging, not of play.
  const swayRng = createRng(deriveSeed(seed, 'sway'));
  const phases = Array.from({ length: letters.length + MAX_DECOYS }, () => swayRng.range(0, Math.PI * 2));

  function createCardBody(card, desc) {
    const body = world.createRigidBody(desc.setAngularDamping(CARD.angularDamping).setCcdEnabled(true));
    const ripple = card.family === FAMILY.ripple;
    colliderHandles[card.id] = forms[card.id].boxes.map((b) => {
      const c = rapier.ColliderDesc.cuboid(b.halfWidth, b.halfHeight, CARD.thickness / 2)
        .setTranslation(b.x, b.y, 0)
        .setDensity(CARD.density)
        .setFriction(CARD.friction)
        .setRestitution(ripple ? EFFECTS.ripple.restitution : CARD.restitution)
        .setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
      // Ripple letters keep their own bounce whatever they hit (4a).
      if (ripple) c.setRestitutionCombineRule(rapier.CoefficientCombineRule.Max);
      const handle = world.createCollider(c, body).handle;
      cardOfCollider.set(handle, card.id);
      return handle;
    });
    bodies[card.id] = body;
    preVelocity[card.id] = { ...ZERO };
    lastRipple[card.id] = -Infinity;
    return body;
  }

  for (const letter of letters) {
    const body = createCardBody(letter, rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(OPENING.deck.x, OPENING.deck.y, OPENING.deck.z));
    setGroups(body, IN_FAN);
  }

  let time = 0;
  let playStart = null; // time of the first hold: the play clock starts there
  let held = null;
  let holdTarget = null;
  let lastPlan = null;
  let lastContact = null;
  const brickStress = new Float32Array(bricks.length); // Ripple stress, read by the decay scheduler
  const standing = bricks.map(() => true); // false once a brick has been released
  const shudderStart = bricks.map(() => null); // time a chosen brick began its telegraph
  let fallen = 0;
  let decay = createDecayScheduler(deriveSeed(seed, 'decay'), DECAY, bricks);
  let lastInput = 0; // time of the last hold or throw
  let resetting = null; // { start, reason } while fading out before a new round
  const impacts = []; // recent wall impacts, for the renderer: { kind, x, y, time, seq }
  let roundIndex = 0;
  let roundSeed = seed;
  let shedder = createShedder(seed, DECOYS, wall);
  let opening = null; // { start, tracks, duration } while the dealer shuffles

  // Words: typeset layout per word, the latest resolution, locks and finale.
  const layout = Object.fromEntries(WORDS.map((w) => [w.text, wordLayout(w.text, WORD_RULES.tracking)]));
  const finaleTargets = finaleLayout(layout, FINALE);
  const leaders = {};
  const lockedWords = [];
  let resolution = resolveWords(snapshots(), { params: WORD_RULES, layout });
  let finale = null; // { start, from: [pose per letter], to: [pose per letter] }

  function snapshots() {
    return letters.map((l) => letterSnapshot(l, bodies[l.id].translation(), bodies[l.id].rotation()));
  }

  startRound();

  // Side boundary x at a given depth (the rails converge toward the camera).
  function sideLimitAt(z) {
    const t = clamp((z - ROOM.frontZ) / (WALL.z - ROOM.frontZ), 0, 1);
    return lerp(ROOM.nearX, ROOM.farX, t);
  }

  function hold(card) {
    if (!HOLDABLE.has(card.status) || held || opening || resetting) return false;
    const body = bodies[card.id];
    body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    body.setGravityScale(0, true); // the hand carries the weight while held
    setGroups(body, IN_PLAY);
    card.status = STATUS.held;
    held = card;
    holdTarget = body.translation();
    playStart ??= time;
    lastInput = time;
    return true;
  }

  function setHoldTarget(point) {
    const limit = sideLimitAt(HOLD.planeZ) - HOLD.sideInset;
    holdTarget = {
      x: clamp(point.x, -limit, limit),
      y: clamp(point.y, HOLD.minY, HOLD.maxY),
      z: HOLD.planeZ,
    };
  }

  // plan comes from planThrow: a drop keeps the card's current motion,
  // a throw sets its launch velocity and spin. Flight is then pure physics,
  // plus the letter's own effect.
  function release(plan) {
    if (!held) return;
    const body = bodies[held.id];
    body.setGravityScale(1, true);
    if (plan.kind === 'throw') {
      // NON-PHYSICAL (4a), Curve: a lopsided letter leaves the hand already spinning.
      const bias = held.family === FAMILY.curve ? EFFECTS.curve.biasSpin : 0;
      body.setLinvel(plan.linvel, true);
      body.setAngvel({ x: plan.angvel.x, y: plan.angvel.y, z: plan.angvel.z + bias }, true);
    }
    held.status = STATUS.flying;
    held.restTime = 0;
    held.airborne = true;
    lastPlan = { ...plan, letter: held.char, decoy: !!held.decoy, from: body.translation() };
    held = null;
    lastInput = time;
  }

  function unstick(card) {
    card.stuckTo = null;
  }

  function placeInFan(letter) {
    unstick(letter);
    const body = bodies[letter.id];
    const pose = fanPose(letter.id);
    body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    body.setGravityScale(1, true);
    body.setLinvel(ZERO, true);
    body.setAngvel(ZERO, true);
    body.setTranslation({ x: pose.x, y: pose.y, z: pose.z }, true);
    body.setRotation(quatZ(pose.angle), true);
    setGroups(body, IN_FAN);
    letter.status = STATUS.inFan;
    letter.restTime = 0;
    letter.airborne = false;
    letter.lockedWord = null;
  }

  // A decoy dealt into the hand at the start of a round (Kiwi's amendment).
  function addHandDecoy(char) {
    const id = freeDecoyIds.shift();
    if (id === undefined) return null;
    const decoy = createDecoyState(id, char);
    decoy.status = STATUS.inFan;
    forms[id] = formOf(char);
    const body = createCardBody(decoy, rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(OPENING.deck.x, OPENING.deck.y, OPENING.deck.z));
    setGroups(body, IN_FAN);
    decoys.push(decoy);
    cardById.set(id, decoy);
    return decoy;
  }

  // A new round: every letter back in the deck, decoys gone, no words locked,
  // play clock stopped; then a fresh hand is shuffled (with one or two decoys)
  // and, with the opening on, the dealer's shuffle plays it in. Used at the
  // start, by the dev panel, and by M4's resets.
  // NON-PHYSICAL (4c): a chosen brick lets go after its telegraph. From here
  // it is an ordinary dynamic body: it tips off the wall and falls. Cards
  // stuck to it come away with it.
  function releaseBrick(i) {
    const body = brickBodies[i];
    body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    // Slick on release (the lower friction of the pair wins), so it slides off
    // the brick below instead of resting on its ledge.
    body.collider(0).setFriction(DECAY.releaseFriction);
    body.collider(0).setFrictionCombineRule(rapier.CoefficientCombineRule.Min);
    body.setLinvel({ x: 0, y: 0, z: DECAY.releasePush }, true);
    standing[i] = false;
    shudderStart[i] = null;
    brickStress[i] = 0;
    fallen++;
    for (const card of cards()) {
      if (card.status !== STATUS.stuck || card.stuckTo !== i) continue;
      const cb = bodies[card.id];
      cb.setBodyType(rapier.RigidBodyType.Dynamic, true);
      cb.setGravityScale(1, true);
      cb.setLinvel({ x: 0, y: 0, z: DECAY.releasePush }, true);
      unstick(card);
      card.status = STATUS.flying;
      card.restTime = 0;
    }
    recordImpact('release', bricks[i]);
  }

  // Every brick back in its place, fixed; no stress, D back to 0, new seed.
  function rebuildWall() {
    bricks.forEach((b, i) => {
      const body = brickBodies[i];
      body.setBodyType(rapier.RigidBodyType.Fixed, true);
      body.collider(0).setFriction(WALL.friction);
      body.collider(0).setFrictionCombineRule(rapier.CoefficientCombineRule.Average);
      body.setTranslation({ x: b.x, y: b.y, z: b.z }, true);
      body.setRotation(IDENTITY, true);
      body.setLinvel(ZERO, true);
      body.setAngvel(ZERO, true);
      standing[i] = true;
      shudderStart[i] = null;
      brickStress[i] = 0;
    });
    fallen = 0;
  }

  // Bricks behind a locked word never fall (a locked word is safe).
  function immuneBricks() {
    const immune = new Set();
    for (const letter of letters) {
      if (letter.status !== STATUS.locked) continue;
      const p = bodies[letter.id].translation();
      if (p.z < WALL.z - 0.2 || p.z > WALL.z + 1) continue;
      bricks.forEach((b, i) => {
        if (Math.abs(b.x - p.x) < b.w / 2 + 0.6 && Math.abs(b.y - p.y) < b.h / 2 + 0.55) immune.add(i);
      });
    }
    return immune;
  }

  // NON-PHYSICAL (4d): the reset. Fade to black, rebuild the wall, then a new
  // round (whose opening fades back in). Never starts while a card is held,
  // during an opening, or while already resetting.
  function beginReset(reason) {
    if (resetting || opening || held) return;
    resetting = { start: time, reason };
  }

  function startRound() {
    if (held) release({ kind: 'drop' });
    [...decoys].forEach(removeDecoy);
    lockedWords.length = 0;
    finale = null;
    playStart = null;
    resetting = null;
    roundSeed = deriveSeed(seed, `round ${roundIndex++}`);
    decay = createDecayScheduler(deriveSeed(roundSeed, 'decay'), DECAY, bricks);
    shedder = createShedder(roundSeed, DECOYS, wall);
    const rng = createRng(deriveSeed(roundSeed, 'hand'));

    const capacity = Math.max(0, Math.min(DECOYS.count, MAX_DECOYS));
    const handDecoys = roundRules.handDecoys ? Math.min(capacity, rng.int(DECOYS.inHandMin, DECOYS.inHandMax + 1)) : 0;
    for (let i = 0; i < handDecoys; i++) addHandDecoy(rng.pick([...DECOYS.chars]));

    const hand = cards();
    layoutHand(roundRules.shuffle ? shuffleHand(hand, deriveSeed(roundSeed, 'shuffle')) : hand.map((c) => c.id));
    hand.forEach(placeInFan);

    if (roundRules.opening) {
      const deckOrder = hand.map((c) => c.id); // the deck starts in reading order, decoys on top
      const { tracks, duration } = openingTracks({ deckOrder, handOrder, fan, params: OPENING });
      opening = { start: time, tracks, duration };
      for (const card of hand) {
        const pose = trackPose(tracks.get(card.id), 0, OPENING.lift);
        bodies[card.id].setTranslation(pose.position, true);
        bodies[card.id].setRotation(pose.rotation, true);
      }
    } else {
      opening = null;
    }
  }

  // Test and dev helper only (never used in play): puts a card at a pose as a
  // free body at rest, to set up scenarios.
  function debugPlace(card, position, rotation = IDENTITY) {
    unstick(card);
    const body = bodies[card.id];
    body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    body.setGravityScale(1, true);
    setGroups(body, IN_PLAY);
    body.setTranslation(position, true);
    body.setRotation(rotation, true);
    body.setLinvel(ZERO, true);
    body.setAngvel(ZERO, true);
    card.status = STATUS.onTable;
    card.airborne = false;
  }

  let impactSeq = 0;
  function recordImpact(kind, position) {
    impacts.push({ kind, x: position.x, y: position.y, time, seq: ++impactSeq });
    if (impacts.length > IMPACT_HISTORY) impacts.shift();
  }

  // NON-PHYSICAL (4e): the wall pops a decoy out of its face; it then falls
  // under ordinary physics.
  function shedDecoy(spec) {
    const id = freeDecoyIds.shift();
    if (id === undefined) return null;
    const decoy = createDecoyState(id, spec.char);
    forms[id] = formOf(spec.char);
    const z = WALL.z + CARD.thickness;
    const body = createCardBody(decoy, rapier.RigidBodyDesc.dynamic().setTranslation(spec.x, spec.y, z));
    setGroups(body, IN_PLAY);
    body.setLinvel({ x: 0, y: DECOYS.popLift, z: DECOYS.popSpeed }, true);
    body.setAngvel({ x: 0, y: 0, z: spec.spin }, true);
    decoys.push(decoy);
    cardById.set(id, decoy);
    recordImpact('shed', { x: spec.x, y: spec.y });
    return decoy;
  }

  // NON-PHYSICAL (4e): a melted or eroded decoy leaves the world.
  function removeDecoy(decoy) {
    if (held === decoy) held = null;
    unstick(decoy);
    for (const handle of colliderHandles[decoy.id]) cardOfCollider.delete(handle);
    world.removeRigidBody(bodies[decoy.id]);
    bodies[decoy.id] = null;
    forms[decoy.id] = null;
    decoys.splice(decoys.indexOf(decoy), 1);
    cardById.delete(decoy.id);
    freeDecoyIds.push(decoy.id);
    freeDecoyIds.sort((a, b) => a - b);
  }

  // NON-PHYSICAL (4a), Stick: the card is pressed flat into the wall face and
  // frozen there (kinematic), remembering the brick it bit into. Frozen, not
  // jointed: a joint is solved softly, and hits from other letters could shove
  // a stuck letter through its own brick until it sat behind the wall face,
  // out of reach. A frozen card cannot be pushed. (When bricks fall, M4,
  // cards stuck to them are released.)
  function embed(card, brickIndex) {
    const body = bodies[card.id];
    const pose = embedPose(body.translation(), body.rotation(), WALL.z, CARD.thickness, EFFECTS.stick.bite);
    body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    body.setTranslation(pose.position, true);
    body.setRotation(pose.rotation, true);
    body.setLinvel(ZERO, true);
    body.setAngvel(ZERO, true);
    card.status = STATUS.stuck;
    card.stuckTo = brickIndex;
    card.airborne = false;
  }

  // NON-PHYSICAL (4a), Stick: a sharp letter hitting a stuck card hard enough
  // pries it loose. It drops away from the wall, carrying a share of the hit.
  function knockOut(card, hitVelocity) {
    const body = bodies[card.id];
    body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    body.setGravityScale(1, true);
    body.setLinvel({ x: hitVelocity.x * 0.3, y: hitVelocity.y * 0.3 - 0.5, z: 1.2 }, true);
    body.setAngvel({ x: 1.5, y: 0, z: -hitVelocity.x * 0.4 }, true);
    unstick(card);
    card.status = STATUS.flying;
    card.restTime = 0;
    recordImpact('knock', body.translation());
  }

  // NON-PHYSICAL (4a), Ripple: kicks nearby free cards and stresses nearby bricks.
  function ripple(card, other) {
    const impact = bodies[card.id].translation();
    const others = cards()
      .filter((c) => c !== card && (c.status === STATUS.flying || c.status === STATUS.onTable))
      .map((c) => ({ id: c.id, position: bodies[c.id].translation() }));
    for (const kick of rippleKicks(impact, others, EFFECTS.ripple)) {
      const body = bodies[kick.id];
      const m = body.mass();
      body.applyImpulse({ x: kick.deltaV.x * m, y: kick.deltaV.y * m, z: kick.deltaV.z * m }, true);
    }
    if (other.type === 'brick' && EFFECTS.ripple.wallShake) {
      for (const s of rippleShake(impact, bricks, EFFECTS.ripple)) brickStress[s.index] += s.stress;
    }
    lastRipple[card.id] = time;
  }

  // The first contact a flying card makes in a step decides its effect.
  function onContact(card, other) {
    if (card.status !== STATUS.flying) return;
    card.airborne = false;
    const body = bodies[card.id];
    const v = preVelocity[card.id];
    const speed = Math.hypot(v.x, v.y, v.z);
    let kind = 'bounce';

    const target = other.type === 'card' ? cardById.get(other.id) : null;
    if (card.family === FAMILY.stick && target?.status === STATUS.stuck && speed >= EFFECTS.stick.knockSpeed) {
      knockOut(target, v);
      lastContact = { letter: card.char, decoy: !!card.decoy, speed, knocked: target.char };
    } else if (card.family === FAMILY.stick && other.type === 'brick' && standing[other.index]) {
      const check = stickCheck(v, body.rotation(), EFFECTS.stick);
      // Lockout mitigation (a): a letter being pulled by a correct neighbour
      // does not embed; the pull wins.
      const pulled = !card.decoy && resolution.letters[card.id].pulled;
      lastContact = { letter: card.char, decoy: !!card.decoy, ...check, pulled };
      if (check.stick && !pulled) {
        embed(card, other.index);
        kind = 'stick';
      }
    } else if (
      card.family === FAMILY.ripple &&
      speed >= EFFECTS.ripple.minSpeed &&
      time - lastRipple[card.id] >= EFFECTS.ripple.cooldown
    ) {
      ripple(card, other);
      kind = 'ripple';
      lastContact = { letter: card.char, decoy: !!card.decoy, speed, ripple: true };
    } else {
      lastContact = { letter: card.char, decoy: !!card.decoy, speed };
    }
    if (other.type === 'brick') recordImpact(kind, body.translation());
  }

  function classify(handle) {
    if (brickOfCollider.has(handle)) return { type: 'brick', index: brickOfCollider.get(handle) };
    if (cardOfCollider.has(handle)) return { type: 'card', id: cardOfCollider.get(handle) };
    return { type: 'room' };
  }

  // NON-PHYSICAL (4b), the word pull: a damped spring toward the slot, plus a
  // lift that cancels gravity, plus a gentle turn to stand upright facing the
  // camera. Deliberately stronger than gravity near correct neighbours.
  function applyPull(body, target, dt) {
    const p = body.translation();
    const v = body.linvel();
    const k = WORD_RULES.pullStiffness;
    const c = 2 * Math.sqrt(k) * WORD_RULES.pullDamping;
    let a = { x: k * (target.x - p.x) - c * v.x, y: k * (target.y - p.y) - c * v.y, z: k * (target.z - p.z) - c * v.z };
    const mag = Math.hypot(a.x, a.y, a.z);
    if (mag > WORD_RULES.pullMaxAccel) {
      const s = WORD_RULES.pullMaxAccel / mag;
      a = { x: a.x * s, y: a.y * s, z: a.z * s };
    }
    a.y -= WORLD.gravity.y; // cancel gravity
    const m = body.mass() * dt;
    body.applyImpulse({ x: a.x * m, y: a.y * m, z: a.z * m }, true);
    steerUpright(body, { uprightGain: WORD_RULES.pullUprightGain, uprightBlend: WORD_RULES.pullUprightBlend }, dt);
  }

  // NON-PHYSICAL (4b), the warm hint on a free letter: a small rattle whose
  // size grows with warmth, and a lean (a weak push) toward its partners.
  function applyWarm(letter, body, warmth, dt) {
    const kick = WORD_RULES.trembleKick * warmth * Math.sin(2 * Math.PI * WORD_RULES.trembleFrequency * time + phases[letter.id] * 5);
    const w = body.angvel();
    body.setAngvel({ x: w.x + kick, y: w.y, z: w.z + kick * 0.5 }, true);
    const p = body.translation();
    let lean = { x: 0, z: 0 };
    for (const word of Object.values(resolution.words)) {
      for (const pair of word.pairs) {
        if (pair.warmth <= 0 || (pair.a !== letter.id && pair.b !== letter.id)) continue;
        const q = bodies[pair.a === letter.id ? pair.b : pair.a].translation();
        const d = Math.hypot(q.x - p.x, q.z - p.z) || 1;
        lean = { x: lean.x + ((q.x - p.x) / d) * pair.warmth, z: lean.z + ((q.z - p.z) / d) * pair.warmth };
      }
    }
    const m = body.mass() * dt * WORD_RULES.leanAccel;
    body.applyImpulse({ x: lean.x * m, y: 0, z: lean.z * m }, true);
  }

  // A word that is ready locks: every member, the anchor included, is set
  // exactly in its slot, upright, and frozen there (kinematic), immune from
  // then on to holding, ripples and decay. Straightening the anchor matters:
  // a Stick letter keeps the spin it arrived with, sometimes upside down.
  function lockWord(text, word) {
    word.members.forEach((id, i) => {
      const letter = letters[id];
      const body = bodies[id];
      unstick(letter);
      body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
      body.setLinvel(ZERO, true);
      body.setAngvel(ZERO, true);
      body.setTranslation(word.slots[i], true);
      body.setRotation(IDENTITY, true);
      letter.status = STATUS.locked;
      letter.lockedWord = text;
      letter.airborne = false;
    });
    lockedWords.push({ word: text, time });
    decay.onLock(time - playStart);
    if (lockedWords.length === WORDS.length) startFinale();
  }

  function startFinale() {
    if (held?.decoy) release({ kind: 'drop' });
    const to = [];
    for (const { text } of WORDS) {
      resolution.words[text].members.forEach((id, i) => {
        to[id] = { position: finaleTargets[text][i], rotation: IDENTITY };
      });
    }
    finale = {
      start: time,
      from: letters.map((l) => ({ position: bodies[l.id].translation(), rotation: bodies[l.id].rotation() })),
      to,
    };
  }

  // Decoys: shed when due, then their tell, ageing, melting and removal.
  function updateDecoys(dt) {
    if (playStart !== null && !finale && !resetting) {
      const spec = shedder.due(time - playStart, decoys.length < Math.min(DECOYS.count, MAX_DECOYS));
      if (spec) shedDecoy(spec);
    }
    const letterSnaps = decoys.length ? snapshots() : null;
    for (const decoy of [...decoys]) {
      const body = bodies[decoy.id];
      if (decoy.status !== STATUS.held && decoy.status !== STATUS.inFan) decoy.age += dt; // a decoy only ages in play
      if (decoy.status === STATUS.stuck && decoy.meltAge === null) decoy.meltAge = 0;
      if (decoy.meltAge !== null) decoy.meltAge += dt;
      const warmth = impostorWarmth(letterSnapshot(decoy, body.translation(), body.rotation()), letterSnaps, {
        params: WORD_RULES,
        layout,
      });
      decoy.tell = decoyTell({ held: decoy.status === STATUS.held, impostorWarmth: warmth }, DECOYS);
      decoy.erosion = decoyErosion(decoy, DECOYS);
      if (decoy.erosion >= 1 && decoy.status !== STATUS.held) {
        if (decoy.meltAge !== null) recordImpact('melt', body.translation());
        removeDecoy(decoy);
      }
    }
  }

  function beforeStep(dt) {
    time += dt;
    if (opening && time - opening.start >= opening.duration) opening = null;
    if (finale) {
      for (const letter of letters) {
        const pose = finalePose(finale.from[letter.id], finale.to[letter.id], time - finale.start, FINALE.duration);
        bodies[letter.id].setNextKinematicTranslation(pose.position);
        bodies[letter.id].setNextKinematicRotation(pose.rotation);
      }
    } else {
      resolution = resolveWords(snapshots(), { params: WORD_RULES, layout, previousLeaders: leaders });
      for (const [text, word] of Object.entries(resolution.words)) leaders[text] = word.leader;
      for (const letter of letters) {
        if (letter.status !== STATUS.flying && letter.status !== STATUS.onTable) continue;
        const info = resolution.letters[letter.id];
        if (info.pulled) {
          letter.airborne = false; // the pull takes over from the Curve
          applyPull(bodies[letter.id], info.target, dt);
        } else if (info.warmth > 0) {
          applyWarm(letter, bodies[letter.id], info.warmth, dt);
        }
      }
    }
    updateDecoys(dt);

    for (const card of cards()) {
      const body = bodies[card.id];
      if (card.status === STATUS.inFan) {
        if (finale) continue;
        if (opening) {
          const pose = trackPose(opening.tracks.get(card.id), time - opening.start, OPENING.lift);
          body.setNextKinematicTranslation(pose.position);
          body.setNextKinematicRotation(pose.rotation);
          continue;
        }
        const pose = fanPose(card.id);
        const wave = Math.sin((2 * Math.PI * time) / FAN.breathePeriod + phases[card.id]);
        body.setNextKinematicTranslation({ x: pose.x, y: pose.y + FAN.breatheAmplitude * wave, z: pose.z });
        body.setNextKinematicRotation(quatZ(pose.angle + FAN.breatheRotation * wave));
        continue;
      }
      if (card.status === STATUS.held) {
        steerArrive(body, holdTarget, HOLD, dt);
        steerUpright(body, HOLD, dt);
        continue;
      }
      if (card.status === STATUS.flying || card.status === STATUS.onTable) {
        applyAirDrag(body, AIR.coefficient, dt);
      }
      if (card.airborne && card.family === FAMILY.curve) {
        const a = curveAcceleration(body.linvel(), body.angvel(), body.rotation(), EFFECTS.curve.gain);
        const k = body.mass() * dt;
        body.applyImpulse({ x: a.x * k, y: a.y * k, z: a.z * k }, true);
      }
      const v = body.linvel();
      preVelocity[card.id] = { x: v.x, y: v.y, z: v.z };
    }
  }

  function afterStep(dt) {
    // Contacts that started this step; one per card. A card hitting another
    // card and the wall in the same step counts the card first (so a sharp
    // letter striking a stuck one knocks it out rather than biting the wall
    // behind it), then the wall, then the room.
    const RANK = { card: 3, brick: 2, room: 1 };
    const contacts = new Map();
    physics.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      for (const [mine, theirs] of [
        [h1, h2],
        [h2, h1],
      ]) {
        const id = cardOfCollider.get(mine);
        if (id === undefined) continue;
        const other = classify(theirs);
        if (other.type === 'card' && other.id === id) continue;
        const seen = contacts.get(id);
        if (!seen || RANK[other.type] > RANK[seen.type]) contacts.set(id, other);
      }
    });
    for (const [id, other] of contacts) {
      const card = cardById.get(id);
      if (card) onContact(card, other);
    }

    for (const card of cards()) {
      if (card.status !== STATUS.flying && card.status !== STATUS.onTable) continue;
      const body = bodies[card.id];
      const v = body.linvel();
      const w = body.angvel();
      const speed = Math.hypot(v.x, v.y, v.z);
      const spin = Math.hypot(w.x, w.y, w.z);
      if (card.status === STATUS.flying) {
        const resting = body.isSleeping() || (speed < STATUS_RULES.restSpeed && spin < STATUS_RULES.restSpin);
        card.restTime = resting ? card.restTime + dt : 0;
        if (card.restTime >= STATUS_RULES.restTime) {
          card.status = STATUS.onTable;
          card.airborne = false;
        }
      } else if (speed > STATUS_RULES.wakeSpeed) {
        card.status = STATUS.flying;
        card.restTime = 0;
      }
    }

    // The wall: telegraphs that have run their course release their brick;
    // the scheduler picks new ones. Paused before play, in the opening, in
    // the finale and while resetting.
    if (playStart !== null && !finale && !opening && !resetting) {
      for (let i = 0; i < bricks.length; i++) {
        if (shudderStart[i] !== null && time - shudderStart[i] >= DECAY.telegraph) releaseBrick(i);
      }
      const immune = immuneBricks();
      const chosen = decay.update({
        playTime: time - playStart,
        dt,
        eligible: (i) => standing[i] && shudderStart[i] === null && !immune.has(i),
        stress: brickStress,
      });
      for (const i of chosen) shudderStart[i] = time;
      if (fallen / bricks.length >= DECAY.collapseFraction) beginReset('collapse');
    }

    // Quiet reset: once play has started, a long spell with no hold or throw
    // ends the round (also after the finale).
    if (playStart !== null && !held && time - lastInput >= RESET.quietSeconds) beginReset('quiet');

    if (resetting && time - resetting.start >= RESET.fadeOut) {
      rebuildWall();
      startRound();
    }

    if (finale) return;
    for (const [text, word] of Object.entries(resolution.words)) {
      if (word.state === 'ready' && word.members.every((id) => letters[id].status !== STATUS.held)) lockWord(text, word);
    }
  }

  return {
    physics,
    letters,
    decoys,
    cards,
    card: (id) => cardById.get(id),
    bodies,
    forms,
    get fan() {
      return fan;
    },
    get handOrder() {
      return handOrder;
    },
    fanPose,
    bricks,
    brickBodies,
    brickStress,
    standing,
    shudderStart,
    get fallen() {
      return fallen;
    },
    get decay() {
      return decay.state;
    },
    get resetting() {
      return resetting;
    },
    get quietFor() {
      return playStart === null ? 0 : time - lastInput;
    },
    releaseBrick,
    beginReset,
    impacts,
    wall,
    room,
    shedder,
    hold,
    setHoldTarget,
    release,
    placeInFan,
    startRound,
    returnAllToFan: startRound, // dev panel name, kept
    debugPlace,
    shedDecoy,
    beforeStep,
    afterStep,
    get held() {
      return held;
    },
    get lastPlan() {
      return lastPlan;
    },
    get lastContact() {
      return lastContact;
    },
    get resolution() {
      return resolution;
    },
    get lockedWords() {
      return lockedWords;
    },
    // 0 before the finale, rising to 1 as the line forms.
    get finaleProgress() {
      return finale ? Math.min(1, (time - finale.start) / FINALE.duration) : 0;
    },
    // While a round opens: { black, push } from 1 down to 0 (fade from black,
    // camera push-in); both 0 once settled.
    get curtain() {
      if (resetting) return { black: Math.min(1, (time - resetting.start) / RESET.fadeOut), push: 0 };
      return opening ? openingCurtain(time - opening.start, OPENING) : { black: 0, push: 0 };
    },
    get opening() {
      return !!opening;
    },
    get playTime() {
      return playStart === null ? 0 : time - playStart;
    },
    layout,
    get time() {
      return time;
    },
  };
}
