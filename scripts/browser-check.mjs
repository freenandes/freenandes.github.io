#!/usr/bin/env node
/* =========================================================================
   browser-check.mjs

   Answers one question: does the site still work in each browser engine?

   It builds the working tree, serves it over HTTPS, and loads every page in
   Chrome, Firefox and WebKit (Safari's engine), at a desktop and a phone size.
   It checks behaviour, not pixels, because fonts render differently in each
   engine: no script errors, failed requests or CSP violations, no sideways
   scroll, the map mounts and opens a card in view, and the lightbox opens and
   closes. Screenshots of each engine land in .browsers/ to compare by eye.

   Phone sizes are emulated in desktop engines: a small viewport with touch,
   plus Chrome's mobile mode. They aren't iOS Safari or Android Firefox.

   Usage:
     npm run browsers                   # all three engines
     npm run browsers -- --only webkit  # engines whose name contains "webkit"

   Exit code is 1 when a check fails, 2 when the run couldn't finish (such as
   a browser that isn't installed).
   ========================================================================= */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium, firefox, webkit, devices } from 'playwright';

import astroConfig from '../astro.config.mjs';
import { findChrome } from './visual/capture.mjs';
import { serveDist } from './visual/static-server.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.browsers');
const BASE_PATH = astroConfig.base ?? '/';

/* Knobs ------------------------------------------------------------------- */

/** The map's simulation has no "done" signal, so it gets the same settling
    time `npm run visual` gives it. */
const SETTLE_MS = 2500;
/** A card or the lightbox fades in; wait this long before measuring it. */
const OPEN_MS = 800;

/** Chrome is your installed one (see `findChrome()`); Firefox and WebKit are
    Playwright's builds, installed with `npx playwright install firefox webkit`. */
const ENGINES = [
  {
    name: 'chrome',
    type: chromium,
    launch: () => ({ executablePath: findChrome() }),
    phone: devices['Pixel 7'],
  },
  {
    name: 'firefox',
    type: firefox,
    launch: () => ({}),
    // Firefox can't emulate a mobile browser: a phone-sized window with touch.
    phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true },
  },
  {
    name: 'webkit',
    type: webkit,
    launch: () => ({}),
    phone: devices['iPhone 14'],
  },
];

const desktop = { viewport: { width: 1440, height: 900 } };

/* Setup ------------------------------------------------------------------- */

function parseArgs(argv) {
  const args = { only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') args.only = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

/** A throwaway self-signed certificate; the browsers are told to accept it. */
async function makeCertificate() {
  const key = path.join(OUT, 'key.pem');
  const cert = path.join(OUT, 'cert.pem');
  try {
    await run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=127.0.0.1', '-keyout', key, '-out', cert]);
  } catch (err) {
    throw new Error(`Couldn't make a certificate with openssl: ${err.message.split('\n')[0]}`);
  }
  return { key: await readFile(key), cert: await readFile(cert) };
}

/** Every built page except the old addresses, which only forward elsewhere. */
async function listPages(dist) {
  const pages = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.html')) {
        if ((await readFile(file, 'utf8')).includes('http-equiv="refresh"')) continue;
        const rel = path.relative(dist, file).split(path.sep).join('/');
        pages.push('/' + rel.replace(/(^|\/)index\.html$/, '$1'));
      }
    }
  };
  await walk(dist);
  return pages.sort();
}

/* Checks ------------------------------------------------------------------ */

const firstLine = (err) => String(err?.message ?? err).split('\n')[0];

/** Clicks with a mouse at desktop size and taps at phone size, so the touch
    paths run too. */
const press = (page, handle, touch) => (touch ? handle.tap({ timeout: 5000 }) : handle.click({ timeout: 5000 }));

