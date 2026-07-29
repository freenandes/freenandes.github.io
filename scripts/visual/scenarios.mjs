/* =========================================================================
   scenarios.mjs

   What `npm run visual` looks at. Everything here is data: add a page or a
   state and both builds get captured the same way.
   ========================================================================= */

export const viewports = {
  desk: { width: 1440, height: 900, deviceScaleFactor: 1 },
  phone: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};

/** Demo passphrase for the locked project (see AGENTS.md). */
const LOCK_PASSWORD = process.env.LOCK_PASSWORD_HALCYON ?? 'soft-club';

/** Jump the page without the smooth-scroll animation, so it lands exactly. */
const scrollTo = (...positions) =>
  async function scroll(page) {
    for (const top of positions) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
    }
  };

/** Fill the passphrase gate and submit. */
const unlock = (password) =>
  async function submit(page) {
    await page.type('.lock input', password, { delay: 10 });
    await page.click('.lock form button');
  };

/**
 * `act` runs once the page has settled; the capture then settles again before
 * the shot. `drift` is the share of pixels allowed to differ before a scenario
 * counts as changed — only the home page needs it, because its layout comes out
 * of a randomised physics simulation whose settling path is never bit-identical
 * (two captures of the *same* build land within ~0.5%).
 */
export const scenarios = [
  { name: 'home', path: '/', drift: 0.01 },
  {
    name: 'home-card-open',
    path: '/',
    drift: 0.01,
    act: (page) => page.evaluate(() => document.querySelector('[data-id="about"] .node__hit').click()),
  },
  { name: 'about', path: '/about/' },
  { name: 'about-scrolled', path: '/about/', act: scrollTo(1200) },
  { name: 'about-nav-pinned', path: '/about/', act: scrollTo(1200, 900) },
  { name: 'project', path: '/projects/systems-thinker/' },
  { name: 'project-scrolled', path: '/projects/systems-thinker/', act: scrollTo(600) },
  { name: 'locked', path: '/projects/halcyon/' },
  { name: 'locked-refused', path: '/projects/halcyon/', act: unlock('wrong-passphrase') },
  { name: 'unlocked', path: '/projects/halcyon/', act: unlock(LOCK_PASSWORD) },
  { name: 'error-404', path: '/404.html' },
];

/**
 * Computed styles are compared as well as the pixels: it catches changes the
 * camera can't see (an off-screen element, a different way of parking the skip
 * link) and, unlike a screenshot, it never drifts.
 */
export const styleProbes = [
  'body',
  'main',
  '.skip-link',
  '.prose',
  '.prose a',
  '.link',
  '.button__pad',
  '.input__box',
  '.label',
  '.meta',
  '.mono',
  '.site-footer',
  '.site-footer__meta',
  '.page-nav',
  '.page-nav__at-rest',
  '.cv__head',
  '.cv__name',
  '.cv__summary',
  '.cv__section-title',
  '.entry',
  '.entry__period',
  '.entry__role',
  '.cv__foot',
  '.project__title',
  '.project__summary',
  '.project__links',
  '.lock',
  '.lock__panel',
  '.lock__title',
  '.lock__form',
  '.lock__error',
  '.lock__content',
  '.error__code',
  '.error__title',
  '.error__nav',
  '.diagram',
  '.diagram__links',
  '.link-line',
  '.node',
  '.node--identity',
  '.node--floating',
  '.node__hit',
  '.node__dot',
  '.node__dot polygon',
  '.node__label',
  '.node__ring',
  '.node__ring-text',
  '.node__panel',
  '.panel__lead',
  '.panel__text',
  '.panel__link',
];

/**
 * Layout-independent properties only: anything that moves with the simulation
 * (`transform`, `translate`, and the offsets the map's cards are nudged by)
 * would report drift rather than change.
 */
export const styleProperties = [
  'display',
  'position',
  'visibility',
  'opacity',
  'color',
  'background-color',
  'border-top-width',
  'border-top-color',
  'border-top-style',
  'border-radius',
  'box-shadow',
  'outline-color',
  'outline-style',
  'outline-width',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-decoration-line',
  'text-decoration-color',
  'text-decoration-thickness',
  'text-underline-offset',
  'padding',
  'margin',
  'width',
  'height',
  'max-width',
  'min-height',
  'gap',
  'flex-direction',
  'align-items',
  'justify-content',
  'overflow',
  'z-index',
  'stroke',
  'stroke-width',
  'fill',
];
