#!/usr/bin/env node
/* =========================================================================
   texture.mjs

   Turn an export of the paper texture into the file the site serves:

     npm run texture -- <exported image>

   Reads any image sharp opens (WebP, PNG, TIFF…), dark marks on white or on
   transparency, and writes `src/assets/paper-texture.webp`: the marks as
   alpha over black, which global.css tints through a mask. Same size as the
   export, pixel for pixel, and lossless, so the grain stays crisp. It gets
   small by dropping marks too faint to see and rounding the rest to fewer
   shades. No colour profile or metadata: a mask has no use for either.
   ========================================================================= */

import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/* Knobs ------------------------------------------------------------------- */

/** Marks fainter than this, out of 255, are dropped. With the marks tinted
 *  at a third of black, 8 moves no pixel by more than 2 grey levels. */
const FAINTEST = 8;
/** How many shades of ink are kept, the blank paper included. */
const SHADES = 32;

/* ------------------------------------------------------------------------- */

const OUT = fileURLToPath(new URL('../src/assets/paper-texture.webp', import.meta.url));

const src = process.argv[2];
if (!src) {
  console.error('Usage: npm run texture -- <exported image>');
  process.exit(1);
}

const image = sharp(src).rotate();
const { hasAlpha } = await image.metadata();
const { data: grey, info } = await image
  .clone()
  .removeAlpha()
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });
const alpha = hasAlpha ? await image.clone().extractChannel(3).raw().toBuffer() : null;

// Ink is how dark a pixel is times how opaque: black on white and black on
// transparency come out the same.
const step = 255 / (SHADES - 1);
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < grey.length; i++) {
  const ink = Math.round(((alpha ? alpha[i] : 255) * (255 - grey[i])) / 255);
  out[i * 4 + 3] = ink < FAINTEST ? 0 : Math.round(Math.round(ink / step) * step);
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ lossless: true, quality: 100, effort: 6 })
  .toFile(OUT);

const kb = async (file) => ((await stat(file)).size / 1024).toFixed(1);
console.log(`${info.width}×${info.height}: ${await kb(src)} KB → ${await kb(OUT)} KB, src/assets/paper-texture.webp`);
