#!/usr/bin/env node
/* =========================================================================
   og-image.mjs

   Redraw the link-preview image in one step:

     npm run og

   Opens `scripts/og/card.html` in headless Chrome, fills in the name and role
   from `src/site.config.ts`, and photographs it at the size `ogImage` gives
   into the file it names (`public/og.png`). Run it whenever the name, the role
   or the card changes, and commit what it writes. It stops instead of writing
   if the webfonts didn't load or any text spills out of the centre square.

   Needs Chrome: it finds a local one, or the cloud image's Chromium
   (`CHROME_PATH` overrides), the same way `npm run visual` does.
   ========================================================================= */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { runnerImport } from 'vite';
import { findChrome } from './visual/capture.mjs';

/* Knobs ------------------------------------------------------------------- */

/** Warn above this: some apps skip preview images over a few hundred KB. */
const MAX_BYTES = 300_000;
/** The fonts the card must be set in, checked once the page has loaded. */
const FONTS = ['780 99px "Atkinson Hyperlegible Next"'];

/* ------------------------------------------------------------------------- */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CARD = pathToFileURL(fileURLToPath(new URL('og/card.html', import.meta.url))).href;

const {
  module: { site },
} = await runnerImport('/src/site.config.ts', { root: ROOT, configFile: false, logLevel: 'silent' });
const { width, height, path, type } = site.ogImage;
if (type !== 'image/png' || !path.endsWith('.png')) {
  throw new Error(`og-image: ogImage in site.config.ts must be a PNG to be drawn here (got ${type}, ${path}).`);
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(CARD, { waitUntil: 'networkidle0' });

  const problems = await page.evaluate(
    async ({ name, role, width, height, fonts }) => {
      document.documentElement.style.setProperty('--og-width', `${width}px`);
      document.documentElement.style.setProperty('--og-height', `${height}px`);
      document.querySelector('[data-og="name"]').textContent = name;
      // "X & Y" sets each part on its own line, the ampersand leading.
      const parts = role.split(/\s+(?=&\s)/);
      document.querySelector('[data-og="role"]').replaceChildren(
        ...parts.map((text) => Object.assign(document.createElement('span'), { textContent: text }))
      );

      await document.fonts.ready;
      const found = [];
      for (const font of fonts) {
        await document.fonts.load(font);
        if (!document.fonts.check(font)) found.push(`font didn't load: ${font}`);
      }

      // Everything must sit inside the centre square, which some apps crop to.
      const left = (width - height) / 2;
      for (const el of document.querySelectorAll('[data-og]')) {
        const box = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        const ink = range.getBoundingClientRect();
        const r = Math.max(box.right, ink.right);
        if (box.left < left || r > left + height || box.top < 0 || box.bottom > height) {
          found.push(`"${el.innerText.replace(/\s+/g, ' ').trim()}" leaves the centre ${height}×${height} square`);
        }
      }
      return found;
    },
    { name: site.name, role: site.role, width, height, fonts: FONTS }
  );
  if (problems.length) throw new Error(`og-image: nothing written.\n  ${problems.join('\n  ')}`);

  const shot = await page.screenshot({ type: 'png' });
  const png = await sharp(shot).flatten({ background: '#fff' }).png({ compressionLevel: 9, palette: true }).toBuffer();
  await writeFile(fileURLToPath(new URL(`../public${path}`, import.meta.url)), png);

  console.log(`og-image: wrote public${path} (${width}×${height}, ${Math.round(png.length / 1024)} KB).`);
  if (png.length > MAX_BYTES) {
    console.warn(`og-image: over ${MAX_BYTES / 1000} KB; some apps may skip it. Try a lighter texture.`);
  }
} finally {
  await browser.close();
}
