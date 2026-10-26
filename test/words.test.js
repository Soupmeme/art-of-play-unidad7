// The word function (pure). Letters are built with the runtime factories
// (createLetters + letterSnapshot), never with hand-made stand-ins.

import { describe, expect, it } from 'vitest';
import { createLetters, STATUS } from '../src/letters/letters.js';
import { wordLayout } from '../src/letters/glyphs.js';
import { resolveWords, letterSnapshot, isAligned } from '../src/words/resolve.js';
import { finaleLayout } from '../src/staging/finale.js';
import { WORD_RULES, FINALE } from '../src/config.js';

const UPRIGHT = { x: 0, y: 0, z: 0, w: 1 };
const LAYOUT = Object.fromEntries(['ART', 'OF', 'PLAY'].map((w) => [w, wordLayout(w, WORD_RULES.tracking)]));
const ID = { A1: 0, R: 1, T: 2, O: 3, F: 4, P: 5, L: 6, A2: 7, Y: 8 };

// Every letter starts in the fan; `place` puts some of them in play.
function scene(placements) {
  const letters = createLetters();
  return letters.map((l) => {
    const p = placements[l.id];
    if (p) {
      l.status = p.status ?? STATUS.onTable;
      l.lockedWord = p.lockedWord ?? null;
    }
    return letterSnapshot(l, p?.position ?? { x: 0, y: 0.5, z: -5 }, p?.rotation ?? UPRIGHT);
  });
}
const resolve = (placements, previousLeaders) =>
  resolveWords(scene(placements), { params: WORD_RULES, layout: LAYOUT, previousLeaders });
const at = (x, y = 0.5, z = -9, extra = {}) => ({ position: { x, y, z }, ...extra });

// Typeset spacing between two neighbouring slots of a word.
const spacing = (word, i) => LAYOUT[word][i + 1].dx - LAYOUT[word][i].dx;

describe('warm, then pull, as correct neighbours approach in order', () => {
  it('far apart: cold', () => {
    const r = resolve({ [ID.O]: at(0), [ID.F]: at(3) });
    expect(r.words.OF.state).toBe('cold');
    expect(r.letters[ID.O].warmth).toBe(0);
  });

  it('inside hintRadius: warm, no pull, warmth rises as the gap closes', () => {
    const far = resolve({ [ID.O]: at(0), [ID.F]: at(2.3) });
    const nearer = resolve({ [ID.O]: at(0), [ID.F]: at(1.8) });
    expect(far.words.OF.state).toBe('warm');
    expect(far.letters[ID.F].pulled).toBe(false);
    expect(nearer.letters[ID.O].warmth).toBeGreaterThan(far.letters[ID.O].warmth);
  });

  it('inside pullRadius: both free letters are pulled toward their slots', () => {
    const r = resolve({ [ID.O]: at(0), [ID.F]: at(1.3) });
    expect(r.words.OF.state).toBe('pulling');
    expect(r.letters[ID.O].pulled && r.letters[ID.F].pulled).toBe(true);
    const { slots } = r.words.OF;
    expect(slots[1].x - slots[0].x).toBeCloseTo(spacing('OF', 0));
  });

  it('warmth is 1 at the typeset spacing', () => {
    const r = resolve({ [ID.O]: at(0), [ID.F]: at(spacing('OF', 0)) });
    expect(r.letters[ID.O].warmth).toBeCloseTo(1);
  });

  it('no pull across a large depth gap', () => {
    const r = resolve({ [ID.O]: at(0, 0.5, -9), [ID.F]: at(0.6, 0.5, -10.3) });
    expect(r.letters[ID.F].pulled).toBe(false);
  });
});

describe('wrong order produces nothing', () => {
  it('F left of O: no warmth, no pull, cold', () => {
    const r = resolve({ [ID.O]: at(1), [ID.F]: at(0) });
    expect(r.words.OF.state).toBe('cold');
    expect(r.letters[ID.O].warmth).toBe(0);
    expect(r.letters[ID.F].pulled).toBe(false);
  });

  it('a word never becomes ready with a pair out of order', () => {
    const l = LAYOUT.ART;
    const r = resolve({
      [ID.A1]: at(0, 0.5 + l[0].dy),
      [ID.T]: at(l[1].dx, 0.5 + l[2].dy), // T where R belongs
      [ID.R]: at(l[2].dx, 0.5 + l[1].dy), // R where T belongs
    });
    expect(r.words.ART.state).not.toBe('ready');
  });
});

describe('the duplicate A', () => {
  it('goes to the word whose neighbours are closer: A near R serves ART, A near L serves PLAY', () => {
    const r = resolve({
      [ID.A1]: at(5, 0.5, -9), // the first A, lying next to L
      [ID.L]: at(4, 0.5, -9),
      [ID.A2]: at(-3, 0.5, -9), // the second A, next to R
      [ID.R]: at(-2, 0.5, -9),
    });
    expect(r.words.ART.members[0]).toBe(ID.A2);
    expect(r.words.PLAY.members[2]).toBe(ID.A1);
    expect(r.letters[ID.A2].pulled).toBe(true);
    expect(r.letters[ID.A1].pulled).toBe(true);
  });

  it('keeps the default (first A in ART) when nothing is near either', () => {
    const r = resolve({ [ID.A1]: at(-4), [ID.A2]: at(4) });
    expect(r.words.ART.members[0]).toBe(ID.A1);
    expect(r.words.PLAY.members[2]).toBe(ID.A2);
  });

  it('a locked word keeps its A, the other A goes to the other word', () => {
    const r = resolve({
      [ID.A1]: at(0, 1, -12, { status: STATUS.locked, lockedWord: 'PLAY' }),
      [ID.P]: at(-2, 1, -12, { status: STATUS.locked, lockedWord: 'PLAY' }),
      [ID.L]: at(-1, 1, -12, { status: STATUS.locked, lockedWord: 'PLAY' }),
      [ID.Y]: at(1, 1, -12, { status: STATUS.locked, lockedWord: 'PLAY' }),
      [ID.A2]: at(4, 0.5, -9),
      [ID.R]: at(5, 0.5, -9),
    });
    expect(r.words.PLAY.state).toBe('locked');
    expect(r.words.ART.members[0]).toBe(ID.A2);
    expect(r.letters[ID.R].pulled).toBe(true);
  });
});

