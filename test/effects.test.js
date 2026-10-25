// M2: the family table, the pure effect rules, and one scripted throw per
// letter through the scenario runner (real Rapier, seed 1). Measurements of
// the code, not playtests. Writes docs/reports/effects.md.

import { describe, expect, it, afterAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { FAMILY, FAMILY_OF, familyOf } from '../src/letters/families.js';
import { PHRASE, WORDS, STATUS, createLetters } from '../src/letters/letters.js';
import { stickCheck, embedPose, curveAcceleration, rippleKicks, rippleShake, faceNormal } from '../src/letters/effects.js';
import { runThrow } from '../src/dev/scenario.js';
import { EFFECTS, WALL } from '../src/config.js';

const quatAxis = (axis, angle) => ({
  x: axis.x * Math.sin(angle / 2),
  y: axis.y * Math.sin(angle / 2),
  z: axis.z * Math.sin(angle / 2),
  w: Math.cos(angle / 2),
});
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

describe('family table', () => {
  it('gives every letter of the phrase a family', () => {
    for (const char of PHRASE) expect(Object.values(FAMILY)).toContain(familyOf(char));
  });

  it('gives every word at least one Stick letter (an anchor)', () => {
    for (const word of WORDS) expect([...word.text].some((c) => FAMILY_OF[c] === FAMILY.stick)).toBe(true);
  });

  it('assigns families by letter, so both As share one', () => {
    const letters = createLetters();
    expect(letters[0].char).toBe('A');
    expect(letters[7].char).toBe('A');
    expect(letters[0].family).toBe(letters[7].family);
  });
});

describe('stick rule', () => {
  const params = EFFECTS.stick;
  it('embeds a fast, head-on, face-first hit', () => {
    expect(stickCheck({ x: 0, y: -1, z: -14 }, IDENTITY, params).stick).toBe(true);
  });
  it('bounces a slow hit', () => {
    expect(stickCheck({ x: 0, y: 0, z: -(params.minSpeed - 1) }, IDENTITY, params).stick).toBe(false);
  });
  it('bounces a glancing hit', () => {
    expect(stickCheck({ x: 14, y: 0, z: -4 }, IDENTITY, params).stick).toBe(false);
  });
  it('bounces a letter arriving edge-first', () => {
    const edgeOn = quatAxis({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    expect(stickCheck({ x: 0, y: 0, z: -14 }, edgeOn, params).stick).toBe(false);
  });
  it('presses the embedded letter flat into the wall, keeping its in-plane tilt', () => {
    const tilted = { ...quatAxis({ x: 0, y: 0, z: 1 }, 0.4) };
    const skewed = quatAxis({ x: 0, y: 1, z: 0 }, 0.3);
    const q = { // skewed * tilted
      w: skewed.w * tilted.w - skewed.y * tilted.y,
      x: skewed.w * tilted.x - skewed.y * tilted.z,
      y: skewed.y * tilted.w + skewed.w * tilted.y,
      z: skewed.w * tilted.z + skewed.y * tilted.x,
    };
    const pose = embedPose({ x: 1, y: 2, z: -11.9 }, q, WALL.z, 0.03, 0.012);
    const n = faceNormal(pose.rotation);
    expect(n.z).toBeCloseTo(1, 5);
    expect(pose.position.z).toBeCloseTo(WALL.z + 0.015 - 0.012);
  });
});

describe('curve rule', () => {
  it('pushes sideways in proportion to spin and speed, clockwise hooks right', () => {
    const v = { x: 0, y: 0, z: -12 };
    const right = curveAcceleration(v, { x: 0, y: 0, z: -7 }, IDENTITY, 0.1);
    const left = curveAcceleration(v, { x: 0, y: 0, z: 7 }, IDENTITY, 0.1);
    expect(right.x).toBeCloseTo(8.4);
    expect(left.x).toBeCloseTo(-8.4);
    expect(curveAcceleration(v, { x: 0, y: 0, z: 0 }, IDENTITY, 0.1).x).toBeCloseTo(0);
  });
});

describe('ripple rule', () => {
  const params = { radius: 2, strength: 2, minDistance: 0.5, lift: 0.5 };
  it('kicks letters away from the impact, harder when closer (1/d), none beyond the radius', () => {
    const kicks = rippleKicks({ x: 0, y: 0, z: 0 }, [
      { id: 1, position: { x: 1, y: 0, z: 0 } },
      { id: 2, position: { x: 0, y: 0, z: -1.5 } },
      { id: 3, position: { x: 3, y: 0, z: 0 } },
    ], params);
    expect(kicks.map((k) => k.id)).toEqual([1, 2]);
    expect(kicks[0].deltaV.x).toBeCloseTo(2);
    expect(kicks[1].deltaV.z).toBeCloseTo(-2 / 1.5);
    expect(kicks[0].deltaV.y).toBeGreaterThan(0);
  });
  it('stresses only bricks within the shake radius', () => {
    const bricks = [
      { index: 0, x: 0, y: 1 },
      { index: 1, x: 3, y: 1 },
    ];
    const s = rippleShake({ x: 0, y: 1.2 }, bricks, { shakeRadius: 1, shakeAmount: 0.4 });
    expect(s.map((b) => b.index)).toEqual([0]);
    expect(s[0].stress).toBeCloseTo(0.4 * 0.8);
  });
});

// One scripted throw per letter, with the outcome the rules predict.
const rows = [];
const f = (n) => (n === undefined || n === null ? '' : n.toFixed(2));
const FULL = { vx: 0, vy: -3.5 };
const MEDIUM = { vx: 0, vy: -1.8 };
const AIM = { x: 0, y: 2.5 };

const PREDICTED = {
  [FAMILY.stick]: 'full power: embeds at the aim point and stays',
  [FAMILY.curve]: 'straight flick: hooks right of the aim, then falls',
  [FAMILY.ripple]: 'bounces back far from the wall',
};

describe('one scripted throw per letter', () => {
  for (let id = 0; id < PHRASE.length; id++) {
    const char = PHRASE[id];
    const family = familyOf(char);
    it(`${char} (letter ${id}, ${family}): ${PREDICTED[family]}`, async () => {
      const r = await runThrow({ letterId: id, aim: AIM, pointer: FULL });
      const backFromWall = r.rest.z - WALL.z;
      rows.push(`| ${id} | ${char} | ${family} | ${PREDICTED[family]} | ${r.wallHit ? `${f(r.wallHit.x)}, ${f(r.wallHit.y)}` : 'none'} | ${r.status} | ${f(r.rest.x)}, ${f(r.rest.y)}, ${f(r.rest.z)} |`);
      if (family === FAMILY.stick) {
        expect(r.status).toBe(STATUS.stuck);
        expect(Math.hypot(r.rest.x - AIM.x, r.rest.y - AIM.y)).toBeLessThan(0.3);
      } else if (family === FAMILY.curve) {
        expect(r.status).not.toBe(STATUS.stuck);
        expect(r.wallHit.x - AIM.x).toBeGreaterThan(0.8);
      } else {
        expect(r.status).not.toBe(STATUS.stuck);
        expect(backFromWall).toBeGreaterThan(3.5);
      }
    });
  }
});

describe('effects depend on how you throw', () => {
  it('a Stick letter thrown softly bounces off instead of embedding', async () => {
    const r = await runThrow({ letterId: 2, aim: AIM, pointer: MEDIUM });
    rows.push(`| 2 | T | stick | medium flick: bounces off, does not embed | ${r.wallHit ? `${f(r.wallHit.x)}, ${f(r.wallHit.y)}` : 'none'} | ${r.status} | ${f(r.rest.x)}, ${f(r.rest.y)}, ${f(r.rest.z)} |`);
    expect(r.status).not.toBe(STATUS.stuck);
  });

  it('a Curve letter flicked left flies near straight, flicked right hooks harder', async () => {
    const left = await runThrow({ letterId: 1, aim: AIM, pointer: { vx: -1.75, vy: -3 } });
    const straight = await runThrow({ letterId: 1, aim: AIM, pointer: FULL });
    const right = await runThrow({ letterId: 1, aim: AIM, pointer: { vx: 1.75, vy: -3 } });
    for (const [name, r] of [['left', left], ['straight', straight], ['right', right]]) {
      rows.push(`| 1 | R | curve | ${name} flick: hook grows from left to right | ${f(r.wallHit?.x)}, ${f(r.wallHit?.y)} | ${r.status} | ${f(r.rest.x)}, ${f(r.rest.y)}, ${f(r.rest.z)} |`);
    }
    expect(Math.abs(left.wallHit.x - AIM.x)).toBeLessThan(0.5);
    expect(right.wallHit.x).toBeGreaterThan(straight.wallHit.x);
  });

  it('a Ripple impact nudges a letter lying near it; a Stick impact does not', async () => {
    const lying = quatAxis({ x: 1, y: 0, z: 0 }, -Math.PI / 2);
    const setup = (game) => game.debugPlace(game.letters[2], { x: 0.7, y: 0.02, z: -11.4 }, lying); // T, flat at the wall's foot
    const aimLow = { x: 0, y: 0.5 };
    const nudged = await runThrow({ letterId: 3, aim: aimLow, pointer: FULL, setup, seconds: 2 }); // O
    const control = await runThrow({ letterId: 4, aim: aimLow, pointer: FULL, setup, seconds: 2 }); // F
    const moved = (r) => {
      const p = r.game.bodies[2].translation();
      return Math.hypot(p.x - 0.7, p.z + 11.4);
    };
    rows.push(`| 3 | O | ripple | low throw beside a lying T: the T is shoved (${f(moved(nudged))} units) | ${f(nudged.wallHit?.x)}, ${f(nudged.wallHit?.y)} | ${nudged.status} | ${f(nudged.rest.x)}, ${f(nudged.rest.y)}, ${f(nudged.rest.z)} |`);
    rows.push(`| 4 | F | stick | same throw for comparison: the T moves ${f(moved(control))} units | ${f(control.wallHit?.x)}, ${f(control.wallHit?.y)} | ${control.status} | ${f(control.rest.x)}, ${f(control.rest.y)}, ${f(control.rest.z)} |`);
    expect(moved(nudged)).toBeGreaterThan(0.25);
    expect(moved(nudged)).toBeGreaterThan(moved(control) * 3);
  });

  it('a Ripple hit on the wall stresses the bricks around it', async () => {
    const r = await runThrow({ letterId: 8, aim: AIM, pointer: FULL, seconds: 1 });
    const stressed = [...r.game.brickStress].filter((s) => s > 0).length;
    expect(stressed).toBeGreaterThan(0);
  });
});

afterAll(() => {
  mkdirSync('docs/reports', { recursive: true });
  writeFileSync(
    'docs/reports/effects.md',
    [
      '# Letter effects scenario report',
      '',
      'Generated by `npm test` (test/effects.test.js): scripted throws through the scenario runner, real Rapier, seed 1.',
      'Aim (0, 2.5) on the wall unless stated; full power = upward flick of 3.5 screen heights/s, medium = 1.8.',
      'These are measurements of the code against the rules it implements, not playtest results.',
      'Whether a person who does not know the rules can tell the effects apart is for Kiwi to verify in playtests.',
      '',
      '| letter id | letter | family | expected by the rule | wall hit (x, y) | status after 3 s | rest (x, y, z) |',
      '|---|---|---|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
  );
});
