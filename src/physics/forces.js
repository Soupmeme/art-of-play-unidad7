// Forces that are part of honest physics: air drag and the hold constraint.
// Each is applied as an impulse (force x dt) before the physics step.

// Quadratic air drag, the same for every letter: a = -c |v| v (Nature of Code ch. 2).
export function applyAirDrag(body, coefficient, dt) {
  const v = body.linvel();
  const speed = Math.hypot(v.x, v.y, v.z);
  if (speed < 1e-4) return;
  const k = -coefficient * speed * body.mass() * dt;
  body.applyImpulse({ x: k * v.x, y: k * v.y, z: k * v.z }, true);
}

// The held-letter constraint, as a Reynolds "arrive" steering force: the
// desired velocity points at the target and slows down inside slowRadius;
// the steering force is desired minus current velocity, limited to maxAccel.
export function steerArrive(body, target, { maxSpeed, slowRadius, maxAccel }, dt) {
  const p = body.translation();
  const v = body.linvel();
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dz = target.z - p.z;
  const dist = Math.hypot(dx, dy, dz);
  const speed = dist < slowRadius ? (maxSpeed * dist) / slowRadius : maxSpeed;
  const scale = dist > 1e-6 ? speed / dist : 0;
  let sx = dx * scale - v.x;
  let sy = dy * scale - v.y;
  let sz = dz * scale - v.z;
  const limit = maxAccel * dt;
  const mag = Math.hypot(sx, sy, sz);
  if (mag > limit) {
    sx *= limit / mag;
    sy *= limit / mag;
    sz *= limit / mag;
  }
  const m = body.mass();
  body.applyImpulse({ x: sx * m, y: sy * m, z: sz * m }, true);
}

// Turns a held letter upright and facing the camera (identity rotation):
// the target angular velocity is proportional to the remaining rotation, and
// the actual angular velocity eases toward it.
export function steerUpright(body, { uprightGain, uprightBlend }, dt) {
  const q = body.rotation();
  // Error rotation from current to identity is the conjugate of q.
  let { x, y, z, w } = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
    w = -w;
  }
  const angle = 2 * Math.acos(Math.min(1, w));
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  const k = s > 1e-6 ? (angle * uprightGain) / s : 0;
  const target = { x: x * k, y: y * k, z: z * k };
  const current = body.angvel();
  const blend = Math.min(1, uprightBlend * dt);
  body.setAngvel(
    {
      x: current.x + (target.x - current.x) * blend,
      y: current.y + (target.y - current.y) * blend,
      z: current.z + (target.z - current.z) * blend,
    },
    true,
  );
}
