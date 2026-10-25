// The wall: a grid of bricks. On screen it is one solid slab carrying the type
// animation; in physics each brick is its own body, so the decay scheduler
// can later release them one at a time. Layout is pure data.

// Returns one brick per cell: { index, col, row, x, y, z, w, h, d }, with
// (x, y, z) the brick centre. The wall is centred on x = 0 and stands on y = 0.
export function layoutWall({ cols, rows, brickWidth, brickHeight, z, depth }) {
  const bricks = [];
  const left = (-cols * brickWidth) / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      bricks.push({
        index: bricks.length,
        col,
        row,
        x: left + (col + 0.5) * brickWidth,
        y: (row + 0.5) * brickHeight,
        z: z - depth / 2,
        w: brickWidth,
        h: brickHeight,
        d: depth,
      });
    }
  }
  return bricks;
}

// Each brick is a fixed rigid body with a box collider.
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
