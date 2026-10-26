// Dev-only tuning panel (lil-gui ships inside three's addons). Edits the same
// config objects the game reads every step, so changes apply live.

import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { THROW, HOLD, AIR, CARD, EFFECTS, WORD_RULES, DECOYS, DECAY, RESET } from '../config.js';
import { FAMILY } from '../letters/families.js';

export function createDevPanel({ game, colliderDebug, view }) {
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

  const w = gui.addFolder('Words').close();
  w.add(WORD_RULES, 'hintRadius', 0.5, 5, 0.1);
  w.add(WORD_RULES, 'pullRadius', 0.3, 4, 0.1);
  w.add(WORD_RULES, 'depthTolerance', 0.1, 3, 0.1);
  w.add(WORD_RULES, 'snapDistance', 0.02, 0.5, 0.01);
  w.add(WORD_RULES, 'alignAngle', 2, 45, 1);
  w.add(WORD_RULES, 'pullStiffness', 5, 120, 1);
  w.add(WORD_RULES, 'pullDamping', 0.2, 2, 0.05);
  w.add(WORD_RULES, 'tremble', 0, 0.05, 0.001).name('warm tremble');
  w.add(WORD_RULES, 'leanOffset', 0, 0.2, 0.005).name('warm lean');

  const d = gui.addFolder('Decoys').close();
  d.add(DECOYS, 'count', 0, 3, 1).name('at most (0 = off)');
  d.add(DECOYS, 'firstAfter', 0, 120, 1).name('first after s');
  d.add(DECOYS, 'intervalMin', 2, 60, 1);
  d.add(DECOYS, 'intervalMax', 2, 90, 1);
  d.add(DECOYS, 'lifetime', 5, 120, 1);
  d.add(DECOYS, 'tellBase', 0, 1, 0.01).name('tell at rest');
  d.add(DECOYS, 'tellHeld', 0, 1, 0.01).name('tell held');
  let nextChar = 0; // cycles through the letters; no randomness outside the seeded rng
  const shedNow = {
    'shed a decoy now': () => {
      if (game.decoys.length >= 3) return;
      game.shedDecoy({ char: DECOYS.chars[nextChar++ % DECOYS.chars.length], x: 0, y: 2.5, spin: 0 });
    },
  };
  d.add(shedNow, 'shed a decoy now');

  const w2 = gui.addFolder('Decay and reset').close();
  w2.add(DECAY, 'grace', 0, 120, 1).name('grace s');
  w2.add(DECAY, 'rise', 0, 0.05, 0.001).name('D per s');
  w2.add(DECAY, 'intervalMax', 1, 30, 0.5).name('interval at D=0');
  w2.add(DECAY, 'intervalMin', 0.5, 15, 0.5).name('interval at D=1');
  w2.add(DECAY, 'clusterMax', 1, 8, 1);
  w2.add(DECAY, 'telegraph', 0.1, 3, 0.05).name('telegraph s');
  w2.add(DECAY, 'respite', 0, 60, 1).name('lock respite s');
  w2.add(DECAY, 'collapseFraction', 0.1, 1, 0.05);
  w2.add(RESET, 'quietSeconds', 5, 120, 1).name('quiet reset s');
  const decayActions = {
    'drop a brick now': () => {
      const i = game.standing.findIndex((up, k) => up && game.shudderStart[k] === null);
      if (i >= 0) game.shudderStart[i] = game.time;
    },
    'reset now': () => game.beginReset('dev'),
  };
  w2.add(decayActions, 'drop a brick now');
  w2.add(decayActions, 'reset now');

  const actions = {
    'new round (shuffle and deal)': () => game.startRound(),
    'show colliders': false,
  };
  gui.add(actions, 'new round (shuffle and deal)');
  // For the logbook: renders a frame and saves it as a PNG download.
  const shots = {
    'save screenshot (PNG)': () => {
      view.render();
      const link = document.createElement('a');
      link.download = `art-of-play-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      link.href = view.renderer.domElement.toDataURL('image/png');
      link.click();
    },
  };
  gui.add(shots, 'save screenshot (PNG)');
  gui.add(actions, 'show colliders').onChange((v) => {
    colliderDebug.lines.visible = v;
  });

  return gui;
}

// Lines for the info overlay.
export function describeState(game, rapierVersion, physics) {
  const lines = [`rapier ${rapierVersion}  steps ${physics.stepCount}  bricks ${game.bricks.length}`];
  lines.push(game.letters.map((l) => `${l.char}(${l.family[0]}):${l.status}`).join(' '));
  const r = game.resolution;
  lines.push(
    Object.entries(r.words)
      .map(([w, x]) => `${w} ${x.state}${x.anchor !== null ? ` anchor ${game.letters[x.anchor].char}` : ''}${x.leader !== null ? ` leader ${game.letters[x.leader].char}` : ''}`)
      .join('  |  '),
  );
  lines.push(
    game.letters
      .map((l) => {
        const info = r.letters[l.id];
        return `${l.char}: w ${info.warmth.toFixed(2)}${info.pulled ? ' PULL' : ''}`;
      })
      .join('  '),
  );
  lines.push(
    `play ${game.playTime.toFixed(0)} s  next shed ${game.shedder.next.toFixed(0)} s  decoys: ` +
      (game.decoys.map((x) => `${x.char}:${x.status} tell ${x.tell.toFixed(2)} erode ${x.erosion.toFixed(2)}`).join('  ') || 'none'),
  );
  lines.push(
    `wall: D ${game.decay.D.toFixed(2)}  next event ${game.decay.nextEvent.toFixed(0)} s  fallen ${game.fallen}/${game.bricks.length}  quiet ${game.quietFor.toFixed(0)}/${RESET.quietSeconds} s${game.resetting ? '  RESETTING (' + game.resetting.reason + ')' : ''}`,
  );
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
