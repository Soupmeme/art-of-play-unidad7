// Entry point: boots Rapier, builds the game and the view, runs the frame loop.

import { initRapier, createPhysics, createStepper } from './physics/world.js';
import { createGame } from './game.js';
import { createRenderer } from './render/renderer.js';
import { createCardMeshes, createTypeSurfaces, createColliderDebug } from './render/meshes.js';
import { createHoldThrow } from './input/holdThrow.js';
import { createStage } from './render/stage.js';
import { createLightCues } from './render/lighting.js';
import { isDevMode, createDevTools } from './dev/devTools.js';
import { OPENING } from './config.js';

async function main() {
  const rapier = await initRapier();
  const physics = createPhysics(rapier);
  const advance = createStepper(physics);
  const game = createGame(physics);

  const canvas = document.getElementById('stage');
  const view = createRenderer(canvas);
  const cardMeshes = createCardMeshes(view.scene, game);
  const typeSurfaces = createTypeSurfaces(view.scene, game);
  const stage = createStage(view.scene);
  const lightCues = createLightCues({ view, game, typeSurfaces, stage });
  const colliderDebug = createColliderDebug(view.scene);
  createHoldThrow({ canvas, camera: view.camera, game, meshes: cardMeshes.meshes });

  let dev = null;
  if (isDevMode()) {
    const { createDevPanel, describeState } = await import('./dev/panel.js');
    const { createFlick } = await import('./dev/flick.js');
    dev = createDevTools(document.getElementById('hero'));
    createDevPanel({ game, colliderDebug, view });
    dev.describe = () => describeState(game, rapier.version(), physics);
    // Console access for scripted checks.
    window.aop = { game, physics, view, flick: createFlick({ canvas, camera: view.camera, game }) };
  }

  const fade = document.getElementById('fade');
  const hooks = { beforeStep: game.beforeStep, afterStep: game.afterStep };
  let last = performance.now();
  // The next frame is always scheduled first, so an error in one frame is
  // logged and the piece keeps running instead of freezing.
  function frame(now) {
    requestAnimationFrame(frame);
    dev?.begin();
    try {
      const frameSeconds = Math.min((now - last) / 1000, 0.25);
      last = now;
      advance(frameSeconds, hooks);
      const curtain = game.curtain;
      fade.style.opacity = curtain.black.toFixed(3);
      view.setPush(curtain.push * OPENING.dollyFrom);
      cardMeshes.sync(now / 1000);
      typeSurfaces.update(now / 1000);
      lightCues(now / 1000);
      colliderDebug.update(physics.world);
      view.render();
      if (dev) dev.setInfo(dev.describe());
    } catch (error) {
      console.error(error);
    }
    dev?.end();
  }
  requestAnimationFrame(frame);
}

main();