/** The map mounts, never falls back, and a marker opens its card in view. */
async function checkMap(page, touch, problems, shot) {
  try {
    await page.waitForSelector('.diagram.is-mounted', { timeout: 15000 });
  } catch {
    problems.push('the map never mounted (no .is-mounted)');
    return;
  }
  if (await page.$('.diagram[data-failed]')) problems.push('the map set data-failed');
  const fallback = await page.$eval('.diagram .fallback', (el) => getComputedStyle(el).visibility !== 'hidden');
  if (fallback) problems.push('the fallback list shows after mounting');

  const button = await page.$('.node button[aria-expanded]');
  if (!button) return problems.push('no marker buttons on the map');
  await page.waitForTimeout(SETTLE_MS);
  await press(page, button, touch).catch((err) => problems.push(`couldn't press a marker: ${firstLine(err)}`));
  await page.waitForTimeout(OPEN_MS);

  const card = await button.evaluate((b) => {
    const panel = b.closest('.node')?.querySelector('.panel');
    const style = panel && getComputedStyle(panel);
    const box = panel?.getBoundingClientRect();
    return {
      expanded: b.getAttribute('aria-expanded'),
      shown: !!style && style.visibility === 'visible' && Number(style.opacity) > 0.9,
      inView: !!box && box.width > 0 && box.left >= -1 && box.top >= -1
        && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1,
      mode: document.querySelector('.diagram')?.getAttribute('data-cards'),
    };
  });
  if (card.expanded !== 'true') problems.push(`pressing a marker left aria-expanded="${card.expanded}"`);
  else if (!card.shown) problems.push('a marker opened, but its card stayed hidden');
  else if (!card.inView) problems.push(`the open card runs off screen (data-cards="${card.mode}")`);
  await shot('home-card');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(OPEN_MS / 2);
  if ((await button.getAttribute('aria-expanded')) !== 'false') problems.push('Escape left the card open');
}

/** The first gallery link opens the lightbox with something in it, and Close
    closes it. */
async function checkLightbox(page, touch, problems, shot) {
  const item = await page.$('[data-gallery] > div > a');
  if (!item) return;
  await item.scrollIntoViewIfNeeded();
  await press(page, item, touch).catch((err) => problems.push(`couldn't press a gallery item: ${firstLine(err)}`));
  const isOpen = () => document.querySelector('dialog')?.open;
  if (!(await page.waitForFunction(isOpen, null, { timeout: 4000 }).catch(() => false))) {
    return problems.push("the lightbox didn't open");
  }
  await page.waitForTimeout(OPEN_MS);
  const media = await page.$eval('dialog [data-stage]', (stage) => {
    const box = stage.querySelector('img, video, svg')?.getBoundingClientRect();
    return box ? { width: Math.round(box.width), height: Math.round(box.height) } : null;
  });
  if (!media || media.width < 50 || media.height < 50) problems.push(`the lightbox is empty or tiny: ${JSON.stringify(media)}`);
  await shot('lightbox');
  await press(page, await page.$('dialog [data-close]'), touch).catch(() => {});
  if (!(await page.waitForFunction(() => !document.querySelector('dialog')?.open, null, { timeout: 3000 }).catch(() => false))) {
    problems.push("the lightbox didn't close");
  }
}

