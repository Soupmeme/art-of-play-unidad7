// The word function (brief 5.5): the hidden rule, as a pure function.
// It reads plain letter data (status, position, rotation) and returns, per
// word, its state and the slot each letter should go to, and per letter its
// warmth and whether it is being pulled. No physics, no rendering: game.js
// turns the result into forces (NON-PHYSICAL, 4b) and locks.
//
// Rules, in order:
//   1. Assignment. Each letter serves the slot of its own character. The two
//      As are interchangeable: a locked word keeps its A; otherwise the pair
//      of choices (which A goes to ART, which to PLAY) with the lower total
//      distance to their neighbours wins; ties go to the lower id in ART.
//   2. Pairs. For every pair of neighbouring slots, both letters must be in
//      play (flying, on the table, stuck or locked). "In order" means the
//      right-hand letter is further along the camera's right axis.
//        warm    in order and closer than hintRadius; warmth rises to 1 at
//                the typeset spacing
//        pulling in order, closer than pullRadius, depth gap under depthTolerance
//      Wrong order gives nothing at all: cold is silence.
//   3. Slots. A word with a stuck member is laid out from that anchor (the
//      lowest slot if several); other stuck members must already sit within
//      snapDistance of their slots, otherwise the word is unresolvable. A
//      word with no anchor is laid out from its leader, the pulled member
//      nearest the group's centroid (kept from the last step while it still
//      qualifies), standing on the table.
//   4. Lock. When every member is in play and within snapDistance of its
//      slot, upright and facing the camera, the word is ready to lock.

import { rotate } from '../letters/effects.js';

export const IN_PLAY = new Set(['flying', 'onTable', 'stuck', 'locked']);
export const WORD_TEXTS = ['ART', 'OF', 'PLAY'];

const DEG = Math.PI / 180;
const BIG = 1e6;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// The plain data the word function reads. Runtime and tests both build it
// here, from a letter state (createLetterState) plus its body's pose.
export function letterSnapshot(letter, position, rotation) {
  return {
    id: letter.id,
    char: letter.char,
    status: letter.status,
    lockedWord: letter.lockedWord,
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
  };
}

// Is the letter upright and facing the camera, within `angle` degrees?
export function isAligned(rotation, angle) {
  const n = rotate(rotation, { x: 0, y: 0, z: 1 });
  const xAxis = rotate(rotation, { x: 1, y: 0, z: 0 });
  const tilt = Math.abs(Math.atan2(xAxis.y, xAxis.x));
  return n.z >= Math.cos(angle * DEG) && tilt <= angle * DEG;
}

function assign(letters) {
  const byChar = {};
  for (const l of letters) (byChar[l.char] ??= []).push(l);
  const as = (byChar.A ?? []).slice().sort((a, b) => a.id - b.id);
  const one = (c) => byChar[c]?.[0] ?? null;
  const live = (l) => l && IN_PLAY.has(l.status);
  const near = (a, b) => (live(a) && live(b) ? dist(a.position, b.position) : BIG);

  let artA = as[0] ?? null;
  let playA = as[1] ?? null;
  const reserved = as.find((a) => a.lockedWord);
  if (reserved) {
    artA = reserved.lockedWord === 'ART' ? reserved : as.find((a) => a !== reserved);
    playA = reserved.lockedWord === 'PLAY' ? reserved : as.find((a) => a !== reserved);
  } else if (as.length === 2) {
    const cost = (inArt, inPlay) =>
      near(inArt, one('R')) + Math.min(near(inPlay, one('L')), near(inPlay, one('Y')));
    if (cost(as[1], as[0]) < cost(as[0], as[1])) {
      artA = as[1];
      playA = as[0];
    }
  }
  return {
    ART: [artA, one('R'), one('T')],
    OF: [one('O'), one('F')],
    PLAY: [one('P'), one('L'), playA, one('Y')],
  };
}

// Warmth by the same rule as a real pair: 0 at hintRadius, 1 at the typeset spacing.
function pairWarmth(d, ordered, spacing, params) {
  return ordered && d < params.hintRadius ? Math.min(1, Math.max(0, (params.hintRadius - d) / (params.hintRadius - spacing))) : 0;
}

// For a decoy (Kiwi's amendment): how warm it would be if it were real, from
// the real letters that would be its neighbours. Used only for the decoy's
// tell, which grows as it nears the slot it pretends to fill. It never pulls.
export function impostorWarmth(decoy, letters, { params, layout, right = { x: 1, y: 0, z: 0 } }) {
  let best = 0;
  for (const text of WORD_TEXTS) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== decoy.char) continue;
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= text.length) continue;
        const spacing = Math.hypot(layout[text][j].dx - layout[text][i].dx, layout[text][j].dy - layout[text][i].dy);
        for (const n of letters) {
          if (n.char !== text[j] || !IN_PLAY.has(n.status)) continue;
          const rel = j > i ? sub(n.position, decoy.position) : sub(decoy.position, n.position);
          const d = Math.hypot(rel.x, rel.y, rel.z);
          best = Math.max(best, pairWarmth(d, dot(rel, right) > 0, spacing, params));
        }
      }
    }
  }
  return best;
}

