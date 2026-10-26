// The opening of a round (Kiwi, 2026-10-25). NON-PHYSICAL (4d): staging.
// Pure functions: the shuffled hand, and a keyframe track per card for the
// dealer's shuffle (split, riffle, deal). game.js plays the tracks on
// kinematic bodies; the renderer reads the fade and camera push.

import { createRng } from '../core/rng.js';

// Neighbouring letters that belong together in reading order. A hand that
// showed one of these side by side would hint at the answer.
const HINT_PAIRS = new Set(['AR', 'RT', 'OF', 'PL', 'LA', 'AY']);

export function hasHintPair(chars) {
  for (let i = 1; i < chars.length; i++) if (HINT_PAIRS.has(chars[i - 1] + chars[i])) return true;
  return false;
}

// cards: [{ id, char }]. Returns card ids in hand order (left to right): a
// seeded random permutation with no hint pair side by side (Fisher-Yates,
// redrawn until clean; with 10 or 11 cards a clean order turns up in a few tries).
export function shuffleHand(cards, seed, maxTries = 500) {
  const rng = createRng(seed);
  let order = cards.map((c) => c.id);
  const charOf = new Map(cards.map((c) => [c.id, c.char]));
  for (let attempt = 0; attempt < maxTries; attempt++) {
    order = cards.map((c) => c.id);
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.int(0, i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (!hasHintPair(order.map((id) => charOf.get(id)))) return order;
  }
  return order;
}

const smooth = (t) => t * t * (3 - 2 * t);
const quatZ = (angle) => ({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) });

// Keyframe tracks for the dealer's shuffle.
//   deckOrder: card ids from the bottom of the deck to the top (the deck
//              starts in this order);
//   handOrder: card ids in hand order;
//   fan:       hand poses { x, y, z, angle } by hand slot.
// Each track is a list of { t, position, angle, hop }: the card sits at a
// keyframe until the next one, and `hop` marks a move that arcs upward.
export function openingTracks({ deckOrder, handOrder, fan, params }) {
  const { deck, split, halfOffset, riffleStep, dealStep, flight } = params;
  const n = deckOrder.length;
  const layer = 0.012; // card thickness in the pile, so cards do not overlap
  const pile = (k, x = deck.x) => ({ x, y: deck.y, z: deck.z + k * layer });
  const tracks = new Map(deckOrder.map((id, k) => [id, [{ t: 0, position: pile(k), angle: 0, hop: false }]]));

  // Split: the bottom half slides left, the top half right.
  const half = Math.ceil(n / 2);
  deckOrder.forEach((id, k) => {
    const left = k < half;
    tracks.get(id).push({ t: split, position: pile(left ? k : k - half, deck.x + (left ? -halfOffset : halfOffset)), angle: left ? 0.12 : -0.12, hop: false });
  });

  // Riffle: the cards drop back onto the centre pile, so that the card dealt
  // last (the hand's last slot) is at the bottom and the first on top.
  const riffleStart = split + 0.1;
  const riffleOrder = [...handOrder].reverse();
  riffleOrder.forEach((id, k) => {
    const track = tracks.get(id);
    const land = riffleStart + k * riffleStep + flight;
    track.push({ ...track[track.length - 1], t: land - flight, hop: false }); // wait in its half
    track.push({ t: land, position: pile(k), angle: 0, hop: true });
  });

  // Deal: from the top of the pile into the hand, left to right.
  const dealStart = riffleStart + (n - 1) * riffleStep + flight + 0.25;
  handOrder.forEach((id, slot) => {
    const track = tracks.get(id);
    const leave = dealStart + slot * dealStep;
    track.push({ ...track[track.length - 1], t: leave, hop: false }); // wait on the pile
    const p = fan[slot];
    track.push({ t: leave + flight, position: { x: p.x, y: p.y, z: p.z }, angle: p.angle, hop: true });
  });

  const duration = dealStart + (n - 1) * dealStep + flight;
  return { tracks, duration };
}

// Pose of a card on its track at time t.
export function trackPose(track, t, lift) {
  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i++;
  const a = track[i];
  const b = track[i + 1];
  if (!b) return { position: { ...a.position }, rotation: quatZ(a.angle) };
  const k = smooth(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1))));
  const arc = b.hop ? lift * Math.sin(Math.PI * k) : 0;
  return {
    position: {
      x: a.position.x + (b.position.x - a.position.x) * k,
      y: a.position.y + (b.position.y - a.position.y) * k + arc,
      z: a.position.z + (b.position.z - a.position.z) * k + arc * 0.4, // hops come a little toward the camera
    },
    rotation: quatZ(a.angle + (b.angle - a.angle) * k),
  };
}

// Fade from black and camera push, both 1 at the start, 0 when settled.
export function openingCurtain(t, { fade, dolly }) {
  return {
    black: 1 - smooth(Math.min(1, t / fade)),
    push: 1 - smooth(Math.min(1, t / dolly)),
  };
}
