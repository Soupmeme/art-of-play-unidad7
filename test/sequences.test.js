// M3 acceptance as scripted sequences: real Rapier, seed 1, one game per
// sequence. Someone who knows the rules completes each word deliberately;
// wrong order never completes; partial progress shows; mis-anchored words
// stay unresolved. Measurements of the code, not playtests.
// Writes docs/reports/words.md.

import { describe, expect, it, afterAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createSession } from '../src/dev/scenario.js';
import { STATUS } from '../src/letters/letters.js';
import { FINALE } from '../src/config.js';

const FULL = { vx: 0, vy: -3.5 };
const CURVE_STRAIGHT = { vx: -2.5, vy: -3.5 }; // a left flick cancels the Curve letters' built-in spin
const ID = { A1: 0, R: 1, T: 2, O: 3, F: 4, P: 5, L: 6, A2: 7, Y: 8 };

const rows = [];
const f = (n) => n.toFixed(2);
function note(sequence, step, game, id) {
  const p = game.bodies[id].translation();
  const words = Object.entries(game.resolution.words)
    .map(([w, r]) => `${w} ${r.state}`)
    .join(', ');
  rows.push(`| ${sequence} | ${step} | ${game.letters[id].status} | ${f(p.x)}, ${f(p.y)}, ${f(p.z)} | ${words} |`);
}

// Where a letter must go, given an anchor letter already in the wall.
function slotFrom(game, word, anchorSlot, slot, anchorId) {
  const L = game.layout[word];
  const a = game.bodies[anchorId].translation();
  return { x: a.x + L[slot].dx - L[anchorSlot].dx, y: a.y - L[anchorSlot].dy + L[slot].dy };
}

describe('each word can be completed deliberately', () => {
  it('OF, ART, PLAY lock one after another, then the finale sets ART OF PLAY in one line', async () => {
    const s = await createSession();
    const g = s.game;
    const seq = 'full phrase';

    s.throwLetter({ letterId: ID.F, aim: { x: 1, y: 2.5 }, pointer: FULL });
    note(seq, 'F thrown hard: sticks (anchor of OF)', g, ID.F);
    expect(g.letters[ID.F].status).toBe(STATUS.stuck);
    s.throwLetter({ letterId: ID.O, aim: slotFrom(g, 'OF', 1, 0, ID.F), pointer: FULL });
    note(seq, 'O thrown at its slot left of F: pulled in, OF locks', g, ID.O);
    expect(g.resolution.words.OF.state).toBe('locked');

    s.throwLetter({ letterId: ID.A1, aim: { x: -3.5, y: 3.6 }, pointer: FULL });
    note(seq, 'A thrown hard: sticks (anchor of ART)', g, ID.A1);
    s.throwLetter({ letterId: ID.R, aim: slotFrom(g, 'ART', 0, 1, ID.A1), pointer: CURVE_STRAIGHT });
    note(seq, 'R thrown straight at its slot: pulled, hovers beside A (partial progress)', g, ID.R);
    expect(g.resolution.words.ART.state).toBe('pulling');
    s.throwLetter({ letterId: ID.T, aim: slotFrom(g, 'ART', 0, 2, ID.A1), pointer: FULL });
    note(seq, 'T thrown hard at its slot: pulled (does not stick), ART locks', g, ID.T);
    expect(g.resolution.words.ART.state).toBe('locked');

    s.throwLetter({ letterId: ID.L, aim: { x: 2.2, y: 1.2 }, pointer: FULL });
    note(seq, 'L thrown hard: sticks (anchor of PLAY)', g, ID.L);
    s.throwLetter({ letterId: ID.P, aim: slotFrom(g, 'PLAY', 1, 0, ID.L), pointer: CURVE_STRAIGHT });
    note(seq, 'P thrown straight at its slot left of L: pulled', g, ID.P);
    s.throwLetter({ letterId: ID.A2, aim: slotFrom(g, 'PLAY', 1, 2, ID.L), pointer: FULL });
    note(seq, 'second A at its slot right of L: pulled', g, ID.A2);
    s.throwLetter({ letterId: ID.Y, aim: slotFrom(g, 'PLAY', 1, 3, ID.L), pointer: FULL });
    note(seq, 'Y at its slot: PLAY locks, finale begins', g, ID.Y);
    expect(g.lockedWords.map((l) => l.word)).toEqual(['OF', 'ART', 'PLAY']);

    s.wait(FINALE.duration + 0.5);
    expect(g.finaleProgress).toBe(1);
    const xs = g.letters.map((l) => g.bodies[l.id].translation().x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]); // reads A R T O F P L A Y
    for (const l of g.letters) expect(g.bodies[l.id].translation().z).toBeCloseTo(FINALE.center.z);
    note(seq, 'finale: all nine on one line', g, ID.Y);
  }, 60000);

  it('a word with no anchor never forms: O and F lying in order stay warm on the table', async () => {
    const s = await createSession();
    const g = s.game;
    // A soft F lands on the table near the wall; an O dropped beside it, on its left, is pulled in.
    g.debugPlace(g.letters[ID.F], { x: 1, y: 0.02, z: -10 }, { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 });
    g.debugPlace(g.letters[ID.O], { x: -0.1, y: 0.02, z: -10.1 }, { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 });
    s.wait(3);
    note('no anchor', 'O and F lying flat in order, 1.1 apart: warm, but no pull and no lock (words need a stuck anchor)', g, ID.O);
    expect(g.resolution.words.OF.state).toBe('warm');
    expect(g.letters[ID.O].status).not.toBe(STATUS.locked);
  }, 30000);
});

