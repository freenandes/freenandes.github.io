/** Movement under this many pixels is treated as jitter, not a direction. */
const DELTA = 8;

/**
 * Pins the page nav to the top of the viewport and reveals it on scroll-up.
 * `sentinel` marks the bar's resting position, which stays measurable while the
 * bar itself is transformed away.
 */
export function initPageNav(nav: HTMLElement, sentinel: Element | null) {
  let pinned = false;
  let hidden = false;
  let lastY = Math.max(window.scrollY, 0);

  function setHidden(next: boolean) {
    if (next === hidden) return;
    hidden = next;
    nav.classList.toggle('is-hidden', next);
  }

  function setPinned(next: boolean) {
    if (next === pinned) return;
    pinned = next;
    nav.classList.toggle('is-pinned', next);
    if (!next) setHidden(false);
  }

  if (sentinel) {
    const observer = new IntersectionObserver(([entry]) => {
      setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
  }

  window.addEventListener(
    'scroll',
    () => {
      const y = Math.max(window.scrollY, 0);
      const delta = y - lastY;
      if (Math.abs(delta) < DELTA) return;
      lastY = y;
      setHidden(pinned && delta > 0);
    },
    { passive: true }
  );
}
