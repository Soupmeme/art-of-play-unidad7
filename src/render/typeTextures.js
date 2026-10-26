// Textures drawn from the Cinzel letterforms themselves (no font file at
// runtime): a glyph atlas of the phrase's letters, and a wide strip with the
// stage's marquee words set in type, used as the mask of the big scrolling
// banner. The words use only the letters of ART OF PLAY (rule 1).

import * as THREE from 'three';
import { glyphContours, advanceWidth, kerning } from '../letters/glyphs.js';

export const ATLAS_CHARS = 'ARTOFPLY'; // atlas order; A appears twice in the phrase

function fillGlyph(ctx, char, x, baseline, capPx) {
  const { contours } = glyphContours(char, 1);
  ctx.beginPath();
  for (const pts of contours) {
    pts.forEach((p, i) => {
      const px = x + p.x * capPx;
      const py = baseline - p.y * capPx;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }
  ctx.fill('evenodd'); // keeps the counters of A, O, P, R open
}

// One square cell per letter, white on black, letter centred in its cell.
export function createGlyphAtlas(cellPx = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * ATLAS_CHARS.length;
  canvas.height = cellPx;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  const cap = cellPx * 0.7;
  [...ATLAS_CHARS].forEach((char, i) => {
    const { bounds } = glyphContours(char, 1);
    const width = (bounds.maxX - bounds.minX) * cap;
    const x = i * cellPx + (cellPx - width) / 2 - bounds.minX * cap;
    fillGlyph(ctx, char, x, cellPx / 2 + cap / 2, cap);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// ART OF PLAY set with the font's advance widths and kerning, followed by a
// gap, so the strip repeats seamlessly as it scrolls.
export function createBannerMask(words, heightPx = 128) {
  const text = words.join(' ');
  const cap = heightPx * 0.78;
  const space = 2.2; // a marquee-wide gap between words
  const trailing = space;
  const pieces = [];
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      units += space;
      continue;
    }
    const prev = text[i - 1];
    if (prev && prev !== ' ') units += kerning(prev + char);
    pieces.push({ char, at: units });
    units += advanceWidth(char);
  }
  units += trailing;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(units * cap);
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  for (const p of pieces) fillGlyph(ctx, p.char, (p.at + trailing / 2) * cap, heightPx / 2 + cap / 2, cap);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return { texture, aspect: canvas.width / canvas.height };
}
