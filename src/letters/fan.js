// The fan at rest: the cards held like a hand, in the given order. Pure
// layout, no physics. Cards are spaced along an arc by their own advance
// widths (times an overlap factor), with an extra gap at word starts (only
// used when the hand is in reading order), and squeezed if the hand would
// be wider than maxSpan.

export function fanLayout({ advances, wordStarts = [], center, radius, overlap, wordGap = 0, layerStep, sag = 1, maxSpan = Infinity }) {
  // Arc length position of each card centre.
  const s = [0];
  for (let i = 1; i < advances.length; i++) {
    const step = (overlap * (advances[i - 1] + advances[i])) / 2 + (wordStarts.includes(i) ? wordGap : 0);
    s.push(s[i - 1] + step);
  }
  const span = s[s.length - 1];
  const squeeze = span > maxSpan ? maxSpan / span : 1;
  const mid = span / 2;

  return s.map((arc, i) => {
    const theta = ((arc - mid) * squeeze) / radius; // negative on the left
    return {
      x: center.x + radius * Math.sin(theta),
      y: center.y - sag * radius * (1 - Math.cos(theta)),
      z: center.z + i * layerStep,
      angle: -theta, // rotation about z: left cards lean left, right cards lean right
    };
  });
}
