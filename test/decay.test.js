// The wall decay scheduler (pure), then decay and resets in real Rapier.
// Measurements of the code, not playtests.

import { describe, expect, it } from 'vitest';
import { createDecayScheduler } from '../src/wall/decay.js';
import { layoutWall } from '../src/wall/wall.js';
import { WALL, DECAY } from '../src/config.js';

const bricks = layoutWall(WALL);
const DT = 1 / 60;

// Runs the scheduler from playTime `from` to `to`; returns [time, indices] events.
function run(s, { from = 0, to, eligible = () => true, stress = new Float32Array(bricks.length), onStep }) {
  const events = [];
  for (let t = from; t < to; t += DT) {
    const chosen = s.update({ playTime: t, dt: DT, eligible, stress });
    if (chosen.length) events.push([t, chosen]);
    onStep?.(t, chosen);
  }
  return events;
}

describe('decay scheduler', () => {
  it('does nothing during the grace period, then starts releasing', () => {
    const s = createDecayScheduler(1, DECAY, bricks);
    expect(run(s, { to: DECAY.grace - 0.1 })).toEqual([]);
    expect(s.state.D).toBe(0);
    const later = run(s, { from: DECAY.grace - 0.1, to: DECAY.grace + DECAY.intervalMax * 2 });
    expect(later.length).toBeGreaterThan(0);
  });

  it('is reproducible: same seed, same events', () => {
    const a = run(createDecayScheduler(5, DECAY, bricks), { to: 120 });
    const b = run(createDecayScheduler(5, DECAY, bricks), { to: 120 });
    expect(a).toEqual(b);
    const c = run(createDecayScheduler(6, DECAY, bricks), { to: 120 });
    expect(c).not.toEqual(a);
  });

  it('raises D over time, and with it the cluster size and the event rate', () => {
    const s = createDecayScheduler(2, DECAY, bricks);
    const events = run(s, { to: DECAY.grace + 200 });
    expect(s.state.D).toBe(1);
    const early = events.filter(([t]) => t < DECAY.grace + 30);
    const late = events.filter(([t]) => t > DECAY.grace + 150);
    const size = (list) => list.reduce((n, [, c]) => n + c.length, 0) / list.length;
    expect(size(late)).toBeGreaterThan(size(early));
    expect(late.length / 50).toBeGreaterThan(early.length / 30);
  });

  it('clusters are neighbouring bricks', () => {
    const s = createDecayScheduler(3, DECAY, bricks);
    s.state.D = 1;
    const [[, cluster]] = run(s, { from: DECAY.grace, to: DECAY.grace + 1 });
    expect(cluster.length).toBe(DECAY.clusterMax);
    for (const i of cluster.slice(1)) {
      const touches = cluster.some((j) => j !== i && Math.abs(bricks[i].col - bricks[j].col) + Math.abs(bricks[i].row - bricks[j].row) === 1);
      expect(touches).toBe(true);
    }
  });

  it('a lock lowers D and grants a respite with no scheduled events', () => {
    const s = createDecayScheduler(4, DECAY, bricks);
    run(s, { to: DECAY.grace + 60 });
    const before = s.state.D;
    const t = DECAY.grace + 60;
    s.onLock(t);
    expect(s.state.D).toBeCloseTo(Math.max(0, before - DECAY.lockDrop));
    expect(run(s, { from: t, to: t + DECAY.respite - 0.1 })).toEqual([]);
  });

  it('never picks an ineligible brick (gone, shuddering, or behind a locked word)', () => {
    const s = createDecayScheduler(7, DECAY, bricks);
    const immune = new Set(bricks.filter((b) => b.row < 4).map((b) => b.index));
    const events = run(s, { to: 200, eligible: (i) => !immune.has(i) });
    for (const [, cluster] of events) for (const i of cluster) expect(immune.has(i)).toBe(false);
  });

  it('a brick stressed by Ripple hits goes on its own, even during the grace period', () => {
    const s = createDecayScheduler(8, DECAY, bricks);
    const stress = new Float32Array(bricks.length);
    stress[42] = DECAY.stressRelease;
    expect(s.update({ playTime: 1, dt: DT, eligible: () => true, stress })).toEqual([42]);
  });
});

// ---- In the game, real Rapier, seed 1 ----
import { createSession } from '../src/dev/scenario.js';
import { STATUS } from '../src/letters/letters.js';
import { RESET } from '../src/config.js';

const FULL = { vx: 0, vy: -3.5 };
const ID = { A1: 0, R: 1, T: 2, O: 3, F: 4, P: 5, L: 6, A2: 7, Y: 8 };

// Keeps play going (a quick hold and drop of a letter lying in the hand),
// so the quiet reset does not interrupt a long test.
function touch(g, id = ID.P) {
  if (!g.hold(g.letters[id])) return;
  g.release({ kind: 'drop' });
  g.placeInFan(g.letters[id]);
}

