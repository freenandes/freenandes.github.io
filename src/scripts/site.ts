/** Behaviour every page loads: print-to-PDF buttons, the reveal deferral, and
    reassembling the obfuscated email address. */

import { decodeEmail } from '../lib/email';

for (const button of document.querySelectorAll('[data-print]')) {
  button.addEventListener('click', () => window.print());
}

/**
 * Turn every obfuscated address (see `src/lib/email.ts`) back into a working
 * `mailto:` link, and spell it out where the markup asks for the plain text —
 * the print-only contact line on the CV, flagged with `data-email-text`. The
 * real address only ever exists in the DOM the reader's browser builds, never
 * in the HTML that ships.
 */
for (const el of document.querySelectorAll<HTMLElement>('[data-email]')) {
  const address = decodeEmail(el.dataset.email ?? '');
  if (!address) continue;
  if (el instanceof HTMLAnchorElement) el.href = `mailto:${address}`;
  if ('emailText' in el.dataset) el.textContent = address;
}

/** Release a held block once its top has come this far inside the viewport. */
const TRIGGER = '-12%';

/**
 * Defers the load reveal of any `[data-reveal]` block that starts below the
 * fold so it plays when the reader actually gets there. Blocks already on
 * screen keep the staggered entrance CSS gives them.
 *
 * Nothing here hides content: it only pauses an animation that is already
 * running off-screen, so a failure (or no JavaScript at all) degrades to every
 * block revealing on load, as before.
 */
function deferOffscreenReveals() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fold = window.innerHeight;
  const held = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
    (el) => el.getBoundingClientRect().top > fold
  );
  if (!held.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.removeAttribute('data-reveal-wait');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: `0px 0px ${TRIGGER} 0px` }
  );

  for (const el of held) {
    el.setAttribute('data-reveal-wait', '');
    observer.observe(el);
  }
}

deferOffscreenReveals();