export function resolveWords(letters, { params, layout, right = { x: 1, y: 0, z: 0 }, forward = { x: 0, y: 0, z: -1 }, previousLeaders = {} }) {
  const members = assign(letters);
  const words = {};
  const perLetter = {};
  for (const l of letters) perLetter[l.id] = { word: null, slot: null, warmth: 0, pulled: false, target: null };

  for (const text of WORD_TEXTS) {
    const slots = members[text];
    const typeset = layout[text];
    slots.forEach((l, i) => {
      if (l) Object.assign(perLetter[l.id], { word: text, slot: i });
    });
    const live = slots.map((l) => !!l && IN_PLAY.has(l.status));

    if (slots.every((l) => l && l.status === 'locked')) {
      words[text] = { state: 'locked', members: slots.map((l) => l.id), pairs: [], slots: null, anchor: null, leader: null };
      continue;
    }

    // Pairs of neighbouring slots.
    const pairs = [];
    for (let i = 0; i < slots.length - 1; i++) {
      if (!live[i] || !live[i + 1]) continue;
      const a = slots[i];
      const b = slots[i + 1];
      const rel = sub(b.position, a.position);
      const d = Math.hypot(rel.x, rel.y, rel.z);
      const ordered = dot(rel, right) > 0;
      const spacing = Math.hypot(typeset[i + 1].dx - typeset[i].dx, typeset[i + 1].dy - typeset[i].dy);
      const warmth = pairWarmth(d, ordered, spacing, params);
      const pulling = ordered && d < params.pullRadius && Math.abs(dot(rel, forward)) < params.depthTolerance;
      pairs.push({ a: a.id, b: b.id, slots: [i, i + 1], distance: d, ordered, warmth, pulling });
    }

    // Anchor or leader, and the slot positions laid out from it.
    const stuck = slots.map((l, i) => (live[i] && l.status === 'stuck' ? i : -1)).filter((i) => i >= 0);
    const pulledSlots = new Set();
    for (const p of pairs) if (p.pulling) p.slots.forEach((i) => pulledSlots.add(i));

    let base = null; // { slot, position }
    let anchor = null;
    let leader = null;
    if (stuck.length) {
      anchor = slots[stuck[0]].id;
      base = { slot: stuck[0], position: slots[stuck[0]].position, anchored: true };
    } else if (pulledSlots.size) {
      const group = [...pulledSlots];
      const centroid = group.reduce(
        (c, i) => ({ x: c.x + slots[i].position.x / group.length, y: c.y + slots[i].position.y / group.length, z: c.z + slots[i].position.z / group.length }),
        { x: 0, y: 0, z: 0 },
      );
      const keep = group.find((i) => slots[i].id === previousLeaders[text]);
      const pick =
        keep ??
        group.reduce((best, i) => (dist(slots[i].position, centroid) < dist(slots[best].position, centroid) ? i : best), Math.min(...group));
      leader = slots[pick].id;
      base = { slot: pick, position: slots[pick].position, anchored: false };
    }

    let slotPositions = null;
    if (base) {
      const t0 = typeset[base.slot];
      const baseline = base.anchored ? base.position.y - t0.dy : Math.max(base.position.y - t0.dy, params.tableBaseline);
      slotPositions = typeset.map((t, i) => ({
        x: base.position.x + (t.dx - t0.dx) * right.x,
        y: baseline + t.dy,
        z: base.position.z + (base.anchored && i !== base.slot ? params.wallGap : 0),
      }));
      if (base.anchored) slotPositions[base.slot] = { ...base.position };
    }

    // Other anchors must already be where the word needs them.
    const unresolvable =
      stuck.length > 1 && stuck.slice(1).some((i) => dist(slots[i].position, slotPositions[i]) > params.snapDistance);

    const pulled = unresolvable ? [] : [...pulledSlots].filter((i) => slots[i].status !== 'stuck');

    const ready =
      !unresolvable &&
      slotPositions !== null &&
      live.every(Boolean) &&
      pairs.every((p) => p.ordered) &&
      slots.every(
        (l, i) =>
          l.status === 'stuck' ||
          (dist(l.position, slotPositions[i]) <= params.snapDistance && isAligned(l.rotation, params.alignAngle)),
      );

    for (const p of pairs) {
      for (const id of [p.a, p.b]) perLetter[id].warmth = Math.max(perLetter[id].warmth, p.warmth);
    }
    for (const i of pulled) Object.assign(perLetter[slots[i].id], { pulled: true, target: slotPositions[i] });

    const state = unresolvable
      ? 'unresolvable'
      : ready
        ? 'ready'
        : pulled.length
          ? 'pulling'
          : pairs.some((p) => p.warmth > 0)
            ? 'warm'
            : 'cold';
    words[text] = { state, members: slots.map((l) => l?.id ?? null), pairs, slots: slotPositions, anchor, leader };
  }

  return { words, letters: perLetter };
}
