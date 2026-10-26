// Dev only: a scripted flick that drives the real input path with synthetic
// pointer events, then records where the letter went. Used from the console:
//   await aop.flick(2, { endX: 0.5, endY: 0.3, ms: 100 })
// endX, endY are the release point as fractions of the canvas; ms is how long
// the flick takes after a 300 ms hold.

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createFlick({ canvas, camera, game }) {
  // carry: first move the letter slowly to just below the release point (as a
  // deliberate player would), so the flick itself is a short straight upward one.
  return async function flick(id, { endX, endY, ms = 120, steps = 8, settle = 2500, carry = false } = {}) {
    const rect = canvas.getBoundingClientRect();
    // Press on ink, not on the body centre (which can fall in a counter, as in
    // O). In the fan, later cards cover the right side of earlier ones, so
    // press on the leftmost ink there.
    const body = game.bodies[id];
    const boxes = game.forms[id].boxes;
    let point;
    if (game.card(id).status === 'inFan') {
      const box = boxes.reduce((a, b) => (b.x - b.halfWidth < a.x - a.halfWidth ? b : a));
      point = { x: box.x - box.halfWidth + Math.min(0.08, box.halfWidth), y: box.y };
    } else {
      point = boxes.reduce((a, b) => (b.halfWidth * b.halfHeight > a.halfWidth * a.halfHeight ? b : a));
    }
    const v = camera.position
      .clone()
      .set(point.x, point.y, 0)
      .applyQuaternion(body.rotation())
      .add(body.translation())
      .project(camera);
    const sx = rect.left + ((v.x + 1) / 2) * rect.width;
    const sy = rect.top + ((1 - v.y) / 2) * rect.height;
    const ex = rect.left + endX * rect.width;
    const ey = rect.top + endY * rect.height;
    const event = (x, y) => ({ clientX: x, clientY: y, pointerId: 77, button: 0, bubbles: true, pointerType: 'mouse' });

    canvas.dispatchEvent(new PointerEvent('pointerdown', event(sx, sy)));
    const grabbed = game.card(id).status === 'held';
    await wait(300);
    let fx = sx;
    let fy = sy;
    if (carry) {
      const cx = ex;
      const cy = Math.min(rect.bottom - 4, ey + rect.height * 0.25);
      for (let i = 1; i <= 25; i++) {
        await wait(24);
        canvas.dispatchEvent(new PointerEvent('pointermove', event(sx + ((cx - sx) * i) / 25, sy + ((cy - sy) * i) / 25)));
      }
      await wait(150);
      fx = cx;
      fy = cy;
    }
    for (let i = 1; i <= steps; i++) {
      await wait(ms / steps);
      canvas.dispatchEvent(new PointerEvent('pointermove', event(fx + ((ex - fx) * i) / steps, fy + ((ey - fy) * i) / steps)));
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
      letter: game.card(id).char,
      grabbed,
      kind: plan?.kind,
      power: plan && +plan.power.toFixed(2),
      aim: plan?.target && { x: +plan.target.x.toFixed(2), y: +plan.target.y.toFixed(2) },
      spin: plan?.spin && +plan.spin.toFixed(1),
      wallHit,
      rest: { x: +q.x.toFixed(2), y: +q.y.toFixed(2), z: +q.z.toFixed(2) },
      status: game.card(id).status,
    };
  };
}
