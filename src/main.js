// Entry point: boots Rapier, builds the game and the view, runs the frame loop.

import { initRapier, createPhysics, createStepper } from './physics/world.js';
import { createGame } from './game.js';
import { createRenderer } from './render/renderer.js';
import { createCardMeshes, createTypeSurfaces, createColliderDebug } from './render/meshes.js';
import { createHoldThrow } from './input/holdThrow.js';
import { createStage } from './render/stage.js';
import { createLightCues } from './render/lighting.js';
import { isDevMode, createDevTools } from './dev/devTools.js';
import { isLogging } from './dev/playtestLog.js';
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

  // Opt-in, local-only playtest log (?log or ?dev): nothing on screen.
  let playtestLog = null;
  if (isLogging()) {
    const { createPlaytestLog } = await import('./dev/playtestLog.js');
    playtestLog = createPlaytestLog({ game, canvas });
  }

  let dev = null;
  let wordDebug = null;
  if (isDevMode()) {
    const { createDevPanel, describeState } = await import('./dev/panel.js');
    const { createFlick } = await import('./dev/flick.js');
    const { createSmoke } = await import('./dev/smoke.js');
    const { createWordDebug } = await import('./dev/wordDebug.js');
    dev = createDevTools(document.getElementById('hero'));
    wordDebug = createWordDebug(view.scene, view.camera, game);
    createDevPanel({ game, colliderDebug, view, wordDebug });
    dev.describe = () => describeState(game, rapier.version(), physics);
    // Console access for scripted checks.
    const flick = createFlick({ canvas, camera: view.camera, game });
    window.aop = { game, physics, view, flick, smoke: createSmoke({ game, view, flick }) };
  }

  // Pause while the hero is scrolled out of view: no physics, no drawing.
  let onStage = true;
  new IntersectionObserver(([entry]) => {
    onStage = entry.isIntersecting;
  }).observe(document.getElementById('hero'));

  const fade = document.getElementById('fade');
  const hooks = { beforeStep: game.beforeStep, afterStep: game.afterStep };
  let last = performance.now();
  // The next frame is always scheduled first, so an error in one frame is
  // logged and the piece keeps running instead of freezing.
  function frame(now) {
    requestAnimationFrame(frame);
    if (!onStage) {
      last = now;
      return;
    }
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
      wordDebug?.update();
      playtestLog?.update();
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
