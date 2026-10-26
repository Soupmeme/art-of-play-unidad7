// Scenario runner (brief 7.4): throws letters with fixed parameters from a
// fixed seed and records where they land and what they do. Runs headless
// (Node, via Vitest) on the same game, mapping and physics code as the
// browser; only the pointer is synthetic.

import { initRapier, createPhysics, createStepper } from '../physics/world.js';
import { createGame } from '../game.js';
import { planThrow, clampAim } from '../input/throwMapping.js';
import { THROW, WORLD, CARD } from '../config.js';

// A session keeps one game alive across several throws, for sequences.
// Sessions start from a known hand by default: reading order, no decoys in
// the hand, no opening. Pass round: {} for the real game's round.
export async function createSession({ seed = WORLD.seed, round = { shuffle: false, handDecoys: false, opening: false } } = {}) {
  const rapier = await initRapier();
  const physics = createPhysics(rapier);
  const game = createGame(physics, { seed, round });
  const advance = createStepper(physics);
  const hooks = { beforeStep: game.beforeStep, afterStep: game.afterStep };
  const step = () => advance(physics.step, hooks);

  function wait(seconds) {
    for (let i = 0, n = Math.round(seconds / physics.step); i < n; i++) step();
  }

  // throwSpec: {
  //   letterId, aim: { x, y } on the wall,
  //   pointer: { vx, vy } in screen heights/s (y down, so an upward flick has vy < 0),
  //   holdAt: { x, y } on the hold plane (default: above the letter's fan slot),
  //   seconds: how long to simulate after release,
  //   params: throw mapping (default THROW)
  // }
  function throwLetter({ letterId, aim, pointer, holdAt, seconds = 3, params = THROW }) {
    const letter = game.card(letterId);
    const body = game.bodies[letterId];
    const slot = game.fanPose(letterId) ?? { x: body.translation().x, y: 0.4 };
    game.hold(letter);
    game.setHoldTarget(holdAt ?? { x: slot.x, y: slot.y + 0.6, z: 0 });
    wait(0.5); // half a second in the hand

    const speed = Math.hypot(pointer.vx, pointer.vy);
    const target = clampAim(
      { x: aim.x, y: aim.y, z: game.wall.z },
      { halfWidth: game.wall.halfWidth, top: game.wall.top, inset: params.aimInset },
    );
    const from = body.translation();
    const plan = planThrow({ pointer: { ...pointer, speed }, from, target, params, gravity: -WORLD.gravity.y });
    game.release(plan);

    let wallHit = null;
    let flightTime = null;
    const contactZ = game.wall.z + CARD.thickness;
    const total = Math.round(seconds / physics.step);
    for (let i = 0; i < total; i++) {
      step();
      const p = body.translation();
      if (!wallHit && p.z <= contactZ + 0.05) {
        wallHit = { x: p.x, y: p.y };
        flightTime = (i + 1) * physics.step;
      }
    }
    return {
      letter: letter.char,
      family: letter.family,
      from,
      plan,
      wallHit,
      flightTime,
      rest: body.translation(),
      status: letter.status,
      lastContact: game.lastContact,
      game,
    };
  }

  return { game, physics, wait, throwLetter };
}

// One throw in a fresh game. setup(game), if given, arranges other letters first.
export async function runThrow({ seed, setup, ...spec }) {
  const session = await createSession({ seed });
  setup?.(session.game);
  return session.throwLetter(spec);
}
