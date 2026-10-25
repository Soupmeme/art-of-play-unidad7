// Meshes for the letters, the wall and the side lanes. The letter-cards are
// die-cut letterforms; the wall and lanes are solid surfaces whose only
// marking is the type animation made of the phrase's letters.

import * as THREE from 'three';
import { createGlyphAtlas, createBannerMask } from './typeTextures.js';
import { createAsciiMaterial } from './asciiMaterial.js';
import { WALL, ROOM, ASCII, PALETTE } from '../config.js';

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

// The wall slab and the two side lanes, all carrying the type animation.
// Returns update(seconds) to advance the animation clock.
export function createTypeSurfaces(scene, game) {
  const atlas = createGlyphAtlas();
  const banner = createBannerMask();
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
      base: PALETTE.wall,
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
  const PULSE_KIND = { stick: 1, ripple: 2, bounce: 3 };
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
