// The type animation, as a lit standard material with a patched fragment
// shader. The surface is divided into character cells; each cell shows one
// letter of the phrase from the glyph atlas. Content moves in whole-cell
// steps, like a text-mode (ASCII) animation:
//   - every row scrolls sideways at `scroll` cells per second;
//   - now and then a share of rows jumps out of line by up to `jag` cells;
//   - with a banner mask, cells inside the big ART OF PLAY are lit, the rest
//     are dim with a few flickering; without one, every cell is lit at `flat`.
// Purely visual: it never touches physics.

import * as THREE from 'three';

const GLSL = /* glsl */ `
uniform float uTime;
uniform sampler2D uAtlas;
uniform sampler2D uMask;
uniform float uUseMask;
uniform vec2 uGrid;
uniform float uAspect;
uniform float uMaskAspect;
uniform float uBannerHeight;
uniform float uBannerCenter;
uniform float uScroll;
uniform float uJag;
uniform float uJagRate;
uniform float uJagShare;
uniform float uDim;
uniform float uFlicker;
uniform float uFlat;
uniform float uGlow;
uniform vec3 uBase;
uniform vec3 uInk;
uniform vec2 uSize; // surface size in world units
uniform vec4 uPulse[4]; // impacts: x, y (from the bottom-left corner), start time, kind (0 none, 1 stick, 2 ripple, 3 bounce)
varying vec2 vAsciiUv;

// Atlas index of each letter of ARTOFPLAY (atlas order A R T O F P L Y).
const float PHRASE[9] = float[9](0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 0.0, 7.0);

float asciiHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float asciiInk(vec2 uv) {
  vec2 cell = uv * uGrid;
  vec2 id = floor(cell);
  vec2 f = fract(cell);

  // Impacts answer in the type itself: a Stick hit lights the cells it bit
  // into, a Ripple sends a ring outward that knocks cells out of line, a plain
  // bounce leaves a faint flash.
  vec2 pos = (id + 0.5) / uGrid * uSize;
  float flash = 0.0;
  float shove = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 p = uPulse[i];
    float age = uTime - p.z;
    if (p.w < 0.5 || age < 0.0) continue;
    float d = distance(pos, p.xy);
    if (p.w < 1.5) {
      flash = max(flash, step(d, 0.6) * (1.0 - smoothstep(0.0, 0.7, age)));
    } else if (p.w < 2.5) {
      float fade = 1.0 - smoothstep(0.0, 1.4, age);
      float band = 1.0 - smoothstep(0.0, 0.3, abs(d - age * 4.0));
      flash = max(flash, band * fade);
      shove += band * fade * 3.0;
    } else {
      flash = max(flash, 0.5 * step(d, 0.35) * (1.0 - smoothstep(0.0, 0.3, age)));
    }
  }

  float tick = floor(uTime * uJagRate);
  float glitched = step(1.0 - uJagShare, asciiHash(vec2(id.y, tick + 17.0)));
  float jag = glitched * floor((asciiHash(vec2(id.y, tick)) - 0.5) * 2.0 * uJag + 0.5);
  jag += floor(shove + 0.5) * (mod(id.y, 2.0) * 2.0 - 1.0); // alternate rows shove opposite ways
  float src = id.x + floor(uTime * uScroll) + jag; // content column shown in this cell

  float level = uFlat;
  if (uUseMask > 0.5) {
    // Sample the banner once per cell, so the big letters are built of cells.
    float xH = (src + 0.5) / uGrid.x * uAspect;
    float yB = ((id.y + 0.5) / uGrid.y - uBannerCenter) / uBannerHeight + 0.5;
    float cover = (yB > 0.0 && yB < 1.0) ? texture(uMask, vec2(xH / (uBannerHeight * uMaskAspect), yB)).r : 0.0;
    float lit = step(1.0 - uFlicker, asciiHash(vec2(src, id.y) + floor(uTime * 3.0)));
    level = max(step(0.5, cover), max(uDim, lit * 0.45));
  }
  level = max(level, flash);

  int k = int(mod(src + id.y * 4.0, 9.0));
  vec2 g = vec2((PHRASE[k] + mix(0.06, 0.94, f.x)) / 8.0, mix(0.04, 0.96, f.y));
  return texture(uAtlas, g).r * level;
}
`;

export function createAsciiMaterial({
  atlas,
  grid,
  aspect = 1,
  mask = null,
  maskAspect = 1,
  base,
  ink,
  params,
  flat = 1,
  scroll = params.scroll,
  size = { x: 1, y: 1 },
  roughness = 0.8,
}) {
  const uniforms = {
    uTime: { value: 0 },
    uAtlas: { value: atlas },
    uMask: { value: mask },
    uUseMask: { value: mask ? 1 : 0 },
    uGrid: { value: new THREE.Vector2(grid.x, grid.y) },
    uAspect: { value: aspect },
    uMaskAspect: { value: maskAspect },
    uBannerHeight: { value: params.bannerHeight },
    uBannerCenter: { value: params.bannerCenter },
    uScroll: { value: scroll },
    uJag: { value: params.jag },
    uJagRate: { value: params.jagRate },
    uJagShare: { value: params.jagShare },
    uDim: { value: params.dim },
    uFlicker: { value: params.flicker },
    uFlat: { value: flat },
    uGlow: { value: params.glow },
    uBase: { value: new THREE.Color(base) },
    uInk: { value: new THREE.Color(ink) },
    uSize: { value: new THREE.Vector2(size.x, size.y) },
    uPulse: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },
  };

  const material = new THREE.MeshStandardMaterial({ color: base, roughness });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vAsciiUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAsciiUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL}`)
      .replace(
        '#include <map_fragment>',
        '#include <map_fragment>\nfloat asciiLit = asciiInk(vAsciiUv);\ndiffuseColor.rgb = mix(uBase, uInk, asciiLit);',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uInk * asciiLit * uGlow;',
      );
  };
  return { material, uniforms };
}
