// Decoys (Kiwi's amendment): the pure rules, then behaviour in real Rapier.
// Measurements of the code, not playtests.

import { describe, expect, it, afterEach } from 'vitest';
import { createShedder, decoyTell, decoyErosion, createDecoyState } from '../src/letters/decoys.js';
import { impostorWarmth, letterSnapshot } from '../src/words/resolve.js';
import { createLetters, STATUS } from '../src/letters/letters.js';
import { wordLayout } from '../src/letters/glyphs.js';
import { createSession } from '../src/dev/scenario.js';
import { DECOYS, WORD_RULES, WALL } from '../src/config.js';

const UPRIGHT = { x: 0, y: 0, z: 0, w: 1 };
const LAYOUT = Object.fromEntries(['ART', 'OF', 'PLAY'].map((w) => [w, wordLayout(w, WORD_RULES.tracking)]));
const WALL_INFO = { halfWidth: (WALL.cols * WALL.brickWidth) / 2, top: WALL.rows * WALL.brickHeight };
const ID = { A1: 0, R: 1, T: 2, O: 3, F: 4 };

describe('shed schedule', () => {
  it('waits for firstAfter seconds of play, then sheds; same seed, same decoys', () => {
    const a = createShedder(7, DECOYS, WALL_INFO);
    const b = createShedder(7, DECOYS, WALL_INFO);
    expect(a.due(DECOYS.firstAfter - 1, true)).toBeNull();
    const first = a.due(DECOYS.firstAfter, true);
    expect(first).not.toBeNull();
    expect(b.due(DECOYS.firstAfter, true)).toEqual(first);
    expect(DECOYS.chars).toContain(first.char);
    expect(Math.abs(first.x)).toBeLessThan(WALL_INFO.halfWidth);
  });

  it('spaces sheds between intervalMin and intervalMax, and waits when there is no room', () => {
    const s = createShedder(3, DECOYS, WALL_INFO);
    s.due(DECOYS.firstAfter, true);
    const gap = s.next - DECOYS.firstAfter;
    expect(gap).toBeGreaterThanOrEqual(DECOYS.intervalMin);
    expect(gap).toBeLessThanOrEqual(DECOYS.intervalMax);
    expect(s.due(s.next, false)).toBeNull();
  });
});

describe('graded tell', () => {
  it('is faint at rest, stronger held, strongest near its false slot', () => {
    const rest = decoyTell({ held: false, impostorWarmth: 0 }, DECOYS);
    const held = decoyTell({ held: true, impostorWarmth: 0 }, DECOYS);
    const near = decoyTell({ held: false, impostorWarmth: 1 }, DECOYS);
    expect(rest).toBe(DECOYS.tellBase);
    expect(held).toBeGreaterThan(rest);
    expect(near).toBe(1);
  });

  it('impostor warmth: a decoy R right of the real A at the typeset spacing reads fully warm, left of it reads nothing', () => {
    const letters = createLetters();
    letters[ID.A1].status = STATUS.onTable;
    const snaps = letters.map((l) => letterSnapshot(l, l.id === ID.A1 ? { x: 0, y: 0.5, z: -9 } : { x: 0, y: 0.5, z: -5 }, UPRIGHT));
    const decoy = createDecoyState(9, 'R');
    const spacing = LAYOUT.ART[1].dx - LAYOUT.ART[0].dx;
    const at = (x) => letterSnapshot(decoy, { x, y: 0.5 + LAYOUT.ART[1].dy - LAYOUT.ART[0].dy, z: -9 }, UPRIGHT);
    const ctx = { params: WORD_RULES, layout: LAYOUT };
    expect(impostorWarmth(at(spacing), snaps, ctx)).toBeCloseTo(1);
    expect(impostorWarmth(at(-spacing), snaps, ctx)).toBe(0);
    expect(impostorWarmth(at(5), snaps, ctx)).toBe(0);
  });
});

