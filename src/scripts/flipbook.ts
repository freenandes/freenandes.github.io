/* The home map's drawings in frames (one `<g data-frame>` each, from
   `npm run frames`), driven by the pointer. They stand still until a mouse
   moves; then every `travel` pixels (below) it travels anywhere on the page
   step them one frame on, looping back to the first after the last, so a fast
   mouse runs them fast and a still one leaves them on the frame they reached.
   A touch screen has nothing that hovers, so there they run while a finger
   presses the screen anywhere a press does nothing else, one loop every
   `holdLoop`, and stop when it lifts. The frame showing is the one marked
   `data-shown`; index.astro hides the rest. With reduced motion asked for,
   they keep to their first frame. */

const KNOBS = {
  /** How far a mouse travels, in CSS pixels, per frame. Higher runs slower
   *  for the same movement. */
  travel: 48,
  /** The most frames a mouse steps a drawing per screen refresh, so a flung
   *  one doesn't skip so many that the motion strobes. Travel past it is
   *  dropped, not saved up, so the drawing stops the moment the mouse does. */
  maxStep: 1,
  /** On a touch screen, how long one loop takes while a finger is down, in
   *  milliseconds. */
  holdLoop: 2500,
};

/** What a press works, so it doesn't also run the drawings: links, buttons
 *  (the markers, the portrait, the sketchbook), form fields, cards and the
 *  video windows. */
const LIVE = 'a, button, input, label, select, textarea, [tabindex], .panel, dialog';

export function initFlipbooks(root: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const holders = new Set<Element>();
  for (const frame of root.querySelectorAll('[data-frame]')) {
    if (frame.parentNode instanceof Element) holders.add(frame.parentNode);
  }
  const books = [...holders]
    .map((el) => {
      const frames = [...el.querySelectorAll(':scope > [data-frame]')];
      const at = Math.max(0, frames.findIndex((f) => f.hasAttribute('data-shown')));
      return { frames, at, pos: at };
    })
    .filter((b) => b.frames.length > 1);
  if (!books.length) return;

  /** Where each hovering pointer was last seen. */
  const seen = new Map<number, { x: number; y: number }>();
  /** The fingers (or pens) down on the map. */
  const pressing = new Set<number>();
  let travelled = 0;
  let lastTick = 0;
  let due = false;

  function schedule() {
    if (due) return;
    due = true;
    requestAnimationFrame(tick);
  }

  function tick(now: number) {
    due = false;
    const moved = Math.min(travelled / KNOBS.travel, KNOBS.maxStep);
    travelled = 0;
    // A share of a loop. A refresh held up (a tab in the background) doesn't
    // jump the drawing on.
    const held = pressing.size ? Math.min(Math.max(0, now - lastTick), 100) / KNOBS.holdLoop : 0;
    lastTick = now;
    for (const book of books) {
      const count = book.frames.length;
      book.pos = (book.pos + moved + held * count) % count;
      const next = Math.floor(book.pos);
      if (next === book.at) continue;
      book.frames[book.at].removeAttribute('data-shown');
      book.frames[next].setAttribute('data-shown', '');
      book.at = next;
    }
    if (pressing.size) schedule();
  }

  // A mouse, or a pen hovering over the screen, runs them by how far it goes.
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' && e.buttons) return;
      const last = seen.get(e.pointerId);
      seen.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!last) return;
      travelled += Math.hypot(e.clientX - last.x, e.clientY - last.y);
      schedule();
    },
    { passive: true },
  );
  // A mouse that leaves the window and comes back elsewhere hasn't travelled
  // the way between.
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) seen.delete(e.pointerId);
  });

  // A finger or a pen anywhere on the screen runs them for as long as it's
  // down.
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    seen.delete(e.pointerId);
    if (e.target instanceof Element && e.target.closest(LIVE)) return;
    if (!pressing.size) lastTick = performance.now();
    pressing.add(e.pointerId);
    schedule();
  });
  const lift = (e: PointerEvent) => {
    pressing.delete(e.pointerId);
    if (e.pointerType !== 'mouse') seen.delete(e.pointerId);
  };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);
}
