// Dev only: a scripted flick that drives the real input path with synthetic
// pointer events, then records where the letter went. Used from the console:
//   await aop.flick(2, { endX: 0.5, endY: 0.3, ms: 100 })
// endX, endY are the release point as fractions of the canvas; ms is how long
// the flick takes after a 300 ms hold.

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createFlick({ canvas, camera, game }) {
  return async function flick(id, { endX, endY, ms = 120, steps = 8, settle = 2500 } = {}) {
    const rect = canvas.getBoundingClientRect();
    // Press on ink, not on the body centre (which can fall in a counter, as in O).
    const body = game.bodies[id];
    const box = game.forms[id].boxes.reduce((a, b) => (b.halfWidth * b.halfHeight > a.halfWidth * a.halfHeight ? b : a));
    const v = camera.position
      .clone()
      .set(box.x, box.y, 0)
      .applyQuaternion(body.rotation())
      .add(body.translation())
      .project(camera);
    const sx = rect.left + ((v.x + 1) / 2) * rect.width;
    const sy = rect.top + ((1 - v.y) / 2) * rect.height;
    const ex = rect.left + endX * rect.width;
    const ey = rect.top + endY * rect.height;
    const event = (x, y) => ({ clientX: x, clientY: y, pointerId: 77, button: 0, bubbles: true, pointerType: 'mouse' });

    canvas.dispatchEvent(new PointerEvent('pointerdown', event(sx, sy)));
    const grabbed = game.letters[id].status === 'held';
    await wait(300);
    for (let i = 1; i <= steps; i++) {
      await wait(ms / steps);
      canvas.dispatchEvent(new PointerEvent('pointermove', event(sx + ((ex - sx) * i) / steps, sy + ((ey - sy) * i) / steps)));
    }
    canvas.dispatchEvent(new PointerEvent('pointerup', event(ex, ey)));
    const plan = game.lastPlan;

    let wallHit = null;
    const start = performance.now();
    while (performance.now() - start < settle) {
      await wait(16);
      const q = game.bodies[id].translation();
      if (!wallHit && q.z < game.wall.z + 0.1) wallHit = { x: +q.x.toFixed(2), y: +q.y.toFixed(2) };
    }
    const q = game.bodies[id].translation();
    return {
      letter: game.letters[id].char,
      grabbed,
      kind: plan?.kind,
      power: plan && +plan.power.toFixed(2),
      aim: plan?.target && { x: +plan.target.x.toFixed(2), y: +plan.target.y.toFixed(2) },
      spin: plan?.spin && +plan.spin.toFixed(1),
      wallHit,
      rest: { x: +q.x.toFixed(2), y: +q.y.toFixed(2), z: +q.z.toFixed(2) },
      status: game.letters[id].status,
    };
  };
}
