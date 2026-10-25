import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed } from '../src/core/rng.js';
import { initRapier, createPhysics, createStepper } from '../src/physics/world.js';

describe('seeded rng', () => {
  it('replays the same sequence from the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gives different sequences to different named streams', () => {
    const decay = createRng(deriveSeed(7, 'decay'));
    const sway = createRng(deriveSeed(7, 'sway'));
    expect(decay.next()).not.toEqual(sway.next());
  });

  it('keeps range and int inside their bounds', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const r = rng.range(-2, 3);
      const n = rng.int(0, 9);
      expect(r).toBeGreaterThanOrEqual(-2);
      expect(r).toBeLessThan(3);
      expect(Number.isInteger(n) && n >= 0 && n < 9).toBe(true);
    }
  });
});

describe('physics scaffold (real Rapier in Node)', () => {
  it('drops a body onto the table and it comes to rest at y = 0', async () => {
    const rapier = await initRapier();
    const physics = createPhysics(rapier);
    const body = physics.world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(0, 2, -5));
    physics.world.createCollider(rapier.ColliderDesc.cuboid(0.5, 0.05, 0.5), body);

    const advance = createStepper(physics);
    for (let i = 0; i < 180; i++) advance(physics.step);

    expect(physics.stepCount).toBe(180);
    expect(body.translation().y).toBeCloseTo(0.05, 1);
  });
});
