// Meshes for the letters, the wall and the side lanes. The letter-cards are
// die-cut letterforms; the wall and lanes are solid surfaces whose only
// marking is the type animation made of the phrase's letters.

import * as THREE from 'three';
import { createGlyphAtlas, createBannerMask } from './typeTextures.js';
import { createAsciiMaterial } from './asciiMaterial.js';
import { createDecoyMaterials, decoyBaseMaterials } from './decoyMaterial.js';
import { WALL, ROOM, ASCII, PALETTE, WORD_RULES } from '../config.js';

const LOCK_GLOW = 0.28;
const FINALE_GLOW = 0.6;
const TELL_EASE = 6; // per second: how fast a decoy's shown tell follows the game's value

// Meshes for every card: the nine letters, plus decoys as the wall sheds them
// and removes them. `meshes` is a live array (the input picks from it).
// Extrude groups: 0 = front and back faces, 1 = the cut edge. Each card has
// its own materials so a locked word can glow, or a decoy glitch, on its own.
export function createCardMeshes(scene, game) {
  const meshes = [];
  const decoyMeshes = new Map(); // decoy id -> { mesh, uniforms, card }

  function addMesh(card, materials) {
    const mesh = new THREE.Mesh(game.forms[card.id].geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.cardId = card.id;
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  }

  for (const letter of game.letters) {
    addMesh(letter, [
      new THREE.MeshStandardMaterial({ color: PALETTE.ivory, roughness: 0.55, emissive: PALETTE.glow, emissiveIntensity: 0 }),
      new THREE.MeshStandardMaterial({ color: PALETTE.oxblood, roughness: 0.7, emissive: PALETTE.glow, emissiveIntensity: 0 }),
    ]);
  }

  function syncDecoys(seconds, dt) {
    for (const decoy of game.decoys) {
      if (decoyMeshes.get(decoy.id)?.card === decoy) continue;
      const { materials, uniforms } = createDecoyMaterials({ ...decoyBaseMaterials(PALETTE), seed: decoy.id * 17.0 + seconds });
      decoyMeshes.set(decoy.id, { mesh: addMesh(decoy, materials), uniforms, card: decoy });
    }
    for (const [id, entry] of decoyMeshes) {
      if (game.decoys.includes(entry.card)) {
        const u = entry.uniforms;
        u.uTime.value = seconds;
        u.uTell.value += (entry.card.tell - u.uTell.value) * Math.min(1, TELL_EASE * dt);
        u.uErosion.value = entry.card.erosion;
        continue;
      }
      scene.remove(entry.mesh);
      entry.mesh.material.forEach((m) => m.dispose());
      meshes.splice(meshes.indexOf(entry.mesh), 1);
      decoyMeshes.delete(id);
    }
  }

  let last = 0;
  // Copies body poses to meshes. Render-only touches:
  //   - locked letters glow (emissive, the one accent colour), more in the finale;
  //   - NON-PHYSICAL (4b): a stuck letter that is warm trembles a few
  //     millimetres on screen; its body, welded to the wall, does not move;
  //   - decoys show their graded tell.
  function sync(seconds) {
    const dt = last ? Math.min(0.1, seconds - last) : 0;
    last = seconds;
    syncDecoys(seconds, dt);
    for (const mesh of meshes) {
      const id = mesh.userData.cardId;
      const card = game.card(id);
      const body = game.bodies[id];
      mesh.position.copy(body.translation());
      mesh.quaternion.copy(body.rotation());
      if (card.decoy) continue;

      const warmth = game.resolution.letters[id].warmth;
      if (card.status === 'stuck' && warmth > 0) {
        const a = WORD_RULES.stuckTremble * warmth;
        mesh.position.x += a * Math.sin(seconds * 61 + id * 1.7);
        mesh.position.y += a * Math.sin(seconds * 47 + id * 2.3);
      }
      const glow = card.status === 'locked' ? LOCK_GLOW + (FINALE_GLOW - LOCK_GLOW) * game.finaleProgress : 0;
      for (const m of mesh.material) m.emissiveIntensity = glow;
    }
  }

  return { meshes, sync };
}

// The wall slab and the two side lanes, all carrying the type animation.
// Returns update(seconds) to advance the animation clock.
export function createTypeSurfaces(scene, game) {
  const atlas = createGlyphAtlas();
  const banner = createBannerMask(ASCII.words);
  const animated = [];

  // Wall: one slab covering the brick grid. Only the front face is animated;
  // sides, top and back are the plain wall colour.
  const width = WALL.cols * WALL.brickWidth;
  const height = WALL.rows * WALL.brickHeight;
  const front = createAsciiMaterial({
    atlas,
    grid: { x: WALL.cols * ASCII.cellsPerBrick.x, y: WALL.rows * ASCII.cellsPerBrick.y },
    aspect: width / height,
    mask: banner.texture,
    maskAspect: banner.aspect,
    base: PALETTE.wall,
    ink: PALETTE.wallInk,
    params: ASCII,
    size: { x: width, y: height },
  });
  animated.push(front.uniforms);
  const plain = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.85 });
  // BoxGeometry face order: +x, -x, +y, -y, +z (front, toward the camera), -z.
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, WALL.depth), [
    plain,
    plain,
    plain,
    plain,
    front.material,
    plain,
  ]);
  wall.position.set(0, height / 2, WALL.z - WALL.depth / 2);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  // Side lanes: low bars along the side glass, type streaming toward the wall.
  const outline = game.room.outline;
  const sides = [
    [outline[0], outline[1]],
    [outline[5], outline[4]],
  ];
  for (const [a, b] of sides) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    // Unit normal of the segment that points into the room (toward x = 0).
    let nx = -dz / length;
    let nz = dx / length;
    if (Math.sign(nx) !== Math.sign(-a.x)) {
      nx = -nx;
      nz = -nz;
    }
    const lane = createAsciiMaterial({
      atlas,
      grid: { x: Math.round(length / ASCII.laneCell), y: 2 },
      base: PALETTE.lane,
      ink: PALETTE.wallInk,
      params: ASCII,
      flat: 0.7,
      scroll: -ASCII.laneScroll,
    });
    animated.push(lane.uniforms);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, ROOM.laneHeight, ROOM.laneWidth), lane.material);
    // Local x runs from the front end toward the wall.
    mesh.rotation.y = Math.atan2(-dz, dx);
    const half = ROOM.laneWidth / 2; // sit just inside the glass
    mesh.position.set((a.x + b.x) / 2 + nx * half, ROOM.laneHeight / 2, (a.z + b.z) / 2 + nz * half);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // New wall impacts from the game become pulses in the wall's type, stamped
  // with the render clock. The four most recent are kept.
  // A decoy shed from the wall, or melting back into it, flashes like a bite.
  // A knocked-out letter sends a small ring, like a ripple.
  const PULSE_KIND = { stick: 1, ripple: 2, bounce: 3, shed: 1, melt: 1, knock: 2 };
  let seen = 0;
  let nextPulse = 0;

  return {
    update(seconds) {
      for (const u of animated) u.uTime.value = seconds;
      for (const impact of game.impacts) {
        if (impact.seq <= seen) continue;
        seen = impact.seq;
        front.uniforms.uPulse.value[nextPulse].set(impact.x + width / 2, impact.y, seconds, PULSE_KIND[impact.kind]);
        nextPulse = (nextPulse + 1) % 4;
      }
    },
  };
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
