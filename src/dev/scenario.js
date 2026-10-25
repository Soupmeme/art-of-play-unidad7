// Scenario runner (brief 7.4): throws a given letter with fixed parameters
// from a fixed seed and records where it lands and what it does. Runs
// headless (Node, via Vitest) on the same game, mapping and physics code as
// the browser; only the pointer is synthetic.

import { initRapier, createPhysics, createStepper } from '../physics/world.js';
import { createGame } from '../game.js';
import { planThrow, clampAim } from '../input/throwMapping.js';
import { THROW, WORLD, CARD } from '../config.js';

// throwSpec: {
//   letterId, aim: { x, y } on the wall,
//   pointer: { vx, vy } in screen heights/s (y down, so an upward flick has vy < 0),
//   holdAt: { x, y } on the hold plane (default: in front of the letter's fan slot),
//   seconds: how long to simulate after release,
//   seed
// }
export async function runThrow({ letterId, aim, pointer, holdAt, seconds = 3, seed = WORLD.seed, params = THROW }) {
  const rapier = await initRapier();
  const physics = createPhysics(rapier);
  const game = createGame(physics, { seed });
  const advance = createStepper(physics);
  const hooks = { beforeStep: game.beforeStep, afterStep: game.afterStep };
  const step = () => advance(physics.step, hooks);

  const letter = game.letters[letterId];
  const body = game.bodies[letterId];
  const slot = game.fan[letterId];
  game.hold(letter);
  game.setHoldTarget(holdAt ?? { x: slot.x, y: slot.y + 0.6, z: 0 });
  for (let i = 0; i < 30; i++) step(); // half a second in the hand

  const speed = Math.hypot(pointer.vx, pointer.vy);
  const target = clampAim({ x: aim.x, y: aim.y, z: game.wall.z }, { halfWidth: game.wall.halfWidth, top: game.wall.top, inset: params.aimInset });
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
  const rest = body.translation();
  return { letter: letter.char, from, plan, wallHit, flightTime, rest, status: letter.status };
}
