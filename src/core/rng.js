// Seeded randomness. Every random choice in the project goes through here so a
// scenario can be replayed from its seed (brief 7.2).

// FNV-1a hash of a string to a 32-bit unsigned integer.
function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Derives an independent seed for a named subsystem ("decay", "sway", ...),
// so retuning one subsystem does not shift another subsystem's sequence.
export function deriveSeed(seed, streamName) {
  return (hashString(streamName) ^ Math.imul(seed >>> 0, 0x9e3779b1)) >>> 0;
}

// mulberry32: a small, well known 32-bit PRNG. Returns floats in [0, 1).
export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, maxExclusive) => min + Math.floor(next() * (maxExclusive - min)),
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}
