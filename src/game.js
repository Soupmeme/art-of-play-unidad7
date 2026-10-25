// The game state: letters, wall and room, and what happens each physics step.
// Rendering and input live elsewhere; this module only touches bodies and data.

import { STATUS, HOLDABLE, createLetters, wordStarts } from './letters/letters.js';
import { letterForm, advanceWidth } from './letters/glyphs.js';
import { fanLayout } from './letters/fan.js';
import { layoutWall, createBrickBodies } from './wall/wall.js';
import { createRoom } from './physics/room.js';
import { applyAirDrag, steerArrive, steerUpright } from './physics/forces.js';
import { createRng, deriveSeed } from './core/rng.js';
import { CARD, AIR, ROOM, WALL, FAN, HOLD, STATUS_RULES, WORLD } from './config.js';

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
  });

  const bricks = layoutWall({ ...WALL, advance: (c) => advanceWidth(c, WALL.capHeight) });
  const brickBodies = createBrickBodies(physics, bricks, WALL);
  const wall = {
    z: WALL.z,
    top: WALL.rows * WALL.rowHeight,
    halfWidth: Math.max(...bricks.map((b) => Math.abs(b.x) + b.w / 2)),
  };
  const room = createRoom(physics, ROOM, WALL.z);

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
    for (const b of forms[i].boxes) {
      world.createCollider(
        rapier.ColliderDesc.cuboid(b.halfWidth, b.halfHeight, CARD.thickness / 2)
          .setTranslation(b.x, b.y, 0)
          .setDensity(CARD.density)
          .setFriction(CARD.friction)
          .setRestitution(CARD.restitution)
          .setCollisionGroups(IN_FAN),
        body,
      );
    }
    return body;
  });

  let time = 0;
  let held = null;
  let holdTarget = null;
  let lastPlan = null;

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
  // a throw sets its launch velocity and spin. Flight is then pure physics.
  function release(plan) {
    if (!held) return;
    const body = bodies[held.id];
    body.setGravityScale(1, true);
    if (plan.kind === 'throw') {
      body.setLinvel(plan.linvel, true);
      body.setAngvel(plan.angvel, true);
    }
    held.status = STATUS.flying;
    held.restTime = 0;
    lastPlan = { ...plan, letter: held.char, from: body.translation() };
    held = null;
  }

  function placeInFan(letter) {
    const body = bodies[letter.id];
    const pose = fan[letter.id];
    body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    body.setGravityScale(1, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setTranslation({ x: pose.x, y: pose.y, z: pose.z }, true);
    body.setRotation(quatZ(pose.angle), true);
    setGroups(body, IN_FAN);
    letter.status = STATUS.inFan;
    letter.restTime = 0;
  }

  function beforeStep(dt) {
    time += dt;
    for (const letter of letters) {
      const body = bodies[letter.id];
      if (letter.status === STATUS.inFan) {
        const pose = fan[letter.id];
        const wave = Math.sin((2 * Math.PI * time) / FAN.breathePeriod + phases[letter.id]);
        body.setNextKinematicTranslation({ x: pose.x, y: pose.y + FAN.breatheAmplitude * wave, z: pose.z });
        body.setNextKinematicRotation(quatZ(pose.angle + FAN.breatheRotation * wave));
      } else if (letter.status === STATUS.held) {
        steerArrive(body, holdTarget, HOLD, dt);
        steerUpright(body, HOLD, dt);
      } else if (letter.status === STATUS.flying || letter.status === STATUS.onTable) {
        applyAirDrag(body, AIR.coefficient, dt);
      }
    }
  }

  function afterStep(dt) {
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
        if (letter.restTime >= STATUS_RULES.restTime) letter.status = STATUS.onTable;
      } else if (speed > STATUS_RULES.wakeSpeed) {
        letter.status = STATUS.flying;
        letter.restTime = 0;
      }
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
    wall,
    room,
    hold,
    setHoldTarget,
    release,
    placeInFan,
    beforeStep,
    afterStep,
    get held() {
      return held;
    },
    get lastPlan() {
      return lastPlan;
    },
    get time() {
      return time;
    },
  };
}
