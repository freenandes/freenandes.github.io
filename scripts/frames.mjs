#!/usr/bin/env node
/* =========================================================================
   frames.mjs

   Turn the frames of a drawn animation into one drawing for the home map:

     npm run frames -- <folder of frames> <name>

   Reads every PNG in the folder, in file-name order, dark lines on white or
   on transparency, traces each with potrace (`brew install potrace`) and
   writes `src/assets/decor/<name>.svg`: one `<g data-frame>` per frame, in
   `currentColor`, all cut to the same box, the smallest that holds every
   frame, so the figure doesn't jump as they change. The first frame carries
   `data-shown`, so it's the one a page shows before its script runs;
   src/scripts/flipbook.ts steps through the rest. All frames must be the same
   size.
   ========================================================================= */

import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/* Knobs ------------------------------------------------------------------- */

/** How dark and opaque a pixel must be, out of 255, to count as line. */
const THRESHOLD = 128;
/** Space kept round the frames' shared box, in the frames' pixels. */
const PAD = 4;
/** potrace: specks up to this many pixels are dropped. */
const TURD = 4;
/** potrace: how round the corners come out, 0 (sharp) to 1.33 (round). */
const ALPHAMAX = 1;
/** potrace: how far a curve may stray from the pixels to join the next. */
const OPT = 0.4;

/* ------------------------------------------------------------------------- */

const [dir, name] = process.argv.slice(2);
if (!dir || !name) {
  console.error('Usage: npm run frames -- <folder of frames> <name>');
  process.exit(1);
}
const OUT = fileURLToPath(new URL(`../src/assets/decor/${name}.svg`, import.meta.url));

const files = (await readdir(dir))
  .filter((f) => /\.png$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!files.length) {
  console.error(`No PNG frames in ${dir}`);
  process.exit(1);
}

/** A frame as one byte per pixel, 1 where there's line. */
async function ink(file) {
  const image = sharp(join(dir, file));
  const { hasAlpha } = await image.metadata();
  const { data: grey, info } = await image
    .clone()
    .removeAlpha()
    .toColourspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = hasAlpha ? await image.clone().extractChannel(3).raw().toBuffer() : null;
  const bits = new Uint8Array(grey.length);
  for (let i = 0; i < grey.length; i++) {
    bits[i] = ((alpha ? alpha[i] : 255) * (255 - grey[i])) / 255 >= THRESHOLD ? 1 : 0;
  }
  return { bits, width: info.width, height: info.height };
}

const frames = await Promise.all(files.map(ink));
const { width: W, height: H } = frames[0];
if (frames.some((f) => f.width !== W || f.height !== H)) {
  console.error('The frames are not all the same size.');
  process.exit(1);
}

// The smallest box that holds every frame's lines, padded.
let left = W;
let top = H;
let right = 0;
let bottom = 0;
for (const { bits } of frames) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!bits[y * W + x]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }
  }
}
left = Math.max(0, left - PAD);
top = Math.max(0, top - PAD);
right = Math.min(W, right + PAD);
bottom = Math.min(H, bottom + PAD);
const w = right - left;
const h = bottom - top;

/** A frame cut to the box, as a PBM for potrace. */
function pbm({ bits }) {
  const row = Math.ceil(w / 8);
  const body = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bits[(y + top) * W + x + left]) body[y * row + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([Buffer.from(`P4\n${w} ${h}\n`), body]);
}

const tmp = await mkdtemp(join(tmpdir(), 'frames-'));
const groups = [];
try {
  for (const [i, frame] of frames.entries()) {
    const file = join(tmp, `${i}.pbm`);
    await writeFile(file, pbm(frame));
    // One unit per pixel: whole-pixel coordinates are plenty at the size the
    // map shows the drawing, and keep the file small.
    const svg = execFileSync(
      'potrace',
      ['-b', 'svg', '-u', '1', '-t', String(TURD), '-a', String(ALPHAMAX), '-O', String(OPT), '-o', '-', file],
      { encoding: 'utf8' },
    );
    const d = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim()).join(' ');
    // potrace draws with y up; the flip turns it back the right way.
    groups.push(`<g data-frame=""${i ? '' : ' data-shown=""'} transform="matrix(1 0 0 -1 0 ${h})"><path d="${d}"/></g>`);
  }
} catch (error) {
  if (error.code === 'ENOENT') console.error('potrace is missing: brew install potrace');
  throw error;
} finally {
  await rm(tmp, { recursive: true, force: true });
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="currentColor">\n${groups.join('\n')}\n</svg>\n`;
await writeFile(OUT, out);
console.log(`${files.length} frames, ${w}×${h} → ${OUT} (${Math.round(out.length / 1024)} KB)`);
