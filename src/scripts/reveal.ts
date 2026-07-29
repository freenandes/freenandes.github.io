/** Held blocks carry this until the reader reaches them (see global.css). */
const WAIT = 'data-reveal-wait';

/** Release a block once its top has passed this share of the viewport. */
const TRIGGER = 0.12;

/**
 * Defers the load reveal of any `[data-reveal]` block that starts below the
 * fold so it plays when the reader actually gets there. Blocks already on
 * screen keep the staggered entrance CSS gives them.
 *
 * Nothing here hides content: it only pauses an animation that is already
 * running off-screen, so a failure (or no JavaScript at all) degrades to every
 * block revealing on load, as before.
 */
export function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!blocks.length) return;

  const fold = window.innerHeight;
  const held = blocks.filter((el) => el.getBoundingClientRect().top > fold);
  if (!held.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.removeAttribute(WAIT);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: `0px 0px ${-TRIGGER * 100}% 0px` }
  );

  for (const el of held) {
    el.setAttribute(WAIT, '');
    observer.observe(el);
  }
}
