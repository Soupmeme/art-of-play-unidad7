// Dev only (brief 7.6): a scripted smoke run. For `seconds`, it keeps
// playing through the real input path: it picks a card it can hold, and
// throws it at a seeded random point of the backdrop, sometimes soft,
// sometimes a drop. It counts errors seen on the page while it runs.
//   await aop.smoke(120)

import { createRng } from '../core/rng.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createSmoke({ game, view, flick }) {
  return async function smoke(seconds = 120, seed = 99) {
    const rng = createRng(seed);
    let errors = 0;
    const onError = () => errors++;
    window.addEventListener('error', onError);
    const originalError = console.error;
    console.error = (...args) => {
      errors++;
      originalError(...args);
    };
    const start = performance.now();
    let throws = 0;
    try {
      while ((performance.now() - start) / 1000 < seconds) {
        const holdable = game.cards().filter((c) => c.status === 'inFan' || c.status === 'onTable');
        if (game.opening || game.resetting || !holdable.length) {
          await wait(300);
          continue;
        }
        const card = rng.pick(holdable);
        const v = view.camera.position
          .clone()
          .set(rng.range(-5.5, 5.5), rng.range(0.5, 4.5), game.wall.z)
          .project(view.camera);
        const style = rng.next();
        await flick(card.id, {
          endX: (v.x + 1) / 2,
          endY: (1 - v.y) / 2,
          ms: style < 0.15 ? 900 : style < 0.35 ? 260 : 80,
          settle: 600,
          carry: rng.next() < 0.5,
        });
        throws++;
      }
    } finally {
      window.removeEventListener('error', onError);
      console.error = originalError;
    }
    return { seconds, throws, errors, fallen: game.fallen, locked: game.lockedWords.map((l) => l.word), decoys: game.decoys.length };
  };
}
