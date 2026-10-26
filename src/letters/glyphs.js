// Letterforms: outlines from the committed Cinzel Black typeface JSON, turned
// into thin extruded card geometry and into the compound box colliders the
// physics uses. Works in the browser and in Node (tests).

import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import fontData from '../assets/fonts/cinzel-black.typeface.json';

const font = new Font(fontData);
const CURVE_SEGMENTS = 10;

// Font size that makes the cap height equal to `capHeight` world units.
function sizeForCapHeight(capHeight) {
  return (capHeight * fontData.resolution) / fontData.capHeight;
}

// Advance width (the glyph's typeset width, including side bearings).
export function advanceWidth(char, capHeight = 1) {
  return (fontData.glyphs[char].ha * capHeight) / fontData.capHeight;
}

// Kerning for an adjacent pair inside a word, in world units.
export function kerning(pair, capHeight = 1) {
  return ((fontData.kerning[pair] ?? 0) * capHeight) / fontData.capHeight;
}

// A word set in type: for each letter, its bounding-box centre relative to
// the first letter's centre (dx), its centre's height above the baseline
// (dy), and its half width. Uses the font's advances and kerning plus
// `tracking` (extra space per gap, so neighbouring cards do not overlap).
export function wordLayout(text, tracking = 0, capHeight = 1) {
  let pen = 0;
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const { bounds } = glyphContours(char, capHeight);
    out.push({
      char,
      cx: pen + (bounds.minX + bounds.maxX) / 2,
      dy: (bounds.minY + bounds.maxY) / 2,
      halfWidth: (bounds.maxX - bounds.minX) / 2,
    });
    if (i < text.length - 1) pen += advanceWidth(char, capHeight) + kerning(char + text[i + 1], capHeight) + tracking;
  }
  return out.map((l) => ({ char: l.char, dx: l.cx - out[0].cx, dy: l.dy, halfWidth: l.halfWidth }));
}

// All closed contours of a glyph (outer outlines and holes) as point lists.
export function glyphContours(char, capHeight = 1) {
  const shapes = font.generateShapes(char, sizeForCapHeight(capHeight));
  const contours = [];
  for (const shape of shapes) {
    const { shape: outer, holes } = shape.extractPoints(CURVE_SEGMENTS);
    contours.push(outer, ...holes);
  }
  return { shapes, contours, bounds: boundsOf(contours) };
}

function boundsOf(contours) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const pts of contours) {
    for (const p of pts) {
      b.minX = Math.min(b.minX, p.x);
      b.maxX = Math.max(b.maxX, p.x);
      b.minY = Math.min(b.minY, p.y);
      b.maxY = Math.max(b.maxY, p.y);
    }
  }
  return b;
}

// Even-odd rule over every contour, so the counters of A, O, P, R are outside.
export function pointInGlyph(x, y, contours) {
  let inside = false;
  for (const pts of contours) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i];
      const b = pts[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
  }
  return inside;
}

// Collider approximation: lay a coarse grid over the letter, mark a cell
// filled when at least `threshold` of its sub-samples fall inside the glyph,
// then merge filled cells greedily into as few rectangles as possible.
// The result is a compound of thin boxes that keeps holes and empty corners.
export function rasterBoxes(contours, bounds, cell, { samples = 3, threshold = 0.5 } = {}) {
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cell);
  const rows = Math.ceil((bounds.maxY - bounds.minY) / cell);
  const filled = [];
  for (let r = 0; r < rows; r++) {
    filled.push([]);
    for (let c = 0; c < cols; c++) {
      let hits = 0;
      for (let i = 0; i < samples; i++) {
        for (let j = 0; j < samples; j++) {
          const x = bounds.minX + (c + (i + 0.5) / samples) * cell;
          const y = bounds.minY + (r + (j + 0.5) / samples) * cell;
          if (pointInGlyph(x, y, contours)) hits++;
        }
      }
      filled[r].push(hits / (samples * samples) >= threshold);
    }
  }

  const used = filled.map((row) => row.map(() => false));
  const free = (r, c) => filled[r][c] && !used[r][c];
  const boxes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!free(r, c)) continue;
      let c2 = c;
      while (c2 + 1 < cols && free(r, c2 + 1)) c2++;
      let r2 = r;
      const runFree = (row) => {
        for (let k = c; k <= c2; k++) if (!free(row, k)) return false;
        return true;
      };
      while (r2 + 1 < rows && runFree(r2 + 1)) r2++;
      for (let rr = r; rr <= r2; rr++) for (let k = c; k <= c2; k++) used[rr][k] = true;
      boxes.push({
        x: bounds.minX + ((c + c2 + 1) / 2) * cell,
        y: bounds.minY + ((r + r2 + 1) / 2) * cell,
        halfWidth: ((c2 - c + 1) * cell) / 2,
        halfHeight: ((r2 - r + 1) * cell) / 2,
      });
    }
  }
  return boxes;
}

const cache = new Map();

// Geometry and colliders for one letter, centred on its bounding box so the
// body origin sits in the middle of the letter. Cached per (char, size, depth).
export function letterForm(char, { capHeight = 1, depth = 0.03, colliderCell = 0.08 } = {}) {
  const key = `${char}|${capHeight}|${depth}|${colliderCell}`;
  if (cache.has(key)) return cache.get(key);

  const { shapes, contours, bounds } = glyphContours(char, capHeight);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: CURVE_SEGMENTS });
  geometry.translate(-cx, -cy, -depth / 2);
  geometry.computeVertexNormals();

  // Card UVs: a square of side uvSpan centred on the letter, so the face and
  // back textures (render/cardTextures.js) line up with the letterform.
  const uvSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 1.08;
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / uvSpan + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / uvSpan + 0.5;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  const boxes = colliderCell
    ? rasterBoxes(contours, bounds, colliderCell).map((b) => ({ ...b, x: b.x - cx, y: b.y - cy }))
    : [];

  // Every outline point, centred like the geometry: the convex hull of these
  // is the card's solid outline (used for card-to-card contact).
  const outline = contours.flat().map((p) => ({ x: p.x - cx, y: p.y - cy }));

  const form = {
    char,
    geometry,
    boxes,
    outline,
    uvSpan,
    depth,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    advance: advanceWidth(char, capHeight),
  };
  cache.set(key, form);
  return form;
}
