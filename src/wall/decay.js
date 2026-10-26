// The wall decay scheduler (brief 5.6). NON-PHYSICAL (4c): the only
// non-physical trigger in the wall. A seeded function of play time, the
// decay level D and the seed decides which bricks start to shudder; the
// game releases them after the telegraph and they fall under physics.
//
//   D starts at 0, rises by `rise` per second once the grace period is over,
//   and drops by `lockDrop` whenever a word locks.
//   Scheduled events: after the grace period and outside a respite, every
//   lerp(intervalMax, intervalMin, D) seconds (+/- 20%), a cluster of
//   1 + round(D x (clusterMax - 1)) neighbouring bricks is chosen. The first
//   brick is drawn at random, weighted by 1 + stressWeight x stress.
//   Stress releases: a brick whose Ripple stress reaches stressRelease goes on
//   its own, grace or respite notwithstanding (lockout mitigation b).
//   Never chosen: bricks already gone or shuddering, and immune bricks (behind
//   a locked word).

import { createRng } from '../core/rng.js';

const lerp = (a, b, t) => a + (b - a) * t;

// bricks: [{ col, row }] (layoutWall output). Returns the scheduler.
export function createDecayScheduler(seed, params, bricks) {
  const rng = createRng(seed);
  const at = new Map(bricks.map((b, i) => [`${b.col},${b.row}`, i]));
  const neighbours = bricks.map((b) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
      .map(([dc, dr]) => at.get(`${b.col + dc},${b.row + dr}`))
      .filter((i) => i !== undefined),
  );

  const state = { D: 0, nextEvent: params.grace, respiteUntil: -Infinity };

  function pickCluster(size, eligible, stress) {
    const pool = [];
    let total = 0;
    for (let i = 0; i < bricks.length; i++) {
      if (!eligible(i)) continue;
      const w = 1 + params.stressWeight * stress[i];
      pool.push([i, w]);
      total += w;
    }
    if (!pool.length) return [];
    let r = rng.next() * total;
    let first = pool[pool.length - 1][0];
    for (const [i, w] of pool) {
      r -= w;
      if (r <= 0) {
        first = i;
        break;
      }
    }
    // Grow the cluster through neighbours, in a seeded order.
    const cluster = [first];
    const frontier = [...neighbours[first]];
    while (cluster.length < size && frontier.length) {
      const next = frontier.splice(rng.int(0, frontier.length), 1)[0];
      if (cluster.includes(next) || !eligible(next)) continue;
      cluster.push(next);
      frontier.push(...neighbours[next]);
    }
    return cluster;
  }

  return {
    state,
    // One step. ctx: { playTime, dt, eligible(i), stress } -> brick indices to telegraph.
    update({ playTime, dt, eligible, stress }) {
      const chosen = [];
      for (let i = 0; i < bricks.length; i++) {
        if (stress[i] >= params.stressRelease && eligible(i)) chosen.push(i);
      }
      if (playTime < params.grace) return chosen;

      state.D = Math.min(1, state.D + params.rise * dt);
      if (playTime < state.respiteUntil || playTime < state.nextEvent) return chosen;

      const size = 1 + Math.round(state.D * (params.clusterMax - 1));
      const ok = (i) => eligible(i) && !chosen.includes(i);
      chosen.push(...pickCluster(size, ok, stress));
      state.nextEvent = playTime + lerp(params.intervalMax, params.intervalMin, state.D) * rng.range(0.8, 1.2);
      return chosen;
    },
    // A word locked: lower D and grant a respite from scheduled events.
    onLock(playTime) {
      state.D = Math.max(0, state.D - params.lockDrop);
      state.respiteUntil = playTime + params.respite;
      state.nextEvent = Math.max(state.nextEvent, state.respiteUntil);
    },
  };
}
