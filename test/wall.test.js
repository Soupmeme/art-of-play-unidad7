// Wall contact fixes (Kiwi's report: a stuck letter could end up beyond the
// wall, out of reach). Real Rapier, seed 1; measurements of the code.

import { describe, expect, it } from 'vitest';
import { createSession } from '../src/dev/scenario.js';
import { STATUS } from '../src/letters/letters.js';
import { WALL, EFFECTS } from '../src/config.js';

const FULL = { vx: 0, vy: -3.5 };
const MEDIUM = { vx: 0, vy: -1.8 };
const ID = { A1: 0, R: 1, T: 2, O: 3, F: 4, L: 6, Y: 8 };

describe('a stuck letter stays where it bit in', () => {
  it('is not pushed into the wall when other letters hit it', async () => {
    const s = await createSession();
    const g = s.game;
    // T is stuck; O and Y are not its neighbours, so no word forms.
    s.throwLetter({ letterId: ID.T, aim: { x: 0, y: 2.5 }, pointer: FULL });
    const before = g.bodies[ID.T].translation();
    s.throwLetter({ letterId: ID.O, aim: { x: 0, y: 2.5 }, pointer: FULL }); // a Ripple letter, straight at it
    s.throwLetter({ letterId: ID.Y, aim: { x: 0.1, y: 2.4 }, pointer: FULL });
    const after = g.bodies[ID.T].translation();
    expect(g.letters[ID.T].status).toBe(STATUS.stuck);
    expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeLessThan(1e-4);
    expect(after.z).toBeGreaterThan(WALL.z - 0.02);
  }, 30000);
});

describe('a sharp letter knocks a stuck one loose', () => {
  it('a Stick letter thrown hard at a stuck letter pries it out; it falls back onto the stage', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.F, aim: { x: 0, y: 2.5 }, pointer: FULL });
    expect(g.letters[ID.F].status).toBe(STATUS.stuck);
    s.throwLetter({ letterId: ID.T, aim: { x: 0, y: 2.5 }, pointer: FULL, seconds: 0.8 });
    expect(g.letters[ID.F].status).not.toBe(STATUS.stuck);
    expect(g.letters[ID.T].status).not.toBe(STATUS.stuck); // the hitter bounces off, it does not bite
    s.wait(2);
    expect([STATUS.flying, STATUS.onTable]).toContain(g.letters[ID.F].status);
    const p = g.bodies[ID.F].translation();
    expect(p.y).toBeLessThan(0.6);
    expect(p.z).toBeGreaterThan(WALL.z);
  }, 30000);

  it('a soft hit does not', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.F, aim: { x: 0, y: 1.4 }, pointer: FULL });
    s.throwLetter({ letterId: ID.T, aim: { x: 0, y: 1.4 }, pointer: MEDIUM });
    expect(g.letters[ID.F].status).toBe(STATUS.stuck);
    expect(EFFECTS.stick.knockSpeed).toBeGreaterThan(0);
  }, 30000);

  it('a Ripple letter, however hard, does not', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.T, aim: { x: 0, y: 2.5 }, pointer: FULL });
    s.throwLetter({ letterId: ID.O, aim: { x: 0, y: 2.5 }, pointer: FULL });
    expect(g.letters[ID.T].status).toBe(STATUS.stuck);
  }, 30000);
});

describe('nothing gets behind the wall', () => {
  it('letters thrown at the edges and top of the wall end in front of it', async () => {
    const s = await createSession();
    const g = s.game;
    const aims = [
      { id: ID.A1, aim: { x: -5.9, y: 4.8 } },
      { id: ID.R, aim: { x: 5.9, y: 4.8 } },
      { id: ID.O, aim: { x: -5.9, y: 0.5 } },
      { id: ID.Y, aim: { x: 5.9, y: 2 } },
      { id: ID.L, aim: { x: 0, y: 4.9 } },
    ];
    for (const { id, aim } of aims) s.throwLetter({ letterId: id, aim, pointer: { vx: 0, vy: -4 } });
    s.wait(2);
    for (const { id } of aims) expect(g.bodies[id].translation().z).toBeGreaterThan(WALL.z - 0.02);
  }, 60000);
});

describe('letters lying together on the floor', () => {
  const FLAT = { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };

  it('a warm pair (O then F) stays put: the hint never moves the bodies', async () => {
    const s = await createSession();
    const g = s.game;
    g.debugPlace(g.letters[ID.O], { x: -0.5, y: 0.02, z: -9 }, FLAT);
    g.debugPlace(g.letters[ID.F], { x: 0.5, y: 0.02, z: -9 }, FLAT);
    s.wait(6);
    expect(g.resolution.letters[ID.O].warmth).toBeGreaterThan(0.5);
    const o = g.bodies[ID.O].translation();
    const f = g.bodies[ID.F].translation();
    expect(Math.hypot(o.x - f.x, o.z - f.z)).toBeGreaterThan(0.95);
  }, 30000);

  it('lifting one of them does not drag the other along', async () => {
    const s = await createSession();
    const g = s.game;
    g.debugPlace(g.letters[ID.O], { x: -0.5, y: 0.02, z: -9 }, FLAT);
    g.debugPlace(g.letters[ID.F], { x: 0.5, y: 0.02, z: -9 }, FLAT);
    s.wait(6);
    const before = g.bodies[ID.F].translation();
    g.hold(g.letters[ID.O]);
    g.setHoldTarget({ x: -2, y: 1.5, z: 0 });
    s.wait(1);
    const after = g.bodies[ID.F].translation();
    expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeLessThan(0.05);
  }, 30000);
});

describe('letters never hook together', () => {
  // Letters touch each other through their solid outlines (counters filled),
  // so a stroke cannot pass through another letter's counter and lock the two.
  for (const [stuckId, hitterId, aimX] of [
    [ID.T, ID.A1, 2],
    [ID.F, ID.T, 0],
    [ID.L, ID.F, -3],
  ]) {
    it(`a letter knocked loose and the letter that hit it come apart (${stuckId} hit by ${hitterId})`, async () => {
      const s = await createSession();
      const g = s.game;
      s.throwLetter({ letterId: stuckId, aim: { x: aimX, y: 2.5 }, pointer: FULL });
      s.throwLetter({ letterId: hitterId, aim: { x: aimX, y: 2.5 }, pointer: FULL, seconds: 3 });
      const before = g.bodies[hitterId].translation();
      expect(g.hold(g.letters[stuckId])).toBe(true);
      g.setHoldTarget({ x: 2, y: 1.5, z: 0 });
      s.wait(1);
      const after = g.bodies[hitterId].translation();
      expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeLessThan(0.05);
    }, 30000);
  }
});
