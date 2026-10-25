// Meshes for letters, wall bricks and rails. Every visible object here is a
// letterform of the phrase (rule 1). Meshes copy body transforms each frame.

import * as THREE from 'three';
import { letterForm } from '../letters/glyphs.js';
import { PHRASE } from '../letters/letters.js';
import { WALL, ROOM, PALETTE } from '../config.js';

export function createLetterMeshes(scene, game) {
  // Extrude groups: 0 = front and back faces, 1 = the cut edge.
  const face = new THREE.MeshStandardMaterial({ color: PALETTE.ivory, roughness: 0.55 });
  const edge = new THREE.MeshStandardMaterial({ color: PALETTE.oxblood, roughness: 0.7 });
  return game.letters.map((letter, i) => {
    const mesh = new THREE.Mesh(game.forms[i].geometry, [face, edge]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.letterId = letter.id;
    scene.add(mesh);
    return mesh;
  });
}

export function syncLetterMeshes(meshes, game) {
  meshes.forEach((mesh, i) => {
    const body = game.bodies[i];
    mesh.position.copy(body.translation());
    mesh.quaternion.copy(body.rotation());
  });
}

// One InstancedMesh per distinct letter. items: { char, position, quaternion }.
function createTypeInstances(scene, items, { capHeight, depth, material }) {
  const byChar = new Map();
  for (const item of items) {
    if (!byChar.has(item.char)) byChar.set(item.char, []);
    byChar.get(item.char).push(item);
  }
  const matrix = new THREE.Matrix4();
  const one = new THREE.Vector3(1, 1, 1);
  const meshes = [];
  for (const [char, list] of byChar) {
    const { geometry } = letterForm(char, { capHeight, depth, colliderCell: 0 });
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((item, k) => {
      mesh.setMatrixAt(k, matrix.compose(item.position, item.quaternion, one));
      item.instance = { mesh, index: k };
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

export function createWallMeshes(scene, game) {
  const material = new THREE.MeshStandardMaterial({ color: PALETTE.brickInk, roughness: 0.85 });
  const identity = new THREE.Quaternion();
  const items = game.bricks.map((b) => ({
    char: b.char,
    position: new THREE.Vector3(b.x, b.y, b.z),
    quaternion: identity,
  }));
  return createTypeInstances(scene, items, { capHeight: WALL.capHeight, depth: WALL.depth, material });
}

// Low rows of letters along the two side boundaries, standing and facing inward.
export function createRailMeshes(scene, game) {
  const material = new THREE.MeshStandardMaterial({ color: PALETTE.brickInk, roughness: 0.85 });
  const outline = game.room.outline;
  const sides = [
    [outline[0], outline[1]],
    [outline[5], outline[4]],
  ];
  const items = [];
  const capHeight = ROOM.railCapHeight;
  for (const [a, b] of sides) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const inward = Math.sign(-a.x) || 1;
    const nx = (-dz / length) * inward;
    const nz = (dx / length) * inward;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(nx, nz));
    let s = 0.2;
    let k = 0;
    while (s < length - 0.2) {
      const char = PHRASE[k % PHRASE.length];
      const w = letterForm(char, { capHeight, depth: 0.08, colliderCell: 0 }).advance;
      const t = (s + w / 2) / length;
      items.push({
        char,
        position: new THREE.Vector3(a.x + dx * t, capHeight / 2, a.z + dz * t),
        quaternion,
      });
      s += w;
      k++;
    }
  }
  return createTypeInstances(scene, items, { capHeight, depth: 0.08, material });
}

// Dev only: Rapier's collider wireframes.
export function createColliderDebug(scene) {
  const geometry = new THREE.BufferGeometry();
  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.6 }),
  );
  lines.renderOrder = 10;
  lines.visible = false;
  scene.add(lines);
  return {
    lines,
    update(world) {
      if (!lines.visible) return;
      const { vertices, colors } = world.debugRender();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    },
  };
}
