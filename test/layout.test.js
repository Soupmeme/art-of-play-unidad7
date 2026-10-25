import { describe, expect, it } from 'vitest';
import { pointerVelocity, ballisticElevation, planThrow, clampAim } from '../src/input/throwMapping.js';
import { letterForm, glyphContours, pointInGlyph, rasterBoxes, advanceWidth } from '../src/letters/glyphs.js';
import { fanLayout } from '../src/letters/fan.js';
import { layoutWall } from '../src/wall/wall.js';
import { nearestOnScreen } from '../src/input/picking.js';
import { PHRASE, createLetters, wordStarts, STATUS } from '../src/letters/letters.js';
import { THROW, FAN, WALL, CARD } from '../src/config.js';

describe('pointer velocity', () => {
  it('measures the motion over the last window only', () => {
    // Still for 500 ms, then 0.3 screen heights up in the last 100 ms.
    const samples = [
      { t: 0, x: 0.5, y: 0.8 },
      { t: 500, x: 0.5, y: 0.8 },
      { t: 550, x: 0.5, y: 0.65 },
      { t: 600, x: 0.5, y: 0.5 },
    ];
    const v = pointerVelocity(samples, 80);
    expect(v.vx).toBeCloseTo(0);
    expect(v.vy).toBeCloseTo(-3); // 0.3 H per 0.1 s
  });

  it('is zero for a pointer that stopped before release', () => {
    const samples = [
      { t: 0, x: 0.2, y: 0.5 },
      { t: 50, x: 0.6, y: 0.2 },
      { t: 400, x: 0.6, y: 0.2 },
    ];
    expect(pointerVelocity(samples, 80).speed).toBeCloseTo(0);
  });
});

describe('ballistic elevation', () => {
  it('is zero-ish for a very fast throw at a level target and grows with distance', () => {
    const near = ballisticElevation(2, 0, 15, 9.81);
    const far = ballisticElevation(8, 0, 15, 9.81);
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });

  it('returns null when the target is out of range', () => {
    expect(ballisticElevation(100, 0, 5, 9.81)).toBeNull();
  });
});

describe('planThrow', () => {
  const from = { x: 0, y: 1, z: -4.6 };
  const target = { x: 0, y: 2, z: -12 };
  const plan = (vx, vy) =>
    planThrow({ pointer: { vx, vy, speed: Math.hypot(vx, vy) }, from, target, params: THROW, gravity: 9.81 });

  it('below dropSpeed is a drop', () => {
    expect(plan(0, -THROW.dropSpeed * 0.9).kind).toBe('drop');
  });

  it('power rises with pointer speed and saturates at fullSpeed', () => {
    const slow = plan(0, -1.2);
    const fast = plan(0, -THROW.fullSpeed);
    const faster = plan(0, -THROW.fullSpeed * 2);
    expect(slow.power).toBeGreaterThan(0);
    expect(slow.power).toBeLessThan(1);
    expect(fast.power).toBe(1);
    expect(faster.launchSpeed).toBe(THROW.maxLaunch);
  });

  it('flies toward the wall, and the sideways flick sets the spin sign', () => {
    const right = plan(1, -3);
    expect(right.linvel.z).toBeLessThan(0);
    expect(right.spin).toBeLessThan(0);
    expect(plan(-1, -3).spin).toBeGreaterThan(0);
    expect(Math.abs(plan(10, -3).spin)).toBe(THROW.maxSpin);
  });

  it('clampAim keeps the aim on the wall face', () => {
    const a = clampAim({ x: 50, y: -3, z: -12 }, { halfWidth: 6, top: 5, inset: 0.3 });
    expect(a).toEqual({ x: 5.7, y: 0.3, z: -12 });
  });
});

