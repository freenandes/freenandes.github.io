/** Behaviour every page loads: print-to-PDF buttons, the reveal deferral, and
    reassembling the obfuscated email address. */

import { decodeEmail } from '../lib/email';

for (const button of document.querySelectorAll('[data-print]')) {
  button.addEventListener('click', () => window.print());
}

/**
 * Off-screen reveals sit paused on the first frame (opacity 0). Chrome's print
 * preview snapshots that layer, so jump every block to its end state first —
 * the button and Cmd+P both go through `beforeprint`.
 */
window.addEventListener('beforeprint', () => {
  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    el.removeAttribute('data-reveal-wait');
    el.style.animation = 'none';
  }
});

/**
 * "Save as PDF" names the file after the page title. A page can offer a better
 * file name with `data-print-title` (the CV: "Pedro MC Fernandes — CV"); it
 * stands in while the print dialog is open, then the tab title comes back.
 */
const printTitle = document.querySelector<HTMLElement>('[data-print-title]')?.dataset.printTitle;
if (printTitle) {
  const pageTitle = document.title;
  window.addEventListener('beforeprint', () => (document.title = printTitle));
  window.addEventListener('afterprint', () => (document.title = pageTitle));
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

/** The end of the page counts as in view from this far below the window's
    bottom edge, so a scroll that reached the end can't be missed by rounding. */
const END_SLACK = '8px';

/**
 * Defers the load reveal of any `[data-reveal]` block that starts below the
 * fold so it plays when the reader actually gets there. Blocks already on
 * screen keep the staggered entrance CSS gives them.
 *
 * A held block stays invisible until it's released, so each one has two ways
 * out: its top passes the trigger line, or the end of the page comes into view
 * while it's on screen. The second is for the page's last stretch, which can't
 * scroll that far up: the page stops once its end meets the bottom of the
 * window, so a footer shorter than the trigger's share of the window never
 * reaches the line, and would stay hidden on a tall window. If this script
 * fails before holding anything, or there's no JavaScript, every block reveals
 * on load, as before.
 */
function deferOffscreenReveals() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fold = window.innerHeight;
  const held = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
    (el) => el.getBoundingClientRect().top > fold
  );
  if (!held.length) return;

  function release(el: Element) {
    el.removeAttribute('data-reveal-wait');
    atTrigger.unobserve(el);
  }

  const atTrigger = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) release(entry.target);
    },
    { rootMargin: `0px 0px ${TRIGGER} 0px` }
  );

  // The end of the page is an empty element after everything else in <body>.
  // Once it's in view, whatever is still held below the top of the window is
  // released; a block above it, skipped by a jump, still waits for the reader
  // to scroll back up to it.
  const end = document.createElement('div');
  document.body.append(end);
  const atEnd = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      for (const el of held) {
        if (el.hasAttribute('data-reveal-wait') && el.getBoundingClientRect().bottom > 0) release(el);
      }
    },
    { rootMargin: `0px 0px ${END_SLACK} 0px` }
  );

  for (const el of held) {
    el.setAttribute('data-reveal-wait', '');
    // The entrance started with the page, a few frames before this script
    // ran; rewind it so the block waits on its first frame, not partway in.
    for (const animation of el.getAnimations()) animation.currentTime = 0;
    atTrigger.observe(el);
  }
  atEnd.observe(end);
}

deferOffscreenReveals();
