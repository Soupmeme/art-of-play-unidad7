// Decoys: extra letter-cards the wall sheds (Kiwi's amendment, 2026-10-25).
// NON-PHYSICAL (4e). Pure rules here; game.js applies them.
//
//   - Shedding: a seeded schedule of play time decides when the wall pops a
//     decoy out, which letter it is and where.
//   - A decoy obeys its letter's family (a decoy R curves), but the word
//     function never sees it: it never warms, pulls or locks.
//   - The tell is graded: faint at rest, stronger while held, strongest near
//     the slot it pretends to fill.
//   - It never stays: stuck in the wall it melts back into the type; loose,
//     it erodes away at the end of its lifetime.

import { createRng, deriveSeed } from '../core/rng.js';
import { FAMILY_OF } from './families.js';

export function createDecoyState(id, char) {
  return {
    id,
    char,
    family: FAMILY_OF[char],
    status: 'flying',
    restTime: 0,
    airborne: false,
    stuckTo: null,
    lockedWord: null,
    decoy: true,
    age: 0, // seconds alive, paused while held
    meltAge: null, // seconds since it stuck in the wall
    tell: 0,
    erosion: 0,
  };
}

// The shed schedule. due(playTime, room) returns a decoy spec when one is due
// and there is room for it, else null. Same seed and same calls, same decoys.
export function createShedder(seed, params, wall) {
  const rng = createRng(deriveSeed(seed, 'shed'));
  let next = params.firstAfter;
  return {
    due(playTime, room) {
      if (playTime < next) return null;
      if (!room) {
        next = playTime + 2; // the wall tries again shortly
        return null;
      }
      next = playTime + rng.range(params.intervalMin, params.intervalMax);
      return {
        char: rng.pick([...params.chars]),
        x: rng.range(-wall.halfWidth + 1, wall.halfWidth - 1),
        y: rng.range(1, wall.top - 0.8),
        spin: rng.range(-3, 3),
      };
    },
    get next() {
      return next;
    },
  };
}

// How broken up a decoy looks right now.
export function decoyTell({ held, impostorWarmth }, { tellBase, tellHeld }) {
  return Math.min(1, Math.max(tellBase, held ? tellHeld : 0, impostorWarmth));
}

// How far a decoy has eroded (0 whole, 1 gone).
export function decoyErosion({ age, meltAge }, { lifetime, erodeTime, meltTime }) {
  if (meltAge !== null) return Math.min(1, meltAge / meltTime);
  return Math.min(1, Math.max(0, (age - (lifetime - erodeTime)) / erodeTime));
}
