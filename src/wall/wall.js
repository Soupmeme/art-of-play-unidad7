// The wall: rows of letter-bricks typeset from the phrase, like lines of
// movable type. Layout is pure data; bodies are created separately.

import { PHRASE } from '../letters/letters.js';

// Returns one brick per letter: { index, row, char, x, y, z, w, h, d } with
// (x, y, z) the brick centre. Each row starts further into the phrase, which
// staggers the joints like a running bond.
export function layoutWall({ rows, rowHeight, width, z, depth, rowStartStep, advance }) {
  const bricks = [];
  for (let row = 0; row < rows; row++) {
    const rowBricks = [];
    let cursor = 0;
    let k = (row * rowStartStep) % PHRASE.length;
    for (;;) {
      const char = PHRASE[k % PHRASE.length];
      const w = advance(char);
      if (cursor + w > width) break;
      rowBricks.push({ char, left: cursor, w });
      cursor += w;
      k++;
    }
    const offset = -cursor / 2;
    for (const b of rowBricks) {
      bricks.push({
        index: bricks.length,
        row,
        char: b.char,
        x: offset + b.left + b.w / 2,
        y: row * rowHeight + rowHeight / 2,
        z: z - depth / 2,
        w: b.w,
        h: rowHeight,
        d: depth,
      });
    }
  }
  return bricks;
}

// Each brick is its own fixed rigid body (so the decay scheduler can later
// release one at a time) with a box collider: an approximation of the letter.
export function createBrickBodies(physics, bricks, { friction, restitution }) {
  const { rapier, world } = physics;
  const gap = 0.002;
  return bricks.map((b) => {
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(b.x, b.y, b.z));
    world.createCollider(
      rapier.ColliderDesc.cuboid(b.w / 2 - gap, b.h / 2 - gap, b.d / 2)
        .setFriction(friction)
        .setRestitution(restitution),
      body,
    );
    return body;
  });
}
