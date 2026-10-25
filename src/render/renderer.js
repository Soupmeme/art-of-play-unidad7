// Three.js renderer, scene, camera and lights. Rendering only: it reads
// physics state each frame and never moves bodies itself.

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
  scene.background = new THREE.Color(PALETTE.felt);
  scene.fog = new THREE.Fog(PALETTE.felt, 14, 30);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  camera.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);
  camera.lookAt(CAMERA.lookAt.x, CAMERA.lookAt.y, CAMERA.lookAt.z);

  scene.add(new THREE.HemisphereLight(0xfff4e0, PALETTE.felt, 0.6));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2);
  key.position.set(-3, 8, 2);
  key.target.position.set(0, 0, -6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  scene.add(key, key.target);

  // The felt ground: the table top, the one surface that is not a letter (DECISIONS, flag 5).
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: PALETTE.felt, roughness: 0.95 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.z = -6;
  table.receiveShadow = true;
  scene.add(table);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  return { renderer, scene, camera, render: () => renderer.render(scene, camera) };
}
