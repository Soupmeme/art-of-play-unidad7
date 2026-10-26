// Materials for a letter-card: the face (front and back caps) and the cut
// edge. One standard material draws both caps: the shader picks the face
// texture or the back texture by which way the cap faces (its normal along
// the card's own z), reading the back texture mirrored so it reads the right
// way round from behind. Textures are made once per letter and shared.

import * as THREE from 'three';
import { letterForm } from '../letters/glyphs.js';
import { createCardTextures } from './cardTextures.js';
import { CARD, PALETTE } from '../config.js';

const textures = new Map();

function texturesFor(char) {
  if (!textures.has(char)) {
    const form = letterForm(char, { capHeight: CARD.capHeight, depth: CARD.thickness, colliderCell: CARD.colliderCell });
    textures.set(char, createCardTextures(char, form));
  }
  return textures.get(char);
}

export function createCardMaterials(char) {
  const { face: faceMap, back: backMap } = texturesFor(char);
  const face = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: faceMap,
    roughness: 0.55,
    emissive: PALETTE.glow,
    emissiveIntensity: 0,
  });
  face.onBeforeCompile = (shader) => {
    shader.uniforms.uBackMap = { value: backMap };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vCardSide;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCardSide = normal.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uBackMap;\nvarying float vCardSide;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = vCardSide < -0.5
            ? texture2D(uBackMap, vec2(1.0 - vMapUv.x, vMapUv.y))
            : texture2D(map, vMapUv);
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      );
  };
  const edge = new THREE.MeshStandardMaterial({ color: PALETTE.oxblood, roughness: 0.7, emissive: PALETTE.glow, emissiveIntensity: 0 });
  return { face, edge };
}
