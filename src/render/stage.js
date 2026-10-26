// The magic stage's dressing, all made of the phrase's letters (rule 1):
//   - curtains: hanging strands of small letters, folded, drawn open at both
//     sides of the backdrop, with a scalloped swag across the top;
//   - marquee bulbs: small glowing Os framing the backdrop, chasing in turn.
// Decoration only: no colliders, nothing here touches physics.

import * as THREE from 'three';
import { letterForm } from '../letters/glyphs.js';
import { PHRASE } from '../letters/letters.js';
import { STAGE, PALETTE } from '../config.js';

// One InstancedMesh per letter for a list of { char, position, quaternion }.
function instances(scene, items, { cap, depth, material, castShadow = false }) {
  const byChar = new Map();
  for (const item of items) {
    if (!byChar.has(item.char)) byChar.set(item.char, []);
    byChar.get(item.char).push(item);
  }
  const matrix = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const meshes = [];
  for (const [char, list] of byChar) {
    const mesh = new THREE.InstancedMesh(letterForm(char, { capHeight: cap, depth, colliderCell: 0 }).geometry, material, list.length);
    list.forEach((item, k) => mesh.setMatrixAt(k, matrix.compose(item.position, item.quaternion, one)));
    mesh.castShadow = castShadow;
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

const yaw = (angle) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

function curtainItems() {
  const c = STAGE.curtain;
  const step = c.cap * 1.08;
  const items = [];
  // Folds: depth follows a sine across the width; each letter turns with the
  // fold's slope, so the strands catch the light like velvet.
  const foldZ = (x) => Math.sin((2 * Math.PI * x) / c.foldWidth);
  const foldSlope = (x) => Math.cos((2 * Math.PI * x) / c.foldWidth);

  let strand = 0;
  for (const side of [-1, 1]) {
    for (let d = c.inner; d <= c.outer; d += c.strandGap, strand++) {
      const x = side * d;
      const depth = c.fold * (0.6 + 0.4 * (d - c.inner) / (c.outer - c.inner)); // fuller toward the wings
      const z = c.z + depth * foldZ(d);
      const q = yaw(side * 0.5 * foldSlope(d));
      for (let j = 0, y = c.cap / 2; y < c.top; j++, y += step) {
        items.push({ char: PHRASE[(strand * 4 + j) % PHRASE.length], position: new THREE.Vector3(x, y, z), quaternion: q });
      }
    }
  }
  // The swag: strands across the top whose lower edge dips in scallops.
  for (let x = -c.outer; x <= c.outer; x += c.strandGap, strand++) {
    const scallop = 0.32 * Math.abs(Math.sin((Math.PI * x) / 1.6));
    const z = c.z + 0.18 + 0.08 * foldZ(x);
    const q = yaw(0.4 * foldSlope(x));
    for (let j = 0, y = c.top - c.cap / 2; y > c.valanceBottom + scallop; j++, y -= step) {
      items.push({ char: PHRASE[(strand * 3 + j) % PHRASE.length], position: new THREE.Vector3(x, y, z), quaternion: q });
    }
  }
  return items;
}

function bulbPositions() {
  const c = STAGE.curtain;
  const b = STAGE.bulbs;
  const z = c.z + 0.32;
  const top = c.valanceBottom - 0.15;
  const edge = c.inner - 0.2;
  const out = [];
  for (let y = 0.35; y < top; y += b.step) out.push(new THREE.Vector3(-edge, y, z));
  for (let x = -edge; x <= edge + 1e-6; x += b.step) out.push(new THREE.Vector3(x, top, z));
  for (let y = top; y > 0.3; y -= b.step) out.push(new THREE.Vector3(edge, y, z));
  return out; // in order around the frame, so the chase runs around it
}

export function createStage(scene) {
  const velvet = new THREE.MeshStandardMaterial({ color: PALETTE.curtain, roughness: 0.78 });
  instances(scene, curtainItems(), { cap: STAGE.curtain.cap, depth: 0.04, material: velvet });

  // Bulbs are unlit Os whose brightness the chase sets per instance.
  const positions = bulbPositions();
  const bulbGeometry = letterForm('O', { capHeight: STAGE.bulbs.cap, depth: 0.05, colliderCell: 0 }).geometry;
  const bulbs = new THREE.InstancedMesh(bulbGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach((p, i) => bulbs.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z)));
  const lit = new THREE.Color(PALETTE.bulb).multiplyScalar(1.6);
  const dim = new THREE.Color(PALETTE.bulb).multiplyScalar(0.35);
  positions.forEach((_, i) => bulbs.setColorAt(i, lit));
  scene.add(bulbs);

  let lastStep = -1;
  return {
    // Marquee chase: every third bulb dims, and the pattern steps around the frame.
    update(seconds) {
      const step = Math.floor(seconds * 5);
      if (step === lastStep) return;
      lastStep = step;
      for (let i = 0; i < positions.length; i++) bulbs.setColorAt(i, (i + step) % 3 === 0 ? dim : lit);
      bulbs.instanceColor.needsUpdate = true;
    },
  };
}
