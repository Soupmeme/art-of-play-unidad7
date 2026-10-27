// The opening of a round (Kiwi's amendment): the shuffled hand with decoys,
// the dealer's shuffle tracks, the fade and camera push, and the real game's
// round in Rapier. Measurements of the code, not playtests.

import { describe, expect, it } from 'vitest';
import { shuffleHand, hasHintPair, openingTracks, trackPose, openingCurtain } from '../src/staging/opening.js';
import { createSession } from '../src/dev/scenario.js';
import { createLetters, STATUS } from '../src/letters/letters.js';
import { OPENING, DECOYS } from '../src/config.js';

const handOf = () => [...createLetters(), { id: 9, char: 'R' }, { id: 10, char: 'O' }];

describe('shuffled hand', () => {
  it('is a permutation of the cards, the same for the same seed', () => {
    const cards = handOf();
    const a = shuffleHand(cards, 42);
    expect([...a].sort((x, y) => x - y)).toEqual(cards.map((c) => c.id));
    expect(shuffleHand(cards, 42)).toEqual(a);
    expect(shuffleHand(cards, 43)).not.toEqual(a);
  });

  it('never shows a hint pair (AR, RT, OF, PL, LA, AY) side by side, over 300 seeds', () => {
    const cards = handOf();
    const charOf = new Map(cards.map((c) => [c.id, c.char]));
    for (let seed = 0; seed < 300; seed++) {
      expect(hasHintPair(shuffleHand(cards, seed).map((id) => charOf.get(id)))).toBe(false);
    }
  });

  it('hasHintPair spots the phrase in reading order', () => {
    expect(hasHintPair([...'ARTOFPLAY'])).toBe(true);
    expect(hasHintPair([...'YALPFOTRA'])).toBe(false);
  });
});

describe("dealer's shuffle tracks", () => {
  const deckOrder = [0, 1, 2, 3, 4];
  const handOrder = [3, 0, 4, 1, 2];
  const fan = handOrder.map((_, i) => ({ x: i - 2, y: 0.6, z: -4.8 + i * 0.04, angle: 0.1 * (2 - i) }));
  const { tracks, duration } = openingTracks({ deckOrder, handOrder, fan, params: OPENING });

  it('starts every card on the deck and ends it in its hand slot', () => {
    for (const id of deckOrder) {
      const start = trackPose(tracks.get(id), 0, OPENING.lift).position;
      expect(start.x).toBeCloseTo(OPENING.deck.x);
      const slot = handOrder.indexOf(id);
      const end = trackPose(tracks.get(id), duration + 1, OPENING.lift).position;
      expect(end.x).toBeCloseTo(fan[slot].x);
      expect(end.y).toBeCloseTo(fan[slot].y);
      expect(end.z).toBeCloseTo(fan[slot].z);
    }
  });

  it('deals left to right: each slot arrives after the one before it', () => {
    const arrival = (id) => tracks.get(id)[tracks.get(id).length - 1].t;
    for (let i = 1; i < handOrder.length; i++) expect(arrival(handOrder[i])).toBeGreaterThan(arrival(handOrder[i - 1]));
    expect(arrival(handOrder[handOrder.length - 1])).toBeCloseTo(duration);
  });

  it('splits the deck into two halves, left and right', () => {
    const xs = deckOrder.map((id) => trackPose(tracks.get(id), OPENING.split, OPENING.lift).position.x);
    expect(Math.min(...xs)).toBeCloseTo(OPENING.deck.x - OPENING.halfOffset);
    expect(Math.max(...xs)).toBeCloseTo(OPENING.deck.x + OPENING.halfOffset);
  });

  it('fades in from black and pushes the camera in', () => {
    expect(openingCurtain(0, OPENING)).toEqual({ black: 1, push: 1 });
    expect(openingCurtain(OPENING.fade, OPENING).black).toBe(0);
    expect(openingCurtain(OPENING.dolly, OPENING).push).toBe(0);
  });
});

describe('a real round (Rapier, default round rules)', () => {
  it('deals 9 letters plus 1 or 2 decoys, shuffled, with no hint pair; nothing is holdable until the deal ends', async () => {
    const s = await createSession({ round: {} });
    const g = s.game;
    expect(g.decoys.length).toBeGreaterThanOrEqual(DECOYS.inHandMin);
    expect(g.decoys.length).toBeLessThanOrEqual(DECOYS.inHandMax);
    expect(g.handOrder.length).toBe(9 + g.decoys.length);
    expect(hasHintPair(g.handOrder.map((id) => g.card(id).char))).toBe(false);
    expect(g.opening).toBe(true);
    expect(g.curtain.black).toBe(1);
    expect(g.hold(g.letters[0])).toBe(false);

    s.wait(4);
    expect(g.opening).toBe(false);
    expect(g.curtain).toEqual({ black: 0, push: 0 });
    for (const id of g.handOrder) {
      const p = g.bodies[id].translation();
      const slot = g.fanPose(id);
      expect(Math.hypot(p.x - slot.x, p.z - slot.z)).toBeLessThan(0.05);
      expect(g.card(id).status).toBe(STATUS.inFan);
    }
    expect(g.hold(g.letters[0])).toBe(true);
  }, 30000);

  it('decoys in the hand do not age until they are played', async () => {
    const s = await createSession({ round: {} });
    s.wait(8);
    for (const d of s.game.decoys) expect(d.age).toBe(0);
  }, 30000);

  it('a new round deals a different shuffle', async () => {
    const s = await createSession({ round: {} });
    const first = [...s.game.handOrder];
    s.wait(4);
    s.game.startRound();
    expect(s.game.handOrder).not.toEqual(first);
    expect(s.game.opening).toBe(true);
  }, 30000);
});

describe('the hand never dips under the floor', () => {
  const lowestOf = (g, id, pose) =>
    pose.y + Math.min(...g.forms[id].outline.map((q) => q.x * Math.sin(pose.angle) + q.y * Math.cos(pose.angle)));

  it('at rest, over 20 shuffled hands with decoys, every card clears the floor (breathing included)', async () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = await createSession({ seed, round: {} });
      const g = s.game;
      for (const id of g.handOrder) expect(lowestOf(g, id, g.fanPose(id)) - 0.012).toBeGreaterThan(0);
    }
  }, 60000);

  it('during the deal, every card stays above the floor', async () => {
    const s = await createSession({ round: {} });
    const g = s.game;
    for (let k = 0; k < 40; k++) {
      s.wait(0.1);
      for (const id of g.handOrder) {
        const body = g.bodies[id];
        const q = body.rotation();
        const angle = 2 * Math.atan2(q.z, q.w); // cards only turn about z in the hand
        expect(lowestOf(g, id, { y: body.translation().y, angle })).toBeGreaterThan(0);
      }
    }
  }, 30000);
});
