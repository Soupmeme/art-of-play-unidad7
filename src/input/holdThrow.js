// The two verbs, hold and throw, from the mouse: press on a letter to hold
// it, move to carry and aim, release to throw. No other input exists.

import * as THREE from 'three';
import { HOLDABLE } from '../letters/letters.js';
import { pointerVelocity, planThrow, clampAim } from './throwMapping.js';
import { nearestOnScreen } from './picking.js';
import { HOLD, THROW, WORLD } from '../config.js';

const SAMPLE_HISTORY_MS = 250;
const PICK_REACH = 0.045; // screen heights: how near the pointer a missed letter may be

export function createHoldThrow({ canvas, camera, game, meshes }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const holdPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -HOLD.planeZ);
  const wallPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -game.wall.z);
  const hit = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let pixel = { x: 0, y: 0, width: 1, height: 1 };
  let samples = [];
  let pointerId = null;
  let lastInputTime = 0;

  // Screen position in screen heights (so speeds do not depend on window size).
  function read(event) {
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    pixel = { x: px, y: py, width: rect.width, height: rect.height };
    ndc.set((px / rect.width) * 2 - 1, -(py / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return { t: event.timeStamp, x: px / rect.height, y: py / rect.height };
  }

  // A ray hit on the letter's mesh first; failing that, the nearest holdable
  // letter on screen within reach (for letters lying flat far away).
  function letterUnderPointer() {
    const hits = raycaster.intersectObjects(meshes, false);
    for (const h of hits) {
      const letter = game.letters[h.object.userData.letterId];
      if (HOLDABLE.has(letter.status)) return letter;
    }
    const candidates = game.letters
      .filter((letter) => HOLDABLE.has(letter.status))
      .map((letter) => {
        const body = game.bodies[letter.id];
        const points = game.forms[letter.id].boxes.map((b) => {
          projected.set(b.x, b.y, 0).applyQuaternion(body.rotation()).add(body.translation()).project(camera);
          return { x: ((projected.x + 1) / 2) * pixel.width, y: ((1 - projected.y) / 2) * pixel.height };
        });
        return { letter, points };
      });
    return nearestOnScreen(candidates, pixel, PICK_REACH * pixel.height);
  }

  function aimHold() {
    if (raycaster.ray.intersectPlane(holdPlane, hit)) game.setHoldTarget(hit);
  }

  function onDown(event) {
    if (event.button !== 0 || game.held) return;
    const sample = read(event);
    const letter = letterUnderPointer();
    if (!letter || !game.hold(letter)) return;
    pointerId = event.pointerId;
    capture(true);
    samples = [sample];
    lastInputTime = sample.t;
    aimHold();
    canvas.style.cursor = 'grabbing';
  }

  function onMove(event) {
    const sample = read(event);
    if (event.pointerId !== pointerId) {
      if (!game.held) canvas.style.cursor = letterUnderPointer() ? 'grab' : 'default';
      return;
    }
    samples.push(sample);
    while (samples.length > 2 && samples[0].t < sample.t - SAMPLE_HISTORY_MS) samples.shift();
    lastInputTime = sample.t;
    aimHold();
  }

  // Capture keeps the release even when the pointer leaves the canvas. Scripted
  // (synthetic) pointers cannot be captured, which is harmless.
  function capture(on) {
    try {
      if (on) canvas.setPointerCapture(pointerId);
      else canvas.releasePointerCapture(pointerId);
    } catch {
      /* synthetic pointer */
    }
  }

  function onUp(event) {
    if (event.pointerId !== pointerId || !game.held) return;
    const sample = read(event);
    samples.push(sample);
    const pointer = pointerVelocity(samples, THROW.smoothingMs);
    const onWall = raycaster.ray.intersectPlane(wallPlane, hit) ?? hit.set(0, 1, game.wall.z);
    const target = clampAim(onWall, { halfWidth: game.wall.halfWidth, top: game.wall.top, inset: THROW.aimInset });
    const body = game.bodies[game.held.id];
    const plan = planThrow({
      pointer,
      from: body.translation(),
      target,
      params: THROW,
      gravity: -WORLD.gravity.y,
    });
    game.release(event.type === 'pointercancel' ? { kind: 'drop', power: 0, pointerSpeed: 0 } : plan);
    capture(false);
    pointerId = null;
    samples = [];
    lastInputTime = sample.t;
    canvas.style.cursor = 'default';
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return {
    get lastInputTime() {
      return lastInputTime;
    },
  };
}
