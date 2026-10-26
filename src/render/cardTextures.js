// Face and back textures for the letter-cards, drawn from the letterforms
// themselves (rule 1: every mark is a letter of the phrase).
//   Face: ivory card stock with a faint micro-type ground (rows of tiny
//         letters of the phrase, a few percent darker, like security printing)
//         and a border of tiny copies of the card's own letter, set just
//         inside its outline, following the cut.
//   Back: an oxblood back with an ivory lattice of the phrase's letters on
//         the diagonal, like a classic card back, and the same border in ivory.
// Both cover a square of side form.uvSpan centred on the letter (see glyphs.js).

import * as THREE from 'three';
import { glyphContours, pointInGlyph } from '../letters/glyphs.js';
import { PHRASE } from '../letters/letters.js';
import { PALETTE } from '../config.js';

const SIZE = 1024;
const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

// Fills a glyph at (x, y) in pixels, cap height `cap` pixels, rotated by
// `angle`, with (x, y) at the glyph's centre.
function stamp(ctx, char, x, y, cap, angle = 0) {
  const { contours, bounds } = glyphContours(char, 1);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (const pts of contours) {
    pts.forEach((p, i) => {
      const px = (p.x - cx) * cap;
      const py = -(p.y - cy) * cap;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }
  ctx.fill('evenodd');
  ctx.restore();
}

function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createCardTextures(char, form) {
  const { contours, bounds } = glyphContours(char, 1);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const px = SIZE / form.uvSpan; // pixels per card unit
  // The back is drawn mirrored: seen from behind, a card shows its silhouette
  // flipped, and the shader reads the back texture flipped, so the back
  // pattern reads the right way round.
  const toPx = (p, mirror = false) => ({ x: (mirror ? -1 : 1) * (p.x - cx) * px + SIZE / 2, y: SIZE / 2 - (p.y - cy) * px });

  const outlinePath = (mirror = false) => {
    const path = new Path2D();
    for (const pts of contours) {
      pts.forEach((p, i) => {
        const q = toPx(p, mirror);
        if (i === 0) path.moveTo(q.x, q.y);
        else path.lineTo(q.x, q.y);
      });
      path.closePath();
    }
    return path;
  };

  // The border: tiny copies of the letter, inset from every contour (outer
  // edges and counters alike), turned to follow the cut.
  function border(ctx, colour, mirror = false) {
    const cap = 0.045; // card units
    const inset = 0.05;
    const spacing = cap * 1.25;
    ctx.fillStyle = colour;
    for (const pts of contours) {
      let walked = 0; // distance along this contour so far
      let next = spacing / 2; // where the next stamp goes
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len < 1e-6) continue;
        const tx = (b.x - a.x) / len;
        const ty = (b.y - a.y) / len;
        // Inward normal: whichever side is inside the glyph.
        let nx = -ty;
        let ny = tx;
        if (!pointInGlyph((a.x + b.x) / 2 + nx * 0.01, (a.y + b.y) / 2 + ny * 0.01, contours)) {
          nx = -nx;
          ny = -ny;
        }
        for (; next <= walked + len; next += spacing) {
          const d = next - walked;
          const p = toPx({ x: a.x + tx * d + nx * inset, y: a.y + ty * d + ny * inset }, mirror);
          stamp(ctx, char, p.x, p.y, cap * px, -Math.atan2(ty, mirror ? -tx : tx));
        }
        walked += len;
      }
    }
  }

  // Face.
  const face = document.createElement('canvas');
  face.width = face.height = SIZE;
  let ctx = face.getContext('2d');
  ctx.fillStyle = css(PALETTE.ivory);
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.clip(outlinePath(), 'evenodd');
  ctx.fillStyle = '#e2d6bd'; // micro-type, a few percent darker than the stock
  const micro = 0.03 * px;
  for (let row = 0, y = micro; y < SIZE; row++, y += micro * 1.5) {
    for (let k = 0, x = (row % 2) * micro * 0.6; x < SIZE; k++, x += micro * 1.2) {
      stamp(ctx, PHRASE[(row * 3 + k) % PHRASE.length], x, y, micro);
    }
  }
  border(ctx, css(PALETTE.oxblood));
  ctx.restore();

  // Back.
  const back = document.createElement('canvas');
  back.width = back.height = SIZE;
  ctx = back.getContext('2d');
  ctx.fillStyle = css(PALETTE.oxblood);
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.clip(outlinePath(true), 'evenodd');
  ctx.fillStyle = 'rgba(239, 230, 210, 0.55)';
  const lattice = 0.07 * px;
  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.rotate(Math.PI / 4);
  for (let row = -12; row <= 12; row++) {
    for (let k = -12; k <= 12; k++) {
      const turn = (row + k) % 2 === 0 ? 0 : Math.PI;
      stamp(ctx, PHRASE[(((row * 2 + k) % PHRASE.length) + PHRASE.length) % PHRASE.length], k * lattice, row * lattice, lattice * 0.5, turn);
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  border(ctx, css(PALETTE.ivory), true);
  ctx.restore();

  return { face: texture(face), back: texture(back) };
}