describe('anchors and leaders', () => {
  it('a word with a stuck member lays its slots out from that anchor, which never moves', () => {
    const r = resolve({ [ID.F]: at(1, 2.5, -11.99, { status: STATUS.stuck }), [ID.O]: at(-0.2, 2.6, -11.5) });
    expect(r.words.OF.anchor).toBe(ID.F);
    expect(r.letters[ID.F].pulled).toBe(false);
    expect(r.letters[ID.O].pulled).toBe(true);
    expect(r.words.OF.slots[1]).toEqual({ x: 1, y: 2.5, z: -11.99 });
    expect(r.words.OF.slots[0].x).toBeCloseTo(1 - spacing('OF', 0));
    expect(r.words.OF.slots[0].z).toBeCloseTo(-11.99 + WORD_RULES.wallGap);
  });

  it('a word with no anchor picks a leader among the pulled letters and stands on the table', () => {
    const r = resolve({ [ID.P]: at(0, 0.02), [ID.L]: at(1.1, 0.02), [ID.A2]: at(2.2, 0.02) });
    const w = r.words.PLAY;
    expect(w.anchor).toBeNull();
    expect([ID.P, ID.L, ID.A2]).toContain(w.leader);
    expect(w.leader).toBe(ID.L); // nearest the centroid
    expect(w.slots[1].y).toBeCloseTo(WORD_RULES.tableBaseline + LAYOUT.PLAY[1].dy);
  });

  it('keeps the previous leader while it still qualifies', () => {
    const r = resolve({ [ID.P]: at(0, 0.02), [ID.L]: at(1.1, 0.02), [ID.A2]: at(2.2, 0.02) }, { PLAY: ID.P });
    expect(r.words.PLAY.leader).toBe(ID.P);
  });

  it('anchors stuck out of place make the word unresolvable, with no pull', () => {
    const r = resolve({
      [ID.A1]: at(0, 2.5, -11.99, { status: STATUS.stuck }),
      [ID.T]: at(0.9, 2.5, -11.99, { status: STATUS.stuck }), // far too close: T's slot is two letters along
      [ID.R]: at(0.8, 2.0, -11.6),
    });
    expect(r.words.ART.state).toBe('unresolvable');
    expect(r.letters[ID.R].pulled).toBe(false);
  });

  it('anchors stuck exactly in place are fine', () => {
    const l = LAYOUT.ART;
    const r = resolve({
      [ID.A1]: at(0, 2.5, -11.99, { status: STATUS.stuck }),
      [ID.T]: at(l[2].dx, 2.5 - l[0].dy + l[2].dy, -11.99 + WORD_RULES.wallGap, { status: STATUS.stuck }),
    });
    expect(r.words.ART.state).not.toBe('unresolvable');
  });
});

describe('lock', () => {
  const inSlots = (word, x0, baseline, z, ids, extra = {}) =>
    Object.fromEntries(ids.map((id, i) => [id, at(x0 + LAYOUT[word][i].dx, baseline + LAYOUT[word][i].dy, z, extra)]));

  it('is ready when every member sits in its slot, upright', () => {
    const r = resolve(inSlots('OF', 0, WORD_RULES.tableBaseline, -9, [ID.O, ID.F]));
    expect(r.words.OF.state).toBe('ready');
  });

  it('is not ready while a member is tilted', () => {
    const tilted = { x: 0, y: 0, z: Math.sin(0.3), w: Math.cos(0.3) }; // about 34 degrees in plane
    const p = inSlots('OF', 0, WORD_RULES.tableBaseline, -9, [ID.O, ID.F]);
    p[ID.F].rotation = tilted;
    expect(resolve(p).words.OF.state).not.toBe('ready');
    expect(isAligned(tilted, WORD_RULES.alignAngle)).toBe(false);
  });

  it('is not ready while a member is missing (still in the fan)', () => {
    const p = inSlots('ART', 0, WORD_RULES.tableBaseline, -9, [ID.A1, ID.R, ID.T]);
    delete p[ID.T];
    expect(resolve(p).words.ART.state).not.toBe('ready');
  });
});

describe('finale layout', () => {
  const line = finaleLayout(LAYOUT, FINALE);

  it('sets ART OF PLAY left to right on one baseline, centred', () => {
    const xs = ['ART', 'OF', 'PLAY'].flatMap((w) => line[w].map((p) => p.x));
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    const left = line.ART[0].x - LAYOUT.ART[0].halfWidth;
    const right = line.PLAY[3].x + LAYOUT.PLAY[3].halfWidth;
    expect((left + right) / 2).toBeCloseTo(FINALE.center.x);
  });

  it('leaves word gaps wider than letter gaps', () => {
    const edge = (w, i, side) => line[w][i].x + side * LAYOUT[w][i].halfWidth;
    expect(edge('OF', 0, -1) - edge('ART', 2, 1)).toBeGreaterThan(edge('ART', 1, -1) - edge('ART', 0, 1));
  });
});
