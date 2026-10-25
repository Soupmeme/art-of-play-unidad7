// Dev-only tuning panel (lil-gui ships inside three's addons). Edits the same
// config objects the game reads every step, so changes apply live.

import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { THROW, HOLD, AIR, CARD, EFFECTS } from '../config.js';
import { STATUS } from '../letters/letters.js';
import { FAMILY } from '../letters/families.js';

export function createDevPanel({ game, colliderDebug }) {
  const gui = new GUI({ title: 'dev' });

  const t = gui.addFolder('Throw mapping');
  t.add(THROW, 'smoothingMs', 20, 200, 5);
  t.add(THROW, 'dropSpeed', 0, 2, 0.05);
  t.add(THROW, 'fullSpeed', 0.5, 6, 0.1);
  t.add(THROW, 'minLaunch', 0, 15, 0.5);
  t.add(THROW, 'maxLaunch', 5, 30, 0.5);
  t.add(THROW, 'gravityComp', 0.8, 1.6, 0.01);
  t.add(THROW, 'spinGain', 0, 20, 0.5);
  t.add(THROW, 'maxSpin', 0, 40, 1);

  const h = gui.addFolder('Hold').close();
  h.add(HOLD, 'maxSpeed', 2, 40, 1);
  h.add(HOLD, 'slowRadius', 0.05, 2, 0.05);
  h.add(HOLD, 'maxAccel', 50, 1500, 10);
  h.add(HOLD, 'uprightGain', 0, 40, 1);
  h.add(HOLD, 'uprightBlend', 1, 60, 1);

  const m = gui.addFolder('Card and air').close();
  m.add(AIR, 'coefficient', 0, 0.1, 0.001).name('air drag');
  const eachLetterCollider = (fn) =>
    game.bodies.forEach((body) => {
      for (let i = 0; i < body.numColliders(); i++) fn(body.collider(i));
    });
  m.add(CARD, 'restitution', 0, 1, 0.01).onChange((v) => eachLetterCollider((c) => c.setRestitution(v)));
  m.add(CARD, 'friction', 0, 1.5, 0.01).onChange((v) => eachLetterCollider((c) => c.setFriction(v)));
  m.add(CARD, 'angularDamping', 0, 3, 0.05).onChange((v) => game.bodies.forEach((b) => b.setAngularDamping(v)));

  const e = gui.addFolder('Letter effects').close();
  e.add(EFFECTS.stick, 'minSpeed', 0, 20, 0.5).name('stick speed');
  e.add(EFFECTS.stick, 'approachCone', 0, 90, 1).name('stick cone');
  e.add(EFFECTS.stick, 'faceCone', 0, 90, 1).name('stick face cone');
  e.add(EFFECTS.curve, 'gain', 0, 0.4, 0.005).name('curve gain');
  e.add(EFFECTS.curve, 'biasSpin', -20, 20, 0.5).name('curve bias spin');
  e.add(EFFECTS.ripple, 'restitution', 0, 1, 0.01)
    .name('ripple bounce')
    .onChange((v) =>
      game.letters
        .filter((l) => l.family === FAMILY.ripple)
        .forEach((l) => {
          const body = game.bodies[l.id];
          for (let i = 0; i < body.numColliders(); i++) body.collider(i).setRestitution(v);
        }),
    );
  e.add(EFFECTS.ripple, 'radius', 0, 6, 0.1).name('ripple radius');
  e.add(EFFECTS.ripple, 'strength', 0, 8, 0.1).name('ripple strength');
  e.add(EFFECTS.ripple, 'wallShake').name('ripple wall shake');

  const actions = {
    'return letters to fan': () => game.letters.forEach((l) => l.status !== STATUS.held && game.placeInFan(l)),
    'show colliders': false,
  };
  gui.add(actions, 'return letters to fan');
  gui.add(actions, 'show colliders').onChange((v) => {
    colliderDebug.lines.visible = v;
  });

  return gui;
}

// Lines for the info overlay.
export function describeState(game, rapierVersion, physics) {
  const lines = [`rapier ${rapierVersion}  steps ${physics.stepCount}  bricks ${game.bricks.length}`];
  lines.push(game.letters.map((l) => `${l.char}(${l.family[0]}):${l.status}`).join(' '));
  const c = game.lastContact;
  if (c) {
    const parts = [`last contact ${c.letter}: ${c.speed.toFixed(1)} u/s`];
    if (c.approach !== undefined) parts.push(`approach ${c.approach.toFixed(0)} deg  face ${c.face.toFixed(0)} deg  -> ${c.stick ? 'STICK' : 'bounce'}`);
    if (c.ripple) parts.push('RIPPLE');
    lines.push(parts.join('  '));
  }
  const p = game.lastPlan;
  if (p) {
    const deg = (r) => ((r * 180) / Math.PI).toFixed(1);
    lines.push(
      p.kind === 'throw'
        ? `last ${p.letter}: pointer ${p.pointerSpeed.toFixed(2)} H/s  power ${p.power.toFixed(2)}  launch ${p.launchSpeed.toFixed(1)} u/s  elev ${deg(p.elevation)} deg  spin ${p.spin.toFixed(1)} rad/s  aim (${p.target.x.toFixed(2)}, ${p.target.y.toFixed(2)})`
        : `last ${p.letter}: drop (pointer ${p.pointerSpeed.toFixed(2)} H/s)`,
    );
  }
  return lines;
}
