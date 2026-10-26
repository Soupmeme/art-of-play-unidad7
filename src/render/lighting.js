// Lighting cues: the stage's lights follow the play. Light only, so rule 1
// is untouched; nothing here touches physics.
//   - While a card is held, the follow spot finds it.
//   - In the finale the house dims, the key and washes come down, the follow
//     spot opens onto the line, every bulb burns, and the backdrop's marquee
//     finally spells ART OF PLAY (the reading moment).
// Every level eases toward its target, so cues fade rather than snap.

import { STAGE_LIGHTS } from '../config.js';

const ease = (current, target, rate, dt) => current + (target - current) * Math.min(1, rate * dt);

export function createLightCues({ view, game, typeSurfaces, stage }) {
  const { house, key, washes, footlights, follow } = view.lights;
  const base = { house: house.intensity, key: key.intensity, wash: washes[0].intensity, foot: footlights.intensity };
  let marquee = 'words';
  let last = null;

  return function update(seconds) {
    const dt = last === null ? 0 : Math.min(0.1, seconds - last);
    last = seconds;
    const finale = game.finaleProgress;
    const k = Math.min(1, finale * 1.5); // the room settles a little ahead of the line
    const c = STAGE_LIGHTS;

    house.intensity = ease(house.intensity, base.house * (1 - k * (1 - c.finaleHouse)), c.rate, dt);
    key.intensity = ease(key.intensity, base.key * (1 - k * (1 - c.finaleKey)), c.rate, dt);
    for (const w of washes) w.intensity = ease(w.intensity, base.wash * (1 - k * (1 - c.finaleWash)), c.rate, dt);
    footlights.intensity = ease(footlights.intensity, base.foot * (1 - k * (1 - c.finaleFoot)), c.rate, dt);

    let target = 0;
    if (finale > 0) {
      follow.angle = c.finaleAngle;
      follow.target.position.set(c.finaleTarget.x, c.finaleTarget.y, c.finaleTarget.z);
      target = c.finaleFollow;
    } else if (game.held) {
      const p = game.bodies[game.held.id].translation();
      follow.angle = c.holdAngle;
      follow.target.position.set(p.x, p.y, p.z);
      target = c.holdFollow;
    }
    follow.intensity = ease(follow.intensity, target, c.rate, dt);
    follow.target.updateMatrixWorld();

    const wanted = finale > 0 ? 'phrase' : 'words';
    if (wanted !== marquee) {
      marquee = wanted;
      typeSurfaces.setMarquee(marquee);
    }
    stage.update(seconds, { allLit: finale > 0 });
  };
}
