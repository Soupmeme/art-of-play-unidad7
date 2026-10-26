// The game state: letters, wall and room, and what happens each physics step.
// Rendering and input live elsewhere; this module only touches bodies and data.

import { STATUS, HOLDABLE, WORDS, createLetters, wordStarts } from './letters/letters.js';
import { FAMILY } from './letters/families.js';
import { letterForm, wordLayout } from './letters/glyphs.js';
import { fanLayout } from './letters/fan.js';
import { stickCheck, embedPose, curveAcceleration, rippleKicks, rippleShake } from './letters/effects.js';
import { resolveWords, letterSnapshot } from './words/resolve.js';
import { finaleLayout, finalePose } from './staging/finale.js';
import { layoutWall, createBrickBodies } from './wall/wall.js';
import { createRoom } from './physics/room.js';
import { applyAirDrag, steerArrive, steerUpright } from './physics/forces.js';
import { createRng, deriveSeed } from './core/rng.js';
import { CARD, AIR, ROOM, WALL, FAN, HOLD, EFFECTS, WORD_RULES, FINALE, STATUS_RULES, WORLD } from './config.js';

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
const IMPACT_HISTORY = 16;

export function createGame(physics, { seed = WORLD.seed } = {}) {
  const { rapier, world } = physics;

  const letters = createLetters();
  const forms = letters.map((l) =>
    letterForm(l.char, { capHeight: CARD.capHeight, depth: CARD.thickness, colliderCell: CARD.colliderCell }),
  );
  const fan = fanLayout({
    advances: forms.map((f) => f.advance),
    wordStarts: wordStarts(),
    center: FAN.center,
    radius: FAN.radius,
    overlap: FAN.overlap,
    wordGap: FAN.wordGap,
    layerStep: FAN.layerStep,
    sag: FAN.sag,
  });

  const bricks = layoutWall(WALL);
  const brickBodies = createBrickBodies(physics, bricks, WALL);
  const wall = {
    z: WALL.z,
    top: WALL.rows * WALL.brickHeight,
    halfWidth: (WALL.cols * WALL.brickWidth) / 2,
  };
  const room = createRoom(physics, ROOM, WALL.z);

  // Which collider belongs to which brick or letter, to read contact events.
  const brickOfCollider = new Map();
  brickBodies.forEach((body, index) => brickOfCollider.set(body.collider(0).handle, index));
  const letterOfCollider = new Map();

  // Idle breathing of the fan. NON-PHYSICAL (4d): the fan is a kinematic rack
  // that holds the letters at rest; it is part of the staging, not of play.
  const swayRng = createRng(deriveSeed(seed, 'sway'));
  const phases = letters.map(() => swayRng.range(0, Math.PI * 2));

  const bodies = letters.map((letter, i) => {
    const pose = fan[i];
    const body = world.createRigidBody(
      rapier.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(pose.x, pose.y, pose.z)
        .setRotation(quatZ(pose.angle))
        .setAngularDamping(CARD.angularDamping)
        .setCcdEnabled(true),
    );
    const ripple = letter.family === FAMILY.ripple;
    for (const b of forms[i].boxes) {
      const desc = rapier.ColliderDesc.cuboid(b.halfWidth, b.halfHeight, CARD.thickness / 2)
        .setTranslation(b.x, b.y, 0)
        .setDensity(CARD.density)
        .setFriction(CARD.friction)
        .setRestitution(ripple ? EFFECTS.ripple.restitution : CARD.restitution)
        .setCollisionGroups(IN_FAN)
        .setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
      // Ripple letters keep their own bounce whatever they hit (4a).
      if (ripple) desc.setRestitutionCombineRule(rapier.CoefficientCombineRule.Max);
      letterOfCollider.set(world.createCollider(desc, body).handle, letter.id);
    }
    return body;
  });

  let time = 0;
  let held = null;
  let holdTarget = null;
  let lastPlan = null;
  let lastContact = null;
  const preVelocity = letters.map(() => ({ ...ZERO })); // velocity before this step: the impact velocity
  const lastRipple = letters.map(() => -Infinity);
  const joints = letters.map(() => null);
  const brickStress = new Float32Array(bricks.length); // read by the decay scheduler (M4)
  const impacts = []; // recent wall impacts, for the renderer: { kind, x, y, time }

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

  // Side boundary x at a given depth (the rails converge toward the camera).
  function sideLimitAt(z) {
    const t = clamp((z - ROOM.frontZ) / (WALL.z - ROOM.frontZ), 0, 1);
    return lerp(ROOM.nearX, ROOM.farX, t);
  }

  function hold(letter) {
    if (!HOLDABLE.has(letter.status) || held) return false;
    const body = bodies[letter.id];
    body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    body.setGravityScale(0, true); // the hand carries the weight while held
    setGroups(body, IN_PLAY);
    letter.status = STATUS.held;
    held = letter;
    holdTarget = body.translation();
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

  // plan comes from planThrow: a drop keeps the letter's current motion,
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
    lastPlan = { ...plan, letter: held.char, from: body.translation() };
    held = null;
  }

  function unstick(letter) {
    if (joints[letter.id]) world.removeImpulseJoint(joints[letter.id], true);
    joints[letter.id] = null;
    letter.stuckTo = null;
  }

  function placeInFan(letter) {
    unstick(letter);
    const body = bodies[letter.id];
    const pose = fan[letter.id];
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

  // Dev only for now (M4's reset will stage this): every letter back in the
  // hand, no words locked, no finale.
  function returnAllToFan() {
    if (held) return;
    letters.forEach(placeInFan);
    lockedWords.length = 0;
    finale = null;
  }

  // Test and dev helper only (never used in play): puts a letter at a pose as a
  // free body at rest, to set up scenarios.
  function debugPlace(letter, position, rotation = { x: 0, y: 0, z: 0, w: 1 }) {
    unstick(letter);
    const body = bodies[letter.id];
    body.setBodyType(rapier.RigidBodyType.Dynamic, true);
    body.setGravityScale(1, true);
    setGroups(body, IN_PLAY);
    body.setTranslation(position, true);
    body.setRotation(rotation, true);
    body.setLinvel(ZERO, true);
    body.setAngvel(ZERO, true);
    letter.status = STATUS.onTable;
    letter.airborne = false;
  }

  let impactSeq = 0;
  function recordImpact(kind, position) {
    impacts.push({ kind, x: position.x, y: position.y, time, seq: ++impactSeq });
    if (impacts.length > IMPACT_HISTORY) impacts.shift();
  }

  // NON-PHYSICAL (4a), Stick: the letter is pressed flat into the wall face and
  // joined to the brick it hit by a fixed joint. If the brick later falls, the
  // letter falls with it.
  function embed(letter, brickIndex) {
    const body = bodies[letter.id];
    const pose = embedPose(body.translation(), body.rotation(), WALL.z, CARD.thickness, EFFECTS.stick.bite);
    body.setTranslation(pose.position, true);
    body.setRotation(pose.rotation, true);
    body.setLinvel(ZERO, true);
    body.setAngvel(ZERO, true);
    const brick = brickBodies[brickIndex];
    const b = brick.translation();
    const anchor = { x: pose.position.x - b.x, y: pose.position.y - b.y, z: pose.position.z - b.z };
    const joint = world.createImpulseJoint(
      rapier.JointData.fixed(anchor, pose.rotation, ZERO, { x: 0, y: 0, z: 0, w: 1 }),
      brick,
      body,
      true,
    );
    joint.setContactsEnabled(false);
    joints[letter.id] = joint;
    letter.status = STATUS.stuck;
    letter.stuckTo = brickIndex;
    letter.airborne = false;
  }

  // NON-PHYSICAL (4a), Ripple: kicks nearby free letters and stresses nearby bricks.
  function ripple(letter, other) {
    const impact = bodies[letter.id].translation();
    const others = letters
      .filter((l) => l !== letter && (l.status === STATUS.flying || l.status === STATUS.onTable))
      .map((l) => ({ id: l.id, position: bodies[l.id].translation() }));
    for (const kick of rippleKicks(impact, others, EFFECTS.ripple)) {
      const body = bodies[kick.id];
      const m = body.mass();
      body.applyImpulse({ x: kick.deltaV.x * m, y: kick.deltaV.y * m, z: kick.deltaV.z * m }, true);
    }
    if (other.type === 'brick' && EFFECTS.ripple.wallShake) {
      for (const s of rippleShake(impact, bricks, EFFECTS.ripple)) brickStress[s.index] += s.stress;
    }
    lastRipple[letter.id] = time;
  }

  // The first contact a flying letter makes in a step decides its effect.
  function onContact(letter, other) {
    if (letter.status !== STATUS.flying) return;
    letter.airborne = false;
    const body = bodies[letter.id];
    const v = preVelocity[letter.id];
    const speed = Math.hypot(v.x, v.y, v.z);
    let kind = 'bounce';

    if (letter.family === FAMILY.stick && other.type === 'brick') {
      const check = stickCheck(v, body.rotation(), EFFECTS.stick);
      // Lockout mitigation (a): a letter being pulled by a correct neighbour
      // does not embed; the pull wins.
      const pulled = resolution.letters[letter.id].pulled;
      lastContact = { letter: letter.char, ...check, pulled };
      if (check.stick && !pulled) {
        embed(letter, other.index);
        kind = 'stick';
      }
    } else if (
      letter.family === FAMILY.ripple &&
      speed >= EFFECTS.ripple.minSpeed &&
      time - lastRipple[letter.id] >= EFFECTS.ripple.cooldown
    ) {
      ripple(letter, other);
      kind = 'ripple';
      lastContact = { letter: letter.char, speed, ripple: true };
    } else {
      lastContact = { letter: letter.char, speed };
    }
    if (other.type === 'brick') recordImpact(kind, body.translation());
  }

  function classify(handle) {
    if (brickOfCollider.has(handle)) return { type: 'brick', index: brickOfCollider.get(handle) };
    if (letterOfCollider.has(handle)) return { type: 'letter', id: letterOfCollider.get(handle) };
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
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      letter.status = STATUS.locked;
      letter.lockedWord = text;
      letter.airborne = false;
    });
    lockedWords.push({ word: text, time });
    if (lockedWords.length === WORDS.length) startFinale();
  }

  function startFinale() {
    const to = [];
    for (const { text } of WORDS) {
      resolution.words[text].members.forEach((id, i) => {
        to[id] = { position: finaleTargets[text][i], rotation: { x: 0, y: 0, z: 0, w: 1 } };
      });
    }
    finale = {
      start: time,
      from: letters.map((l) => ({ position: bodies[l.id].translation(), rotation: bodies[l.id].rotation() })),
      to,
    };
  }

  function beforeStep(dt) {
    time += dt;
    if (finale) {
      for (const letter of letters) {
        const pose = finalePose(finale.from[letter.id], finale.to[letter.id], time - finale.start, FINALE.duration);
        bodies[letter.id].setNextKinematicTranslation(pose.position);
        bodies[letter.id].setNextKinematicRotation(pose.rotation);
      }
      return;
    }
    resolution = resolveWords(snapshots(), { params: WORD_RULES, layout, previousLeaders: leaders });
    for (const [text, word] of Object.entries(resolution.words)) leaders[text] = word.leader;

    for (const letter of letters) {
      const body = bodies[letter.id];
      const info = resolution.letters[letter.id];
      if (letter.status === STATUS.flying || letter.status === STATUS.onTable) {
        if (info.pulled) {
          letter.airborne = false; // the pull takes over from the Curve
          applyPull(body, info.target, dt);
        } else if (info.warmth > 0) {
          applyWarm(letter, body, info.warmth, dt);
        }
      }
      if (letter.status === STATUS.inFan) {
        const pose = fan[letter.id];
        const wave = Math.sin((2 * Math.PI * time) / FAN.breathePeriod + phases[letter.id]);
        body.setNextKinematicTranslation({ x: pose.x, y: pose.y + FAN.breatheAmplitude * wave, z: pose.z });
        body.setNextKinematicRotation(quatZ(pose.angle + FAN.breatheRotation * wave));
        continue;
      }
      if (letter.status === STATUS.held) {
        steerArrive(body, holdTarget, HOLD, dt);
        steerUpright(body, HOLD, dt);
        continue;
      }
      if (letter.status === STATUS.flying || letter.status === STATUS.onTable) {
        applyAirDrag(body, AIR.coefficient, dt);
      }
      if (letter.airborne && letter.family === FAMILY.curve) {
        const a = curveAcceleration(body.linvel(), body.angvel(), body.rotation(), EFFECTS.curve.gain);
        const k = body.mass() * dt;
        body.applyImpulse({ x: a.x * k, y: a.y * k, z: a.z * k }, true);
      }
      const v = body.linvel();
      preVelocity[letter.id] = { x: v.x, y: v.y, z: v.z };
    }
  }

  function afterStep(dt) {
    if (finale) {
      physics.eventQueue.drainCollisionEvents(() => {});
      return;
    }
    // Contacts that started this step; one per letter, the first one seen.
    const contacts = new Map();
    physics.eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      for (const [mine, theirs] of [
        [h1, h2],
        [h2, h1],
      ]) {
        const id = letterOfCollider.get(mine);
        if (id !== undefined && !contacts.has(id)) contacts.set(id, classify(theirs));
      }
    });
    for (const [id, other] of contacts) onContact(letters[id], other);

    for (const letter of letters) {
      if (letter.status !== STATUS.flying && letter.status !== STATUS.onTable) continue;
      const body = bodies[letter.id];
      const v = body.linvel();
      const w = body.angvel();
      const speed = Math.hypot(v.x, v.y, v.z);
      const spin = Math.hypot(w.x, w.y, w.z);
      if (letter.status === STATUS.flying) {
        const resting = body.isSleeping() || (speed < STATUS_RULES.restSpeed && spin < STATUS_RULES.restSpin);
        letter.restTime = resting ? letter.restTime + dt : 0;
        if (letter.restTime >= STATUS_RULES.restTime) {
          letter.status = STATUS.onTable;
          letter.airborne = false;
        }
      } else if (speed > STATUS_RULES.wakeSpeed) {
        letter.status = STATUS.flying;
        letter.restTime = 0;
      }
    }

    for (const [text, word] of Object.entries(resolution.words)) {
      if (word.state === 'ready' && word.members.every((id) => letters[id].status !== STATUS.held)) lockWord(text, word);
    }
  }

  return {
    physics,
    letters,
    bodies,
    forms,
    fan,
    bricks,
    brickBodies,
    brickStress,
    impacts,
    wall,
    room,
    hold,
    setHoldTarget,
    release,
    placeInFan,
    returnAllToFan,
    debugPlace,
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
    layout,
    get time() {
      return time;
    },
  };
}
