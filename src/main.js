// Entry point: boots Rapier, builds the scene, runs the frame loop.

import { initRapier, createPhysics, createStepper } from './physics/world.js';
import { createRenderer } from './render/renderer.js';
import { isDevMode, createDevTools } from './dev/devTools.js';

async function main() {
  const rapier = await initRapier();
  const physics = createPhysics(rapier);
  const advance = createStepper(physics);

  const canvas = document.getElementById('stage');
  const view = createRenderer(canvas);
  const dev = isDevMode() ? createDevTools(document.getElementById('hero')) : null;

  let last = performance.now();
  function frame(now) {
    dev?.begin();
    const frameSeconds = Math.min((now - last) / 1000, 0.25);
    last = now;
    advance(frameSeconds);
    view.render();
    dev?.setInfo([`rapier ${rapier.version()}`, `physics steps ${physics.stepCount}`]);
    dev?.end();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
