// The letter effect rules (brief 5.4) as pure functions on plain vectors.
// NON-PHYSICAL (4a): each is a force, impulse or constraint layered on top of
// real physics; game.js applies them to Rapier bodies. Tested in test/effects.test.js.

const DEG = Math.PI / 180;
const len = (v) => Math.hypot(v.x, v.y, v.z);

// Rotates vector v by quaternion q.
export function rotate(q, v) {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

function multiply(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

// The letter's face normal (its local +z, the side that faces the camera in the fan).
export function faceNormal(q) {
  return rotate(q, { x: 0, y: 0, z: 1 });
}

// STICK. On contact with the wall (whose normal is +z), the letter embeds when
// it arrives fast enough, head-on enough, and face-first enough.
export function stickCheck(velocity, rotation, { minSpeed, approachCone, faceCone }) {
  const speed = len(velocity);
  const approach = speed > 0 && velocity.z < 0 ? Math.acos(Math.min(1, -velocity.z / speed)) / DEG : 180;
  const face = Math.acos(Math.min(1, Math.abs(faceNormal(rotation).z))) / DEG;
  return {
    stick: speed >= minSpeed && approach <= approachCone && face <= faceCone,
    speed,
    approach,
    face,
  };
}

// The embedded pose: pressed into the wall face and turned flat against it,
// keeping the letter's tilt within its own plane.
export function embedPose(position, rotation, wallZ, thickness, bite) {
  const n = faceNormal(rotation);
  const target = { x: 0, y: 0, z: n.z >= 0 ? 1 : -1 };
  // Shortest rotation taking n onto target, applied on top of the current rotation.
  const cross = { x: n.y * target.z - n.z * target.y, y: n.z * target.x - n.x * target.z, z: n.x * target.y - n.y * target.x };
  const dot = n.x * target.x + n.y * target.y + n.z * target.z;
  const align = { x: cross.x, y: cross.y, z: cross.z, w: 1 + dot };
  const norm = Math.hypot(align.x, align.y, align.z, align.w);
  const flat = multiply({ x: align.x / norm, y: align.y / norm, z: align.z / norm, w: align.w / norm }, rotation);
  return {
    position: { x: position.x, y: position.y, z: wallZ + thickness / 2 - bite },
    rotation: flat,
  };
}

// CURVE. While a Curve letter is in the air (released and not yet touching
// anything), it is pushed sideways along the camera's right axis (+x) by
//   a = gain x spin x speed
// where spin is its spin in its own plane. Clockwise spin, as the camera sees
// it, hooks right. A stylized Magnus force (DECISIONS: "Embed look and Curve force").
export function curveAcceleration(velocity, angularVelocity, rotation, gain) {
  const n = faceNormal(rotation);
  const sign = n.z >= 0 ? 1 : -1;
  const spin = (angularVelocity.x * n.x + angularVelocity.y * n.y + angularVelocity.z * n.z) * sign;
  return { x: -gain * spin * len(velocity), y: 0, z: 0 };
}

// RIPPLE. On impact, every other free letter within `radius` gets a velocity
// change away from the impact point, falling off as 1/d, with some lift so
// letters lying flat hop instead of only scraping along the felt.
//   others: [{ id, position }]  ->  [{ id, deltaV }]
export function rippleKicks(impact, others, { radius, strength, minDistance, lift }) {
  const kicks = [];
  for (const { id, position } of others) {
    const dx = position.x - impact.x;
    const dz = position.z - impact.z;
    const d = Math.hypot(dx, position.y - impact.y, dz);
    if (d > radius) continue;
    const flat = Math.hypot(dx, dz) || 1;
    const magnitude = strength / Math.max(d, minDistance);
    kicks.push({
      id,
      distance: d,
      deltaV: { x: (dx / flat) * magnitude, y: lift * magnitude, z: (dz / flat) * magnitude },
    });
  }
  return kicks;
}

// Bricks a Ripple impact on the wall shakes, with the stress each receives
// (linear falloff). Stored now; the decay scheduler (M4) turns stress into
// earlier release, so nudging has a cost.
export function rippleShake(impact, bricks, { shakeRadius, shakeAmount }) {
  const out = [];
  for (const b of bricks) {
    const d = Math.hypot(b.x - impact.x, b.y - impact.y);
    if (d <= shakeRadius) out.push({ index: b.index, stress: shakeAmount * (1 - d / shakeRadius) });
  }
  return out;
}
