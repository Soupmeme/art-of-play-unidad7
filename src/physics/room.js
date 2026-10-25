// The room: table slab and boundaries. Static colliders, honest physics.
// The side and front boundaries are invisible "glass" at the edges of the
// view, so letters cannot leave the frame. The side boundaries follow the rails
// that are drawn on the table (DECISIONS, flag 5).

// Closed outline of the play area on the table, counter-clockwise from front-left.
export function roomOutline({ frontZ, backZ, nearX, farX }, wallZ) {
  return [
    { x: -nearX, z: frontZ },
    { x: -farX, z: wallZ },
    { x: -farX, z: backZ },
    { x: farX, z: backZ },
    { x: farX, z: wallZ },
    { x: nearX, z: frontZ },
  ];
}

export function createRoom(physics, room, wallZ) {
  const { rapier, world } = physics;
  const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());

  // Table top: upper face at y = 0.
  world.createCollider(
    rapier.ColliderDesc.cuboid(20, 0.5, 20)
      .setTranslation(0, -0.5, -8)
      .setFriction(room.tableFriction)
      .setRestitution(room.tableRestitution),
    body,
  );

  // One thin tall box per outline segment.
  const outline = roomOutline(room, wallZ);
  const halfThickness = 0.1;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx); // rotation about y that aligns local x with the segment
    world.createCollider(
      rapier.ColliderDesc.cuboid(length / 2 + halfThickness, room.height / 2, halfThickness)
        .setTranslation((a.x + b.x) / 2, room.height / 2, (a.z + b.z) / 2)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
        .setFriction(0.2)
        .setRestitution(0.3),
      body,
    );
  }
  return { body, outline };
}
