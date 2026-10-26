// Dev only (brief 7.3): the word function made visible. For every letter in
// play: a ring for hintRadius (faint) and pullRadius (bright) around it,
// facing the camera; for every word with slots: a small cross on each slot,
// with a ring of snapDistance. Lines are debug drawing, never in the play view.

import * as THREE from 'three';
import { WORD_RULES } from '../config.js';

const IN_PLAY = new Set(['flying', 'onTable', 'stuck']);

function ring(radius, color, opacity) {
  const points = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
  });
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false }),
  );
  line.renderOrder = 11;
  return line;
}

function cross(size, color) {
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-size, 0, 0),
    new THREE.Vector3(size, 0, 0),
    new THREE.Vector3(0, -size, 0),
    new THREE.Vector3(0, size, 0),
  ]);
  const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: false }));
  line.renderOrder = 11;
  return line;
}

export function createWordDebug(scene, camera, game) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const perLetter = game.letters.map(() => {
    const hint = ring(1, 0xffd27a, 0.25);
    const pull = ring(1, 0xffd27a, 0.7);
    group.add(hint, pull);
    return { hint, pull };
  });
  const slots = Array.from({ length: 9 }, () => {
    const mark = cross(0.08, 0x7affc1);
    const snap = ring(1, 0x7affc1, 0.6);
    group.add(mark, snap);
    return { mark, snap };
  });

  return {
    group,
    update() {
      if (!group.visible) return;
      game.letters.forEach((letter, i) => {
        const { hint, pull } = perLetter[i];
        const show = IN_PLAY.has(letter.status);
        hint.visible = pull.visible = show;
        if (!show) return;
        const p = game.bodies[letter.id].translation();
        for (const [line, r] of [
          [hint, WORD_RULES.hintRadius],
          [pull, WORD_RULES.pullRadius],
        ]) {
          line.position.set(p.x, p.y, p.z);
          line.quaternion.copy(camera.quaternion);
          line.scale.setScalar(r);
        }
      });
      let k = 0;
      for (const word of Object.values(game.resolution.words)) {
        if (!word.slots || word.state === 'locked') continue;
        for (const s of word.slots) {
          if (k >= slots.length) break;
          const { mark, snap } = slots[k++];
          mark.visible = snap.visible = true;
          mark.position.set(s.x, s.y, s.z);
          snap.position.set(s.x, s.y, s.z);
          mark.quaternion.copy(camera.quaternion);
          snap.quaternion.copy(camera.quaternion);
          snap.scale.setScalar(WORD_RULES.snapDistance);
        }
      }
      for (; k < slots.length; k++) slots[k].mark.visible = slots[k].snap.visible = false;
    },
  };
}