describe('letterforms and colliders', () => {
  it('every letter of the phrase has a form about one card high', () => {
    for (const char of new Set(PHRASE)) {
      const f = letterForm(char, CARD);
      expect(f.height).toBeGreaterThan(0.95);
      expect(f.height).toBeLessThan(1.1);
      expect(f.boxes.length).toBeGreaterThan(2);
    }
  });

  it('the O collider keeps its counter open (no box covers the centre)', () => {
    const f = letterForm('O', CARD);
    const covers = (b, x, y) => Math.abs(x - b.x) <= b.halfWidth && Math.abs(y - b.y) <= b.halfHeight;
    expect(f.boxes.some((b) => covers(b, 0, 0))).toBe(false);
  });

  it('the L collider leaves its empty upper-right corner empty', () => {
    const f = letterForm('L', CARD);
    const covers = (b, x, y) => Math.abs(x - b.x) <= b.halfWidth && Math.abs(y - b.y) <= b.halfHeight;
    expect(f.boxes.some((b) => covers(b, f.width * 0.35, f.height * 0.35))).toBe(false);
  });

  it('raster boxes stay inside the glyph within one cell', () => {
    const { contours, bounds } = glyphContours('A');
    const cell = 0.08;
    for (const b of rasterBoxes(contours, bounds, cell)) {
      expect(pointInGlyph(b.x, b.y, contours) || b.halfWidth < cell * 2 || b.halfHeight < cell * 2).toBe(true);
    }
  });
});

describe('fan layout', () => {
  const advances = [...PHRASE].map((c) => advanceWidth(c));
  const fan = fanLayout({ ...FAN, advances, wordStarts: wordStarts() });

  it('places the nine letters left to right in reading order', () => {
    for (let i = 1; i < fan.length; i++) expect(fan[i].x).toBeGreaterThan(fan[i - 1].x);
  });

  it('leaves wider gaps between words than inside them', () => {
    const gaps = fan.slice(1).map((p, i) => p.x - fan[i].x - (advances[i] + advances[i + 1]) / 2);
    const between = [gaps[2], gaps[4]]; // T to O, F to P
    const inside = [gaps[0], gaps[1], gaps[3], gaps[5], gaps[6], gaps[7]];
    expect(Math.min(...between)).toBeGreaterThan(Math.max(...inside));
  });

  it('is symmetric and leans the outer cards outward', () => {
    expect(fan[0].x).toBeCloseTo(-fan[8].x, 1);
    expect(fan[0].angle).toBeGreaterThan(0);
    expect(fan[8].angle).toBeLessThan(0);
  });
});

describe('wall layout', () => {
  const bricks = layoutWall(WALL);

  it('has a brick count inside the brief range (120 to 300)', () => {
    expect(bricks.length).toBe(WALL.cols * WALL.rows);
    expect(bricks.length).toBeGreaterThanOrEqual(120);
    expect(bricks.length).toBeLessThanOrEqual(300);
  });

  it('tiles the wall face exactly: centred, standing on the table, no gaps or overlaps', () => {
    const width = WALL.cols * WALL.brickWidth;
    const height = WALL.rows * WALL.brickHeight;
    const area = bricks.reduce((sum, b) => sum + b.w * b.h, 0);
    expect(area).toBeCloseTo(width * height);
    expect(Math.min(...bricks.map((b) => b.x - b.w / 2))).toBeCloseTo(-width / 2);
    expect(Math.max(...bricks.map((b) => b.x + b.w / 2))).toBeCloseTo(width / 2);
    expect(Math.min(...bricks.map((b) => b.y - b.h / 2))).toBeCloseTo(0);
  });

  it('puts the brick front faces on the wall plane', () => {
    expect(bricks.every((b) => Math.abs(b.z + b.d / 2 - WALL.z) < 1e-9)).toBe(true);
  });
});

describe('screen-space picking fallback', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const candidates = [
    { letter: a, points: [{ x: 100, y: 100 }, { x: 120, y: 100 }] },
    { letter: b, points: [{ x: 160, y: 100 }] },
  ];

  it('picks the letter with the closest point within reach', () => {
    expect(nearestOnScreen(candidates, { x: 135, y: 102 }, 30)).toBe(a);
    expect(nearestOnScreen(candidates, { x: 150, y: 100 }, 30)).toBe(b);
  });

  it('picks nothing when every letter is out of reach', () => {
    expect(nearestOnScreen(candidates, { x: 400, y: 400 }, 30)).toBeNull();
  });
});

describe('letter state factory', () => {
  it('creates the nine letters of ART OF PLAY in the fan', () => {
    const letters = createLetters();
    expect(letters.map((l) => l.char).join('')).toBe('ARTOFPLAY');
    expect(letters.every((l) => l.status === STATUS.inFan)).toBe(true);
  });
});
