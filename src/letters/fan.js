// The fan at rest: nine letters held like a hand of cards, in reading order.
// Pure layout, no physics. Letters are spaced along an arc by their own
// advance widths (times an overlap factor), with an extra gap between words.

export function fanLayout({ advances, wordStarts, center, radius, overlap, wordGap, layerStep }) {
  // Arc length position of each letter centre.
  const s = [0];
  for (let i = 1; i < advances.length; i++) {
    const step = (overlap * (advances[i - 1] + advances[i])) / 2 + (wordStarts.includes(i) ? wordGap : 0);
    s.push(s[i - 1] + step);
  }
  const mid = (s[0] + s[s.length - 1]) / 2;

  return s.map((arc, i) => {
    const theta = (arc - mid) / radius; // negative on the left
    return {
      x: center.x + radius * Math.sin(theta),
      y: center.y - radius * (1 - Math.cos(theta)),
      z: center.z + i * layerStep,
      angle: -theta, // rotation about z: left cards lean left, right cards lean right
    };
  });
}