/** Loads one page and runs every check that applies to it. */
async function checkPage(context, touch, site, pagePath, tag) {
  const page = await context.newPage();
  const problems = [];
  const url = (u) => u.replace(site.origin + site.base, '');
  page.on('pageerror', (err) => problems.push(`script error: ${firstLine(err)}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console error: ${msg.text().slice(0, 200)}`);
  });
  page.on('requestfailed', (req) => {
    const reason = req.failure()?.errorText ?? '';
    // Navigations and media range requests get cancelled on purpose, and
    // Firefox cancels a video it already has.
    if (/abort|cancel|PARSED_DATA_CACHED/i.test(reason)) return;
    problems.push(`request failed: ${url(req.url())} (${reason})`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !url(res.url()).startsWith('/404')) problems.push(`HTTP ${res.status()}: ${url(res.url())}`);
  });
  const name = pagePath.replace(/^\/|\/$/g, '').replace(/[/.]/g, '-') || 'home';
  const shot = (what) => page.screenshot({ path: path.join(OUT, `${tag}-${what}.png`) }).catch(() => {});
  const pageShot = (what) => shot(`${name}-${what}`);

  try {
    await page.goto(site.origin + site.base + pagePath, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]));
    const failedFonts = await page.evaluate(() =>
      // Astro's fallback faces point at local fonts such as Arial, which a
      // machine may not have; only the site's own files count.
      [...document.fonts].filter((f) => f.status === 'error' && !/fallback/i.test(f.family)).map((f) => f.family)
    );
    if (failedFonts.length) problems.push(`fonts failed: ${failedFonts.join(', ')}`);
    const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (width[0] > width[1] + 1) problems.push(`scrolls sideways: ${width[0]}px wide in a ${width[1]}px window`);
    if (name !== 'home') await shot(name);

    if (await page.$('.diagram')) await checkMap(page, touch, problems, shot);
    await checkLightbox(page, touch, problems, pageShot);

    // Printed (the About page is the CV), it must still fit the width.
    await page.emulateMedia({ media: 'print' });
    const printWidth = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (printWidth) problems.push('scrolls sideways when printed');
  } catch (err) {
    problems.push(`stopped: ${firstLine(err)}`);
  } finally {
    await page.close();
  }
  return [...new Set(problems)];
}

/* Run --------------------------------------------------------------------- */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const engines = args.only ? ENGINES.filter((e) => e.name.includes(args.only)) : ENGINES;
  if (!engines.length) throw new Error(`No engine matches "${args.only}". They are: ${ENGINES.map((e) => e.name).join(', ')}.`);
  if (!existsSync(path.join(ROOT, 'node_modules'))) throw new Error('Run npm install first.');

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const dist = path.join(OUT, 'dist');
  console.log('  building the working tree…');
  await run('npm', ['run', 'encrypt', '--silent'], { cwd: ROOT });
  await run('npx', ['astro', 'build', '--outDir', dist], { cwd: ROOT });

  const pages = await listPages(dist);
  const site = await serveDist(dist, BASE_PATH, await makeCertificate());
  let failures = 0;
  let missing = 0;
  try {
    for (const engine of engines) {
      let browser;
      try {
        browser = await engine.type.launch(engine.launch());
      } catch (err) {
        missing++;
        console.log(`\n${engine.name}: couldn't start. ${firstLine(err)}`);
        if (engine.name !== 'chrome') console.log('  Install it with: npx playwright install firefox webkit (on Linux, add --with-deps)');
        continue;
      }
      console.log(`\n${engine.name} ${browser.version()}`);
      for (const [size, options] of [['desktop', desktop], ['phone', engine.phone]]) {
        const context = await browser.newContext({ ...options, ignoreHTTPSErrors: true });
        for (const pagePath of pages) {
          const tag = `${engine.name}-${size}`;
          const problems = await checkPage(context, Boolean(options.hasTouch), site, pagePath, tag);
          if (problems.length) failures++;
          console.log(`  ${problems.length ? 'FAIL' : 'ok  '} ${size.padEnd(7)} ${pagePath}`);
          for (const problem of problems) console.log(`         ${problem}`);
        }
        await context.close();
      }
      await browser.close();
    }
  } finally {
    await site.close();
    await rm(dist, { recursive: true, force: true });
  }

  const shots = `Screenshots are in ${path.relative(ROOT, OUT)}/.`;
  if (failures) console.log(`\n${failures} page load(s) failed a check. ${shots}`);
  else if (missing) console.log(`\n${missing} browser(s) couldn't start, so they weren't checked. ${shots}`);
  else console.log(`\nEvery check passed. ${shots}`);
  process.exitCode = failures ? 1 : missing ? 2 : 0;
}

main().catch((err) => {
  console.error('\n[browsers] Failed:', err.message);
  process.exit(2);
});
