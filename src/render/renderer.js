// Three.js renderer, scene, camera and the stage lighting. Rendering only: it
// reads physics state each frame and never moves bodies itself.

import * as THREE from 'three';
import { CAMERA, PALETTE } from '../config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.house);
  scene.fog = new THREE.Fog(PALETTE.house, 18, 40);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  camera.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);
  camera.lookAt(CAMERA.lookAt.x, CAMERA.lookAt.y, CAMERA.lookAt.z);

  // Stage lighting: a dim house, a key spot from the rig above, two washes on
  // the backdrop, and a soft front fill (the footlights) so the hand of cards
  // at rest always reads.
  scene.add(new THREE.HemisphereLight(0xffe9d0, PALETTE.house, 0.35));

  const key = new THREE.SpotLight(0xfff0d8, 3.4, 0, 0.62, 0.55, 0);
  key.position.set(0, 11, -3.5);
  key.target.position.set(0, 0, -8.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 30;
  scene.add(key, key.target);

  for (const side of [-1, 1]) {
    const wash = new THREE.SpotLight(side < 0 ? 0xffd7b0 : 0xf3c6c9, 1.3, 0, 0.5, 0.85, 0);
    wash.position.set(side * 7, 7.5, -5.5);
    wash.target.position.set(-side * 1.5, 2.6, -12);
    scene.add(wash, wash.target);
  }

  const footlights = new THREE.DirectionalLight(0xffd9a6, 0.55);
  footlights.position.set(0, 0.4, 2);
  footlights.target.position.set(0, 1, -6);
  scene.add(footlights, footlights.target);

  // The stage boards: a plain dark ground (the one surface that is not a letter).
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.62 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -10;
  floor.receiveShadow = true;
  scene.add(floor);

  // Narrow windows widen the vertical field of view so the sides stay in frame.
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const minHalfTan = CAMERA.minHorizontalHalfTan / camera.aspect;
    const halfTan = Math.max(Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2)), minHalfTan);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfTan));
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // The opening's camera push: the camera starts `offset` units further back
  // and eases into place, still looking at the same point. Staging (4d).
  const lookAt = new THREE.Vector3(CAMERA.lookAt.x, CAMERA.lookAt.y, CAMERA.lookAt.z);
  function setPush(offset) {
    camera.position.set(CAMERA.position.x, CAMERA.position.y + offset * 0.25, CAMERA.position.z + offset);
    camera.lookAt(lookAt);
  }

  return { renderer, scene, camera, setPush, render: () => renderer.render(scene, camera) };
}
