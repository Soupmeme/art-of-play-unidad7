// The finale (brief 5.7). NON-PHYSICAL (4d): the one place where letters are
// moved kinematically. When all three words are locked, they glide into one
// line, ART OF PLAY, light up a little more, and hold.

const WORDS = ['ART', 'OF', 'PLAY'];

// Target centres for every letter of the line: { ART: [{x, y, z}], OF: [...], PLAY: [...] }.
// layout: wordLayout per word (dx, dy, halfWidth per letter).
export function finaleLayout(layout, { center, wordGap }) {
  const widths = WORDS.map((w) => {
    const l = layout[w];
    return l[l.length - 1].dx + l[l.length - 1].halfWidth + l[0].halfWidth;
  });
  const total = widths.reduce((a, b) => a + b, 0) + wordGap * (WORDS.length - 1);
  let cursor = center.x - total / 2;
  const out = {};
  WORDS.forEach((w, i) => {
    const firstCentre = cursor + layout[w][0].halfWidth;
    out[w] = layout[w].map((t) => ({ x: firstCentre + t.dx, y: center.y + t.dy, z: center.z }));
    cursor += widths[i] + wordGap;
  });
  return out;
}

const smooth = (t) => t * t * (3 - 2 * t);

// Normalised linear blend between two rotations (short way round).
function nlerp(a, b, t) {
  const sign = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w < 0 ? -1 : 1;
  const q = {
    x: a.x + (sign * b.x - a.x) * t,
    y: a.y + (sign * b.y - a.y) * t,
    z: a.z + (sign * b.z - a.z) * t,
    w: a.w + (sign * b.w - a.w) * t,
  };
  const n = Math.hypot(q.x, q.y, q.z, q.w);
  return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
}

// Pose of one letter at time t since the finale began.
export function finalePose(from, to, t, duration) {
  const k = smooth(Math.min(1, Math.max(0, t / duration)));
  return {
    position: {
      x: from.position.x + (to.position.x - from.position.x) * k,
      y: from.position.y + (to.position.y - from.position.y) * k,
      z: from.position.z + (to.position.z - from.position.z) * k,
    },
    rotation: nlerp(from.rotation, to.rotation, k),
  };
}
