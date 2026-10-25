// Entry point: boots Rapier, builds the game and the view, runs the frame loop.

import { initRapier, createPhysics, createStepper } from './physics/world.js';
import { createGame } from './game.js';
import { createRenderer } from './render/renderer.js';
import {
  createLetterMeshes,
  syncLetterMeshes,
  createWallMeshes,
  createRailMeshes,
  createColliderDebug,
} from './render/meshes.js';
import { createHoldThrow } from './input/holdThrow.js';
import { isDevMode, createDevTools } from './dev/devTools.js';

async function main() {
  const rapier = await initRapier();
  const physics = createPhysics(rapier);
  const advance = createStepper(physics);
  const game = createGame(physics);

  const canvas = document.getElementById('stage');
  const view = createRenderer(canvas);
  const letterMeshes = createLetterMeshes(view.scene, game);
  createWallMeshes(view.scene, game);
  createRailMeshes(view.scene, game);
  const colliderDebug = createColliderDebug(view.scene);
  createHoldThrow({ canvas, camera: view.camera, game, meshes: letterMeshes });

  let dev = null;
  if (isDevMode()) {
    const { createDevPanel, describeState } = await import('./dev/panel.js');
    const { createFlick } = await import('./dev/flick.js');
    dev = createDevTools(document.getElementById('hero'));
    createDevPanel({ game, colliderDebug });
    dev.describe = () => describeState(game, rapier.version(), physics);
    // Console access for scripted checks.
    window.aop = { game, physics, view, flick: createFlick({ canvas, camera: view.camera, game }) };
  }

  const hooks = { beforeStep: game.beforeStep, afterStep: game.afterStep };
  let last = performance.now();
  function frame(now) {
    dev?.begin();
    const frameSeconds = Math.min((now - last) / 1000, 0.25);
    last = now;
    advance(frameSeconds, hooks);
    syncLetterMeshes(letterMeshes, game);
    colliderDebug.update(physics.world);
    view.render();
    if (dev) dev.setInfo(dev.describe());
    dev?.end();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
