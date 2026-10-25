// Dev-only: converts Cinzel Black (SIL OFL, from @fontsource/cinzel) into
// three's typeface JSON with only the glyphs the piece uses, plus kerning
// for the letter pairs inside each word. Run with: npm run build:font
// The output is committed, so the app never fetches a font at runtime.

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import opentype from 'opentype.js';

const SOURCE = 'node_modules/@fontsource/cinzel/files/cinzel-latin-900-normal.woff';
const OUT = 'src/assets/fonts/cinzel-black.typeface.json';
const CHARS = 'ARTOFPLY';
const PAIRS = ['AR', 'RT', 'OF', 'PL', 'LA', 'AY'];

const buffer = readFileSync(SOURCE);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const round = (n) => Math.round(n);

const glyphs = {};
for (const char of CHARS) {
  const glyph = font.charToGlyph(char);
  const parts = [];
  // Raw glyph path is in font units with y up, the convention three expects.
  for (const c of glyph.path.commands) {
    if (c.type === 'M') parts.push('m', round(c.x), round(c.y));
    else if (c.type === 'L') parts.push('l', round(c.x), round(c.y));
    else if (c.type === 'Q') parts.push('q', round(c.x), round(c.y), round(c.x1), round(c.y1));
    else if (c.type === 'C') parts.push('b', round(c.x), round(c.y), round(c.x1), round(c.y1), round(c.x2), round(c.y2));
  }
  const box = glyph.getBoundingBox();
  glyphs[char] = { ha: round(glyph.advanceWidth), x_min: round(box.x1), x_max: round(box.x2), o: parts.join(' ') };
}

const kerning = {};
for (const pair of PAIRS) {
  kerning[pair] = font.getKerningValue(font.charToGlyph(pair[0]), font.charToGlyph(pair[1]));
}

const capHeight = font.tables.os2.sCapHeight || font.charToGlyph('T').getBoundingBox().y2;

writeFileSync(
  OUT,
  JSON.stringify({
    familyName: 'Cinzel Black',
    resolution: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    boundingBox: { xMin: 0, yMin: font.descender, xMax: font.unitsPerEm, yMax: font.ascender },
    underlinePosition: 0,
    underlineThickness: 0,
    original_font_information: { license: 'SIL Open Font License 1.1, see OFL.txt' },
    capHeight,
    kerning,
    glyphs,
  }),
);
copyFileSync('node_modules/@fontsource/cinzel/LICENSE', 'src/assets/fonts/OFL.txt');
console.log(`wrote ${OUT}: ${CHARS.length} glyphs, capHeight ${capHeight}, kerning`, kerning);