describe('wrong order never completes', () => {
  it('O thrown to the right of a stuck F is not pulled and OF stays open', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.F, aim: { x: 0, y: 2.5 }, pointer: FULL });
    const wrong = slotFrom(g, 'OF', 1, 0, ID.F);
    s.throwLetter({ letterId: ID.O, aim: { x: 2 * g.bodies[ID.F].translation().x - wrong.x, y: wrong.y }, pointer: FULL });
    note('wrong order', 'O thrown at the mirror slot, right of F: nothing', g, ID.O);
    expect(g.resolution.letters[ID.O].pulled).toBe(false);
    expect(g.resolution.words.OF.state).not.toBe('locked');
    expect(g.letters[ID.O].status).not.toBe(STATUS.locked);
  }, 30000);
});

describe('mis-anchored words stay unresolved', () => {
  it('A and T stuck far too close: ART unresolvable, R is not pulled', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.A1, aim: { x: -1, y: 2.5 }, pointer: FULL });
    s.throwLetter({ letterId: ID.T, aim: { x: 0.2, y: 2.5 }, pointer: FULL }); // T's slot is about 2.1 right of A
    note('mis-anchored', 'A and T stuck 1.2 apart', g, ID.T);
    expect(g.letters[ID.T].status).toBe(STATUS.stuck);
    expect(g.resolution.words.ART.state).toBe('unresolvable');
    s.throwLetter({ letterId: ID.R, aim: { x: -0.1, y: 2.5 }, pointer: CURVE_STRAIGHT });
    note('mis-anchored', 'R thrown between them: not pulled, ART stays unresolvable', g, ID.R);
    expect(g.resolution.letters[ID.R].pulled).toBe(false);
    expect(g.resolution.words.ART.state).toBe('unresolvable');
  }, 30000);
});

afterAll(() => {
  mkdirSync('docs/reports', { recursive: true });
  writeFileSync(
    'docs/reports/words.md',
    [
      '# Word resolution sequences report',
      '',
      'Generated by `npm test` (test/sequences.test.js): scripted throws in one game per sequence, real Rapier, seed 1.',
      'Full power = an upward flick of 3.5 screen heights/s; Curve letters thrown "straight" use a left flick that cancels their built-in spin.',
      'These are measurements of the code, not playtest results.',
      '',
      '| sequence | step | letter status after | letter position (x, y, z) | words |',
      '|---|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
});
