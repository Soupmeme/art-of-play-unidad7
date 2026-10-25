// The 2D-to-3D throw mapping, as pure functions (tested in test/throwMapping.test.js).
//
//   aim      = the point on the wall under the cursor at release
//   power    = recent pointer speed, mapped between dropSpeed and fullSpeed
//   launch   = speed between minLaunch and maxLaunch, by power
//   elevation is solved so a full-power throw arrives at the aim point;
//             weaker throws use the same direction and fall short
//   spin     = sideways pointer velocity, as spin in the card's own plane
//
// Pointer samples are { t (ms), x, y } in screen heights, y pointing down.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Average pointer velocity over the last windowMs, from the position at the
// start of the window (interpolated) to the latest sample.
export function pointerVelocity(samples, windowMs) {
  const zero = { vx: 0, vy: 0, speed: 0 };
  if (samples.length < 2) return zero;
  const last = samples[samples.length - 1];
  const cutoff = last.t - windowMs;

  let start = samples[0];
  for (let i = samples.length - 1; i > 0; i--) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.t <= cutoff && b.t >= cutoff) {
      const f = b.t === a.t ? 0 : (cutoff - a.t) / (b.t - a.t);
      start = { t: cutoff, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      break;
    }
  }
  const dt = (last.t - start.t) / 1000;
  if (dt <= 0) return zero;
  const vx = (last.x - start.x) / dt;
  const vy = (last.y - start.y) / dt;
  return { vx, vy, speed: Math.hypot(vx, vy) };
}

// Lowest launch angle that hits a point `dx` away horizontally and `dy` up at
// launch speed v under gravity g. Null when the point is out of range.
export function ballisticElevation(dx, dy, v, g) {
  const v2 = v * v;
  const disc = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
  if (disc < 0 || dx <= 0) return null;
  return Math.atan((v2 - Math.sqrt(disc)) / (g * dx));
}

// Decides what a release does. `from` is the letter position, `target` the aim
// point on the wall, `pointer` the result of pointerVelocity.
export function planThrow({ pointer, from, target, params, gravity }) {
  if (pointer.speed < params.dropSpeed) {
    return { kind: 'drop', power: 0, pointerSpeed: pointer.speed };
  }
  const power = clamp((pointer.speed - params.dropSpeed) / (params.fullSpeed - params.dropSpeed), 0, 1);
  const launchSpeed = params.minLaunch + (params.maxLaunch - params.minLaunch) * power;

  const hx = target.x - from.x;
  const hz = target.z - from.z;
  const horizontal = Math.hypot(hx, hz);
  const g = gravity * params.gravityComp;
  const elevation = ballisticElevation(horizontal, target.y - from.y, params.maxLaunch, g) ?? Math.PI / 4;

  const cos = Math.cos(elevation);
  const ux = horizontal > 0 ? hx / horizontal : 0;
  const uz = horizontal > 0 ? hz / horizontal : -1;
  const linvel = {
    x: ux * cos * launchSpeed,
    y: Math.sin(elevation) * launchSpeed,
    z: uz * cos * launchSpeed,
  };

  // Flicking to the right spins the card clockwise as the camera sees it
  // (negative rotation about +z, the axis pointing at the camera).
  const spin = clamp(-params.spinGain * pointer.vx, -params.maxSpin, params.maxSpin);

  return {
    kind: 'throw',
    power,
    pointerSpeed: pointer.speed,
    launchSpeed,
    elevation,
    spin,
    linvel,
    angvel: { x: 0, y: 0, z: spin },
    target,
  };
}

// Keeps the aim point on the wall face, inside its edges.
export function clampAim(point, { halfWidth, top, inset }) {
  return {
    x: clamp(point.x, -halfWidth + inset, halfWidth - inset),
    y: clamp(point.y, inset, top - inset),
    z: point.z,
  };
}
