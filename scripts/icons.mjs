#!/usr/bin/env node
/* =========================================================================
   icons.mjs

   Redraw every raster icon from the SVG in one step:

     npm run icons

   Reads `public/favicon.svg` and writes the files listed in
   `src/lib/icons.mjs` — the same list the <head> and the manifest link to —
   into `public/`: `favicon.ico` (16, 32 and 48 px), the iOS home-screen icon
   and the manifest's PNGs. Run it whenever the SVG changes, and commit what
   it writes. Each size is drawn from the vector, not shrunk from a big PNG.
   ========================================================================= */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { svgIcon, icoIcon, appleTouchIcon, manifestIcons } from '../src/lib/icons.mjs';

/* Knobs ------------------------------------------------------------------- */

/** How much of its square the maskable icon's drawing fills. Launchers may
 *  crop everything outside the centre circle, 80% of the width. At 0.8 that
 *  circle is the full-width circle the SVG is drawn for, so only the tip of
 *  the flag's foot, which already pokes past it, can be cut off. */
const MASKABLE_SCALE = 0.8;
/** Rasterise this many times larger, then downsample, for smoother edges. */
const SUPERSAMPLE = 4;

/* ------------------------------------------------------------------------- */

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));
const svg = await readFile(PUBLIC + svgIcon);
const { width: frame } = await sharp(svg).metadata();

/** The SVG at `size` px square, transparent corners kept. */
function draw(size) {
  return sharp(svg, { density: (72 * size * SUPERSAMPLE) / frame })
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
}

/** The colour the SVG's background renders as: its commonest pixel. It fills
 *  the corners of the opaque icons. Rendering rounds the background's slight
 *  transparency, so its colour as written would leave a faint edge. */
async function paperColour() {
  const { data } = await sharp(await draw(64)).raw().toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
  }
  const rgb = [...counts].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  return { r: rgb >> 16, g: (rgb >> 8) & 255, b: rgb & 255 };
}
const PAPER = await paperColour();

/** The SVG at `size × scale`, centred on an opaque `size` px square of paper. */
async function drawOpaque(size, scale = 1) {
  const inner = await draw(Math.round(size * scale));
  const composed = await sharp({ create: { width: size, height: size, channels: 3, background: PAPER } })
    .composite([{ input: inner, gravity: 'centre' }])
    .png()
    .toBuffer();
  // Compositing adds an alpha channel; drop it so nothing reads as see-through.
  return sharp(composed).flatten({ background: PAPER }).png({ compressionLevel: 9 }).toBuffer();
}

/** An .ico holding one PNG per size (read by every browser and Windows Vista+). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // width, 0 means 256
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
    header.writeUInt8(0, entry + 2); // palette size
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((png) => png.data)]);
}

const outputs = [
  [icoIcon.path, ico(await Promise.all(icoIcon.sizes.map(async (size) => ({ size, data: await draw(size) }))))],
  [appleTouchIcon.path, await drawOpaque(appleTouchIcon.size)],
  ...(await Promise.all(
    manifestIcons.map(async ({ path, size, purpose }) => [
      path,
      purpose === 'maskable' ? await drawOpaque(size, MASKABLE_SCALE) : await draw(size),
    ])
  )),
];

for (const [path, data] of outputs) {
  await writeFile(PUBLIC + path, data);
  console.log(`public${path}  ${(data.length / 1024).toFixed(1)} KB`);
}
