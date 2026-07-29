/* =========================================================================
   capture.mjs

   Drives Chrome over the two builds. Everything in here exists to make the
   two captures comparable: the same seeded randomness, the same settling time,
   and no blinking caret or looping animation to catch at a different phase.
   ========================================================================= */

import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

/** The map's layout is random by design; a fixed sequence makes it repeatable. */
const SEED_RANDOM = `
  (() => {
    let seed = 1234567;
    Math.random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  })();
`;

/** A caret blinks, so a focused field would photograph differently each time. */
const HIDE_CARET = '* { caret-color: transparent !important; }';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => p && existsSync(p));
  if (found) return found;
  throw new Error(
    'No Chrome found. Install Google Chrome, or point CHROME_PATH at a binary.'
  );
}

export function launch() {
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
    protocolTimeout: 120_000,
  });
}

/**
 * Loads one scenario in one viewport and returns its screenshot plus the
 * computed styles of the probe selectors.
 */
export async function capture(browser, site, scenario, viewport, probes) {
  const page = await browser.newPage();
  try {
    await page.setViewport(viewport);
    await page.evaluateOnNewDocument(SEED_RANDOM);
    if (scenario.media) await page.emulateMediaType(scenario.media);
    await page.goto(`${site.origin}${site.base}${scenario.path}`, { waitUntil: 'load' });
    await page.addStyleTag({ content: HIDE_CARET });
    await page.evaluate(() =>
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))])
    );
    await sleep(scenario.settle ?? 1200);

    if (scenario.act) {
      await scenario.act(page);
      await sleep(scenario.afterAct ?? 1400);
    }

    // Rewind and hold anything that loops (the map's rings), so its phase is
    // the same in both builds.
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (animation.effect?.getComputedTiming().iterations === Infinity) {
          animation.currentTime = 0;
          animation.pause();
        }
      }
    });
    await sleep(120);

    const png = await page.screenshot({ type: 'png', fullPage: Boolean(scenario.fullPage) });
    const styles = await page.evaluate(
      (selectors, properties) => {
        const out = {};
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (!el) continue;
          const computed = getComputedStyle(el);
          const bag = {};
          for (const property of properties) bag[property] = computed.getPropertyValue(property);
          out[selector] = bag;
        }
        return out;
      },
      probes.selectors,
      probes.properties
    );
    return { png, styles };
  } finally {
    await page.close();
  }
}
