// Materials for a letter-card: plain ivory stock on the face and back, the
// cut edge in oxblood. Both can glow (emissive) when the card's word locks.
// Decoys use the same materials, with their tell patched on top.

import * as THREE from 'three';
import { PALETTE } from '../config.js';

export function createCardMaterials() {
  const face = new THREE.MeshStandardMaterial({ color: PALETTE.ivory, roughness: 0.55, emissive: PALETTE.glow, emissiveIntensity: 0 });
  const edge = new THREE.MeshStandardMaterial({ color: PALETTE.oxblood, roughness: 0.7, emissive: PALETTE.glow, emissiveIntensity: 0 });
  return { face, edge };
}