describe('erosion', () => {
  it('stays whole until the last erodeTime seconds of its life, then wears away', () => {
    expect(decoyErosion({ age: 0, meltAge: null }, DECOYS)).toBe(0);
    expect(decoyErosion({ age: DECOYS.lifetime - DECOYS.erodeTime, meltAge: null }, DECOYS)).toBe(0);
    expect(decoyErosion({ age: DECOYS.lifetime - DECOYS.erodeTime / 2, meltAge: null }, DECOYS)).toBeCloseTo(0.5);
    expect(decoyErosion({ age: DECOYS.lifetime, meltAge: null }, DECOYS)).toBe(1);
  });
  it('a stuck decoy melts over meltTime whatever its age', () => {
    expect(decoyErosion({ age: 1, meltAge: DECOYS.meltTime / 2 }, DECOYS)).toBeCloseTo(0.5);
  });
});

describe('decoys in play (real Rapier)', () => {
  const saved = { ...DECOYS };
  afterEach(() => Object.assign(DECOYS, saved));

  it('the wall sheds a decoy after firstAfter seconds of play; it pops out and lands on the table', async () => {
    const s = await createSession();
    const g = s.game;
    g.hold(g.letters[ID.T]); // play starts at the first hold
    g.release({ kind: 'drop' });
    s.wait(DECOYS.firstAfter + 0.1);
    expect(g.decoys.length).toBe(1);
    s.wait(3);
    const d = g.decoys[0];
    expect(d.status).toBe(STATUS.onTable);
    expect(g.bodies[d.id].translation().y).toBeLessThan(0.6);
    expect(g.bodies[d.id].translation().z).toBeGreaterThan(WALL.z);
  }, 30000);

  it('never sheds with count 0', async () => {
    DECOYS.count = 0;
    const s = await createSession();
    s.game.hold(s.game.letters[ID.T]);
    s.game.release({ kind: 'drop' });
    s.wait(DECOYS.firstAfter + DECOYS.intervalMax * 2);
    expect(s.game.decoys.length).toBe(0);
  }, 30000);

  it('a decoy sitting exactly in a slot beside an anchor is never pulled and never locks the word; the real letter still does', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.F, aim: { x: 1, y: 2.5 }, pointer: { vx: 0, vy: -3.5 } });
    expect(g.letters[ID.F].status).toBe(STATUS.stuck);
    const f = g.bodies[ID.F].translation();
    const slotO = { x: f.x + LAYOUT.OF[0].dx - LAYOUT.OF[1].dx, y: f.y - LAYOUT.OF[1].dy + LAYOUT.OF[0].dy, z: f.z + WORD_RULES.wallGap };
    const decoy = g.shedDecoy({ char: 'O', x: -3, y: 2, spin: 0 });
    s.wait(0.05);
    g.debugPlace(decoy, { x: slotO.x, y: 0.02, z: -10.5 });
    s.wait(1);
    expect(g.resolution.words.OF.state).not.toBe('locked');
    expect(decoy.tell).toBeGreaterThanOrEqual(DECOYS.tellBase);
    s.throwLetter({ letterId: ID.O, aim: slotO, pointer: { vx: 0, vy: -3.5 } });
    expect(g.resolution.words.OF.state).toBe('locked');
  }, 30000);

  it('a decoy that sticks in the wall melts back into it and is gone within meltTime', async () => {
    const s = await createSession();
    const g = s.game;
    const decoy = g.shedDecoy({ char: 'T', x: 0, y: 2, spin: 0 });
    s.wait(2.5); // let it fall to the table and settle (it rests after about 2 s)
    const r = s.throwLetter({ letterId: decoy.id, aim: { x: -2, y: 2.5 }, pointer: { vx: 0, vy: -3.5 }, seconds: 0.9 });
    expect(r.lastContact.decoy).toBe(true);
    expect(r.lastContact.stick).toBe(true);
    s.wait(DECOYS.meltTime + 0.2);
    expect(g.decoys.includes(decoy)).toBe(false);
  }, 30000);

  it('a loose decoy erodes away at the end of its lifetime', async () => {
    const s = await createSession();
    const g = s.game;
    const decoy = g.shedDecoy({ char: 'O', x: 0, y: 2, spin: 0 });
    s.wait(DECOYS.lifetime - DECOYS.erodeTime / 2);
    expect(g.decoys.includes(decoy)).toBe(true);
    expect(decoy.erosion).toBeGreaterThan(0);
    s.wait(DECOYS.erodeTime);
    expect(g.decoys.includes(decoy)).toBe(false);
  }, 60000);
});
