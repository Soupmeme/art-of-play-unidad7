// Honest physics: the Rapier world and its fixed-step clock.
// Nothing in this folder is non-physical (see EXPLAINER.md, "What is physics").

import RAPIER from '@dimforge/rapier3d-compat';
import { WORLD } from '../config.js';

let ready = null;

// Rapier ships as WebAssembly; it must be initialised once before use.
// Works the same in the browser and in Node (tests, headless scenario runner).
export function initRapier() {
  ready ??= RAPIER.init().then(() => RAPIER);
  return ready;
}

export function createPhysics(rapier, { gravity = WORLD.gravity, step = WORLD.physicsStep } = {}) {
  const world = new rapier.World(gravity);
  world.timestep = step;
  const eventQueue = new rapier.EventQueue(true);
  return { rapier, world, eventQueue, step, stepCount: 0 };
}

// Advances the world by whole fixed steps. Leftover time carries to the next
// frame, so physics runs at the same rate whatever the display refresh rate.
export function createStepper(physics, { maxSteps = WORLD.maxStepsPerFrame } = {}) {
  let accumulator = 0;

  return function advance(frameSeconds, { beforeStep, afterStep } = {}) {
    accumulator += frameSeconds;
    let steps = 0;
    while (accumulator >= physics.step && steps < maxSteps) {
      beforeStep?.(physics.step);
      physics.world.step(physics.eventQueue);
      physics.stepCount++;
      afterStep?.(physics.step);
      accumulator -= physics.step;
      steps++;
    }
    if (steps === maxSteps) accumulator = 0;
    return steps;
  };
}