describe('decay in the game', () => {
  it('after the grace period bricks shudder, then fall off the wall', async () => {
    const s = await createSession();
    const g = s.game;
    // Keep playing (a touch every 10 s) so the quiet reset stays away.
    for (let t = 0; t < DECAY.grace - 1; t += 10) {
      touch(g);
      s.wait(Math.min(10, DECAY.grace - 1 - t));
    }
    expect(g.fallen).toBe(0);
    touch(g);
    s.wait(DECAY.intervalMax * 1.3 + DECAY.telegraph);
    expect(g.fallen).toBeGreaterThan(0);
    const i = g.standing.findIndex((up) => !up);
    expect(g.brickBodies[i].isDynamic()).toBe(true);
    s.wait(2);
    expect(g.brickBodies[i].translation().y).toBeLessThan(g.bricks[i].y - 0.2);
  }, 60000);

  it('a letter stuck to a brick falls with it', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.T, aim: { x: 0, y: 2.5 }, pointer: FULL });
    expect(g.letters[ID.T].status).toBe(STATUS.stuck);
    g.releaseBrick(g.letters[ID.T].stuckTo);
    s.wait(2);
    expect(g.letters[ID.T].status).not.toBe(STATUS.stuck);
    expect(g.bodies[ID.T].translation().y).toBeLessThan(1);
  }, 30000);

  it('a locked word is safe: the bricks behind it never fall', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.F, aim: { x: 1, y: 2.5 }, pointer: FULL });
    const f = g.bodies[ID.F].translation();
    const L = g.layout.OF;
    s.throwLetter({ letterId: ID.O, aim: { x: f.x + L[0].dx - L[1].dx, y: f.y }, pointer: FULL });
    expect(g.resolution.words.OF.state).toBe('locked');
    // Bricks right behind the ink of O and F.
    const inked = [ID.O, ID.F].map((id) => g.bodies[id].translation());
    const behind = g.bricks
      .filter((b) => inked.some((p) => Math.abs(b.x - p.x) < b.w / 2 + 0.3 && Math.abs(b.y - p.y) < b.h / 2 + 0.3))
      .map((b) => b.index);
    expect(behind.length).toBeGreaterThan(2);
    for (let k = 0; k < 16; k++) {
      touch(g);
      s.wait(10);
    }
    expect(g.fallen).toBeGreaterThan(10);
    for (const i of behind) expect(g.standing[i]).toBe(true);
    expect(g.letters[ID.O].status).toBe(STATUS.locked);
  }, 120000);

  it('locking a word grants a respite from scheduled decay', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.F, aim: { x: 1, y: 2.5 }, pointer: FULL });
    const f = g.bodies[ID.F].translation();
    const L = g.layout.OF;
    s.throwLetter({ letterId: ID.O, aim: { x: f.x + L[0].dx - L[1].dx, y: f.y }, pointer: FULL });
    expect(g.resolution.words.OF.state).toBe('locked');
    const lockedAt = g.lockedWords[0].time - (g.time - g.playTime);
    expect(g.decay.respiteUntil).toBeCloseTo(lockedAt + DECAY.respite, 1);
  }, 120000);
});

describe('resets', () => {
  it('quiet reset: after quietSeconds with no input, the round restarts with the wall rebuilt', async () => {
    const s = await createSession();
    const g = s.game;
    s.throwLetter({ letterId: ID.T, aim: { x: 0, y: 2.5 }, pointer: FULL });
    g.releaseBrick(10);
    s.wait(RESET.quietSeconds - 4);
    expect(g.letters[ID.T].status).not.toBe(STATUS.inFan);
    s.wait(4 + RESET.fadeOut + 0.2);
    expect(g.resetting).toBeNull();
    expect(g.letters.every((l) => l.status === STATUS.inFan)).toBe(true);
    expect(g.fallen).toBe(0);
    expect(g.standing.every(Boolean)).toBe(true);
    expect(g.playTime).toBe(0);
  }, 60000);

  it('no quiet reset before play has started (the hand just waits)', async () => {
    const s = await createSession();
    s.wait(RESET.quietSeconds + 5);
    expect(s.game.resetting).toBeNull();
  }, 60000);

  it('never resets while a letter is held', async () => {
    const s = await createSession();
    const g = s.game;
    g.hold(g.letters[ID.T]);
    g.setHoldTarget({ x: 0, y: 1.5, z: 0 });
    s.wait(RESET.quietSeconds + 5);
    expect(g.resetting).toBeNull();
    expect(g.letters[ID.T].status).toBe(STATUS.held);
  }, 60000);

  it('collapse reset: when the collapse fraction of bricks has fallen, the round restarts', async () => {
    const s = await createSession();
    const g = s.game;
    touch(g);
    const target = Math.ceil(g.bricks.length * DECAY.collapseFraction);
    for (let i = 0; i < target; i++) g.releaseBrick(i);
    s.wait(0.1);
    expect(g.resetting?.reason).toBe('collapse');
    expect(g.curtain.black).toBeGreaterThan(0);
    s.wait(RESET.fadeOut + 0.2);
    expect(g.fallen).toBe(0);
    expect(g.standing.every(Boolean)).toBe(true);
  }, 60000);
});
