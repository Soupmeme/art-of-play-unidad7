// The decoy's graded tell, as patched standard materials. Visual only.
//   - Slices: the letter is cut into thin horizontal bands; a share of them
//     jump sideways now and then, like the wall's glitching rows. How many,
//     and how far, grows with `tell` (faint at rest, strong near its false slot).
//   - Tint: the ivory greys a little as the tell grows.
//   - Erosion: pieces drop out in a blocky pattern as `erosion` goes 0 to 1.
// Face and edge materials share the same vertex code, so the mesh never tears.

const HASH = /* glsl */ `
float decoyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

export function createDecoyMaterials({ face, edge, seed }) {
  const uniforms = {
    uTime: { value: 0 },
    uTell: { value: 0 },
    uErosion: { value: 0 },
    uSeed: { value: seed },
  };
  // Chained after any patch the card material already has.
  const patch = (material) => {
    const cardPatch = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      cardPatch.call(material, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uTell;\nuniform float uSeed;\nvarying vec3 vDecoyLocal;\n${HASH}`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vDecoyLocal = position;
          float band = floor(position.y * 16.0);
          float tick = floor(uTime * 11.0);
          float slipping = step(1.0 - (0.12 + 0.6 * uTell), decoyHash(vec2(band + uSeed, tick)));
          transformed.x += slipping * (decoyHash(vec2(band + 31.0, tick + uSeed)) - 0.5) * 0.2 * uTell;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uTell;\nuniform float uErosion;\nvarying vec3 vDecoyLocal;\n${HASH}`)
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          if (decoyHash(floor(vDecoyLocal.xy * 14.0) + 3.0) < uErosion) discard;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.57, 0.54), 0.35 * uTell);`,
        );
    };
    return material;
  };
  return { materials: [patch(face), patch(edge)], uniforms };
}

