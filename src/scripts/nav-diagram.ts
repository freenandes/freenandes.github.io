/* =============================================================================
   The home page's map: a small force layout that scatters the markers, keeps
   them from colliding, and routes the connectors between them without crossings.
   Outside the simulation, it finds free spots for the map's decorations and
   for each card as it opens, and keeps all of it off the portrait sticker.

   The markers, their copy and the chain they connect in are authored in
   `src/diagram.config.ts` — the same file the page renders from, so the layout
   and the markup can never disagree. This file only decides where things go.
   ============================================================================= */

import { diagramNodes, diagramChain, type DiagramEntry } from '../diagram.config';

/* --- Knobs -------------------------------------------------------------------
   The values worth turning, in one place; everything below them is machinery.
   Distances are CSS pixels and times milliseconds. Where a knob has `base` and
   `narrow`, the value is `base` on a wide canvas and moves by `narrow` as the
   canvas becomes a tall phone (see `narrowness`). Where each marker would like
   to sit is per marker, in src/diagram.config.ts; marker and card sizes are in
   the knobs at the top of index.astro's <style>. */

const KNOBS = {
  /** Margin kept clear around the map, as a share of the canvas width and
   *  height, never more than `max`. The height's is never less than `min`, so
   *  the end labels stay clear of the edge on a short phone. */
  inset: {
    x: { base: 0.12, narrow: 0.1, max: 160 },
    y: { base: 0.08, narrow: 0, min: 56, max: 150 },
  },
  /** Space kept between two markers' boxes (marker plus label). */
  markerGap: {
    x: { base: 34, narrow: -12 },
    y: { base: 30, narrow: -16 },
  },
  /** How close two connectors that don't share a marker may run. */
  lineGap: { base: 54, narrow: -20 },
  /** A wavy connector's bends (fewest, most) and how far each swings. */
  wave: { bends: [4, 6], swing: [10, 20] },
  /** How far a jagged connector's corners stray from the straight line. */
  jag: { min: 16, max: 60 },
  /** Where a card opens. It never covers its own marker, stays wholly in view
   *  if any spot can, and then keeps `gap` clear of every other marker if any
   *  spot can. It abuts its marker's box on one
   *  side, sliding along it while it still reaches `grip` past the marker's
   *  centre; if no such spot is clear, it may stand off up to `drift` from the
   *  marker instead. Among spots equally clear of markers, each step down the
   *  order of roomiest sides costs as much as sliding `sideStep`, and covering a
   *  whole ring as much as sliding `ring`. */
  cardClear: { gap: 8, grip: 24, drift: 120, sideStep: 64, ring: 120 },
  /** Room a card needs beside its marker, or above or below it, when ranking
   *  the sides from roomiest; on a phone, above and below get up to
   *  `narrowBias` of extra preference. */
  cardRoom: { side: 220, vertical: 80, narrowBias: 80 },
  /** Gap a card keeps from the edge of the viewport. */
  cardEdge: 12,
  /** Screens where a card opens as a popup in the middle of the screen, with
   *  its preview on top, instead of beside its marker: those without a pointer
   *  that can hover. Everywhere else, a marker's preview floats beside it
   *  while the pointer is on it. Its sizes are in index.astro. */
  popupQuery: '(hover: none) and (pointer: coarse)',
  /** Space a floating preview keeps from its marker's button. */
  previewGap: 16,
  /** The sides of its marker a floating preview tries, in order: the first
   *  where it fits wholly in view wins. */
  previewSides: ['right', 'left', 'bottom', 'top'],
  /** The entrance: delay before the first marker, then the step to each next
   *  one along the chain. A connector starts `lineLag` after the later of its
   *  two markers; the floating rings land last, `ringStep` apart. */
  entrance: { first: 40, step: 50, lineLag: 40, ringStep: 90 },
  /** The drawings on the texture: space each keeps from markers, rings,
   *  connectors and the other drawings, and from the canvas edge, and how many
   *  random spots it tries before staying hidden. Their size is in index.astro. */
  decor: { gap: 8, edge: 8, tries: 400 },
  /** Space markers and rings keep from the portrait sticker's box. */
  stickerGap: 12,
  /** Pointer travel before a press on a marker becomes a drag. */
  dragThreshold: 6,
  /** Quiet time after a resize before the full re-layout runs. */
  resizeSettle: 220,
} as const;

/** The live physics that settles markers onto their spots and back after a
 *  drag. Per-frame factors, so small changes go a long way. */
const SIM = {
  drag: 0.6,
  anchorPull: 0.085,
  edge: 0.01,
  repel: 0.06,
  calmPull: 0.12,
  settleMotion: 0.04,
  settleFrames: 10,
  initialScatter: 8,
};

type Node = {
  el: HTMLElement;
  cfg: DiagramEntry;
  id: string;
  /** The marker's button, and the card it opens. The name has no card, and a
   *  ring has neither. */
  button: HTMLButtonElement | null;
  panel: HTMLElement | null;
  /** The screen that floats beside the marker on hover, if it has one. */
  preview: HTMLElement | null;

  frac: { x: number; y: number };
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  ax: number;
  ay: number;

  dotDy: number;

  floating: boolean;
  calm: boolean;
  dragging: boolean;
  hover: boolean;
  focus: boolean;
};

type EdgeShape = {
  kind: 'straight' | 'jagged' | 'wave';

  points: { t: number; off: number }[];
};

/** A box by its centre and half-size, in pixels. */
type Box = { x: number; y: number; halfX: number; halfY: number };

/** A box by its edges, in viewport pixels, as `getBoundingClientRect` gives. */
type Rect = { left: number; top: number; right: number; bottom: number };

/** The side of its marker a card opens on, or the middle of the screen for a
 *  popup. */
type Side = 'bottom' | 'top' | 'right' | 'left' | 'center';

/** A drawing on the texture, and where its centre sits once it has landed. */
type Decor = { el: SVGSVGElement; spot: { x: number; y: number } | null };

const SVG_NS = 'http://www.w3.org/2000/svg';

export function initDiagram(root: HTMLElement) {
  const links = root.querySelector<SVGSVGElement>('.links');
  if (!links) return;
  const svgEl: SVGSVGElement = links;
  const decor: Decor[] = [...root.querySelectorAll<SVGSVGElement>('.decor')].map((el) => ({
    el,
    spot: null,
  }));
  const ruler = root.querySelector<SVGSVGElement>('.ruler');
  const sticker = root.querySelector<HTMLElement>('.sticker');
  // The sticker's spot and tilt within the ranges index.astro gives them, picked
  // once per page load, before anything measures it.
  if (sticker) {
    sticker.style.setProperty('--sticker-rx', Math.random().toFixed(3));
    sticker.style.setProperty('--sticker-ry', Math.random().toFixed(3));
    sticker.style.setProperty('--sticker-rt', (Math.random() * 2 - 1).toFixed(3));
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // How cards open here: beside their marker, with a preview on hover, or as
  // a popup with the preview on top. The page's CSS styles both from
  // `data-cards`, so this is the one place that decides.
  const popupMedia = window.matchMedia(KNOBS.popupQuery);
  const isPopup = () => popupMedia.matches;
  root.dataset.cards = isPopup() ? 'popup' : 'flyout';

  const nodes: Node[] = [];
  for (const cfg of diagramNodes) {
    const el = root.querySelector<HTMLElement>(`[data-id="${cfg.id}"]`);
    if (!el) continue;
    nodes.push({
      el,
      cfg,
      id: cfg.id,
      button: el.querySelector('button'),
      panel: el.querySelector('.panel'),
      preview: root.querySelector(`[data-preview-for="${cfg.id}"]`),
      frac: { x: 0.5, y: 0.5 },
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      ax: 0,
      ay: 0,
      dotDy: 0,
      floating: cfg.kind === 'floating',
      calm: false,
      dragging: false,
      hover: false,
      focus: false,
    });
  }
  if (!nodes.length) return;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // One connector per link in the authored chain.
  const chain = diagramChain
    .map((id) => byId.get(id))
    .filter((n): n is Node => n !== undefined);

  const edges = chain.slice(0, -1).map((a, i) => {
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('class', 'link-line');
    line.setAttribute('fill', 'none');
    svgEl.appendChild(line);
    const shape: EdgeShape = { kind: 'straight', points: [] };
    return { a, b: chain[i + 1], line, rest: 0, shape };
  });

  // The chain doubles as the layout order, so the random walk lays the markers
  // out sequentially and the connectors read as one line. Anything left out of
  // the chain still needs a place; floating rings are laid out separately.
  const chainOrder: Node[] = [
    ...chain,
    ...nodes.filter((n) => !n.floating && !chain.includes(n)),
  ];

  let W = 0;
  let H = 0;
  let decorDue = false;

  function safeWidth(rect: DOMRect) {
    return rect.width > 1 ? rect.width : window.innerWidth;
  }
  function safeHeight(rect: DOMRect) {
    // A not-yet-laid-out element can report a bogus short height; anything
    // under half the viewport is treated as unreliable and replaced.
    const vh = window.innerHeight;
    return rect.height >= vh * 0.5 ? rect.height : vh;
  }
  function viewportLandscape() {
    return window.innerWidth > window.innerHeight * 1.1;
  }

  function narrowness() {
    const aspect = W / Math.max(1, H);
    // aspect 1.0 → 0 (square), aspect 0.5 → 1 (very tall phone)
    return Math.max(0, Math.min(1, (1 - aspect) / 0.5));
  }

  /** How far up from the canvas's bottom edge the ruler's drawing reaches. */
  function rulerReach() {
    if (!ruler) return 0;
    const ink = measureDecor(ruler);
    const top = ruler.getBoundingClientRect().top + ink.y - ink.halfY;
    return root.getBoundingClientRect().bottom - top;
  }

  /** The portrait sticker's box on the canvas, cut to the canvas, as it stands
   *  in its corner. It never moves, so the map works around it. */
  function stickerBox(): Box | null {
    if (!sticker) return null;
    const canvas = root.getBoundingClientRect();
    const r = sticker.getBoundingClientRect();
    const left = Math.max(0, r.left - canvas.left);
    const top = Math.max(0, r.top - canvas.top);
    const right = Math.min(W, r.right - canvas.left);
    const bottom = Math.min(H, r.bottom - canvas.top);
    if (right <= left || bottom <= top) return null;
    return {
      x: (left + right) / 2,
      y: (top + bottom) / 2,
      halfX: (right - left) / 2,
      halfY: (bottom - top) / 2,
    };
  }

  /** How far to move a box of half-size `half` at (x, y) so it clears the
   *  sticker: out past its right edge or its bottom one, whichever is nearer,
   *  since the sticker keeps to the top left corner. */
  function stickerPush(
    box: Box | null,
    x: number,
    y: number,
    half: { x: number; y: number },
  ): { x: number; y: number } | null {
    if (!box) return null;
    const gap = KNOBS.stickerGap;
    const reachX = box.halfX + half.x + gap;
    const reachY = box.halfY + half.y + gap;
    if (Math.abs(x - box.x) >= reachX || Math.abs(y - box.y) >= reachY) return null;
    const ox = box.x + reachX - x;
    const oy = box.y + reachY - y;
    return ox < oy ? { x: ox, y: 0 } : { x: 0, y: oy };
  }

  function inset() {
    const narrow = narrowness();
    // Labels are centered under the dot and extend to each side, so the
    // horizontal margin grows a little on narrow viewports.
    const { x, y } = KNOBS.inset;
    const mx = Math.min((x.base + x.narrow * narrow) * W, x.max);
    const my = Math.max(y.min, Math.min((y.base + y.narrow * narrow) * H, y.max));
    // The bottom margin holds even the tallest marker's box clear of the ruler.
    const tallest = Math.max(...nodes.filter((n) => !n.floating).map((n) => nodeHalf(n).y));
    const bottom = Math.max(my, rulerReach() + tallest + KNOBS.decor.gap);
    return { mx, my, iw: Math.max(1, W - 2 * mx), ih: Math.max(1, H - my - bottom) };
  }

  /** The spot this marker was authored to prefer, for this orientation. */
  function configFrac(n: Node, landscape: boolean) {
    return landscape ? n.cfg.landscape : n.cfg.portrait;
  }

  function clampFrac(x: number, y: number) {
    // A tall phone spends all its height, so only the inset holds the ends back.
    const yEdge = 0.08 * (1 - narrowness());
    return {
      x: Math.max(0.08, Math.min(0.92, x)),
      y: Math.max(yEdge, Math.min(1 - yEdge, y)),
    };
  }

  /** Blend spine sample with authored map coords so the graph can breathe. */
  function blendWithConfig(n: Node, landscape: boolean, spine: { x: number; y: number }, mix: number) {
    const cfg = configFrac(n, landscape);
    return clampFrac(spine.x * (1 - mix) + cfg.x * mix, spine.y * (1 - mix) + cfg.y * mix);
  }

  function layoutSpine(landscape: boolean, configMix: number) {
    const n = chainOrder.length;
    const narrow = narrowness();
    const { iw, ih } = inset();
    const alongPx = landscape ? iw : ih;
    const crossPx = landscape ? ih : iw;
    // A small, random breathing margin at each end varies where the chain
    // starts/stops without ever bunching the nodes together. A tall phone
    // skips it, along with the authored spots: those assume one direction, so
    // a flipped chain would be dragged inward and lose height.
    const endPad = (0.03 + Math.random() * 0.05) * (1 - narrow);
    const mix = configMix * (1 - narrow);
    const flip = Math.random() < 0.5; // run the chain either direction
    const lobes = 0.5 + Math.random(); // 0.5..1.5 — one gentle bend, no S-folds
    // Meander as a fraction of the along axis. Landscape gets a touch more
    // swing for life; narrow portrait stays almost ruler-straight (its labels
    // already fill the width). Kept small enough that worst-case corners stay
    // comfortably obtuse.
    const mAlong = landscape
      ? 0.08 + Math.random() * 0.05 // 0.08..0.13 of the width
      : 0.035 + 0.045 * (1 - narrow) * Math.random(); // ~0.035..0.08, very straight
    const perpAmp = Math.min(0.4, (mAlong * alongPx) / Math.max(1, crossPx));
    const phase = Math.random() * Math.PI * 2;
    const bias = (Math.random() * 2 - 1) * perpAmp * 0.5;
    for (let i = 0; i < n; i++) {
      let t = n === 1 ? 0.5 : i / (n - 1);
      if (flip) t = 1 - t;
      const along = endPad + t * (1 - 2 * endPad);
      const perp = 0.5 + bias + Math.sin(t * Math.PI * lobes + phase) * perpAmp;
      const spine = landscape ? { x: along, y: perp } : { x: perp, y: along };
      chainOrder[i].frac = blendWithConfig(chainOrder[i], landscape, spine, mix);
    }
  }

  function generateLayout() {
    const rect = root.getBoundingClientRect();
    // narrowness()/inset() read the W/H globals, which computeAnchors sets
    // after this on first load — prime them so the spine uses the real aspect.
    // Guard against a not-yet-laid-out element: a bogus near-zero/short height
    // read here would flip the chain to a horizontal spine inside a portrait
    // canvas and collapse it once mapped to the true size. Fall back to the
    // viewport (always valid) and take orientation from it.
    W = safeWidth(rect);
    H = safeHeight(rect);
    const landscape = viewportLandscape();
    layoutSpine(landscape, 0.1);
    // Floating nodes aren't part of the spine. Scatter them across the canvas
    // (lightly nudged toward their authored hint); they drift toward open
    // space but are allowed to slip behind the chain since they're decorative.
    for (const n of nodes) {
      if (!n.floating) continue;
      const rnd = clampFrac(0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.8);
      n.frac = blendWithConfig(n, landscape, rnd, 0.25);
    }
  }

  // Connectors are straight, jagged, or (1 in 5) a tight wavy line.
  function generateEdgeShapes() {
    const kinds = pickKindDistribution(edges.length);
    shuffleInPlace(kinds);
    for (let i = 0; i < edges.length; i++) {
      if (kinds[i] === 'jagged') edges[i].shape = { kind: 'jagged', points: makeJaggedPoints() };
      else if (kinds[i] === 'wave') edges[i].shape = { kind: 'wave', points: makeWavePoints() };
      else edges[i].shape = { kind: 'straight', points: [] };
    }
  }

  function shuffleInPlace<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function pickKindDistribution(n: number): Array<'straight' | 'jagged' | 'wave'> {
    if (n === 5) {
      const options: Array<[number, number, number]> = [
        [2, 2, 1], // 2 straight, 2 jagged, 1 wave
        [1, 3, 1], // 1 straight, 3 jagged, 1 wave
      ];
      const [s, j, w] = options[Math.floor(Math.random() * options.length)];
      return [
        ...Array(s).fill('straight' as const),
        ...Array(j).fill('jagged' as const),
        ...Array(w).fill('wave' as const),
      ];
    }
    // Generic fallback: ~1-in-5 wave, roughly half jagged, rest straight.
    const w = Math.max(0, Math.round(n / 5));
    const j = Math.max(1, Math.min(n - w, Math.round(n * 0.4)));
    const s = Math.max(0, n - j - w);
    return [
      ...Array(s).fill('straight' as const),
      ...Array(j).fill('jagged' as const),
      ...Array(w).fill('wave' as const),
    ];
  }

  function makeWavePoints(): { t: number; off: number }[] {
    const { bends, swing } = KNOBS.wave;
    const count = bends[0] + Math.floor(Math.random() * (bends[1] - bends[0] + 1));
    const amp = swing[0] + Math.random() * (swing[1] - swing[0]);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const pts: { t: number; off: number }[] = [];
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      const dir = k % 2 === 0 ? sign : -sign;
      pts.push({ t, off: dir * amp });
    }
    return pts;
  }

  function makeJaggedPoints(): { t: number; off: number }[] {
    const count = 2 + Math.floor(Math.random() * 2);
    const baseAmp = 0.05 + Math.random() * 0.03;
    const SPREAD = 0.5;
    const centers: number[] = [];
    for (let k = 0; k < count; k++) {
      const even = count === 1 ? 0.5 : (k + 1) / (count + 1);
      centers.push(0.5 + (even - 0.5) * SPREAD);
    }
    const gap = count > 1 ? centers[1] - centers[0] : 1;
    const jitMax = Math.min(0.035, gap * 0.25);
    const ts = centers
      .map((c) => Math.max(0.3, Math.min(0.7, c + (Math.random() * 2 - 1) * jitMax)))
      .sort((a, b) => a - b);
    const MIN_GAP = Math.min(gap * 0.6, 0.12);
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - ts[k - 1] < MIN_GAP) ts[k] = Math.min(0.7, ts[k - 1] + MIN_GAP);
    }
    let sign = Math.random() < 0.5 ? 1 : -1;
    const pts = ts.map((t) => {
      const ampScale = 0.9 + Math.random() * 0.2;
      const p = { t, off: sign * baseAmp * ampScale };
      sign = -sign;
      return p;
    });
    return pts;
  }

  function measureDotOffsets() {
    for (const n of nodes) {
      const dot = n.el.querySelector('button svg');
      if (!dot) continue;
      const nr = n.el.getBoundingClientRect();
      const dr = dot.getBoundingClientRect();
      n.dotDy = dr.top + dr.height / 2 - (nr.top + nr.height / 2);
    }
  }

  function nodeExtent(n: Node) {
    const r = n.el.getBoundingClientRect();
    return Math.max(r.width, r.height, 96) * 0.68;
  }

  /** Footprint half-extents (px) of a node's visible box — marker + label. */
  function nodeHalf(n: Node) {
    const r = n.el.getBoundingClientRect();
    return { x: Math.max(r.width, 48) / 2, y: Math.max(r.height, 40) / 2 };
  }

  function sepPad() {
    const narrow = narrowness();
    const { x, y } = KNOBS.markerGap;
    return {
      x: x.base + x.narrow * narrow,
      y: y.base + y.narrow * narrow,
    };
  }

  function separationPush(
    a: Node, b: Node,
    ax: number, ay: number, bx: number, by: number,
  ): { x: number; y: number; hit: boolean } {
    const ha = nodeHalf(a);
    const hb = nodeHalf(b);
    const pad = sepPad();
    const needX = ha.x + hb.x + pad.x;
    const needY = ha.y + hb.y + pad.y;
    const dx = bx - ax;
    const dy = by - ay;
    const ox = needX - Math.abs(dx);
    const oy = needY - Math.abs(dy);
    if (ox <= 0 || oy <= 0) return { x: 0, y: 0, hit: false };
    if (ox < oy) return { x: dx < 0 ? -ox : ox, y: 0, hit: true };
    return { x: 0, y: dy < 0 ? -oy : oy, hit: true };
  }

  function relaxAnchors(iterations = 80) {
    const { mx, my, iw, ih } = inset();
    if (iw < 2 || ih < 2) return;
    const px = nodes.map((n) => mx + n.frac.x * iw);
    const py = nodes.map((n) => my + n.frac.y * ih);
    const portrait = stickerBox();
    for (let it = 0; it < iterations; it++) {
      let moved = 0;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].floating) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].floating) continue;
          const s = separationPush(nodes[i], nodes[j], px[i], py[i], px[j], py[j]);
          if (!s.hit) continue;
          const hx = s.x * 0.5;
          const hy = s.y * 0.5;
          px[i] -= hx;
          py[i] -= hy;
          px[j] += hx;
          py[j] += hy;
          moved = Math.max(moved, Math.hypot(hx, hy));
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].floating) continue;
        const off = stickerPush(portrait, px[i], py[i], nodeHalf(nodes[i]));
        if (off) {
          px[i] += off.x;
          py[i] += off.y;
          moved = Math.max(moved, Math.hypot(off.x, off.y));
        }
        px[i] = Math.max(mx + 6, Math.min(mx + iw - 6, px[i]));
        py[i] = Math.max(my + 6, Math.min(my + ih - 6, py[i]));
      }
      if (moved < 0.3) break;
    }
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].frac = clampFrac((px[i] - mx) / iw, (py[i] - my) / ih);
    }
  }

  function straightenAngles(iterations = 20, cosLimit = -0.15) {
    const { mx, my, iw, ih } = inset();
    if (iw < 2 || ih < 2) return;
    const order = chainOrder;
    if (order.length < 3) return;
    for (let it = 0; it < iterations; it++) {
      let maxAdj = 0;
      for (let i = 1; i < order.length - 1; i++) {
        const p = order[i - 1];
        const c = order[i];
        const nx = order[i + 1];
        const v1x = p.ax - c.ax;
        const v1y = p.ay - c.ay;
        const v2x = nx.ax - c.ax;
        const v2y = nx.ay - c.ay;
        const len1 = Math.hypot(v1x, v1y) || 1;
        const len2 = Math.hypot(v2x, v2y) || 1;
        const cos = (v1x * v2x + v1y * v2y) / (len1 * len2);
        if (cos <= cosLimit) continue;
        const midX = (p.ax + nx.ax) / 2;
        const midY = (p.ay + nx.ay) / 2;
        const urgency = Math.min(1, (cos - cosLimit) / (1 - cosLimit));
        const k = 0.12 + 0.18 * urgency;
        const newX = Math.max(mx + 6, Math.min(mx + iw - 6, c.ax + (midX - c.ax) * k));
        const newY = Math.max(my + 6, Math.min(my + ih - 6, c.ay + (midY - c.ay) * k));
        const adj = Math.hypot(newX - c.ax, newY - c.ay);
        c.ax = newX;
        c.ay = newY;
        c.frac = clampFrac((newX - mx) / iw, (newY - my) / ih);
        maxAdj = Math.max(maxAdj, adj);
      }
      if (maxAdj < 0.5) break;
    }
  }

  function isLandscape() {
    return W > H * 1.1;
  }

  function layoutIsCrowded() {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.floating || b.floating) continue;
        const s = separationPush(a, b, a.ax, a.ay, b.ax, b.ay);
        if (s.hit && Math.hypot(s.x, s.y) > 10) return true;
      }
    }
    return false;
  }

  function orientationMismatched() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.floating) continue;
      minX = Math.min(minX, n.ax); maxX = Math.max(maxX, n.ax);
      minY = Math.min(minY, n.ay); maxY = Math.max(maxY, n.ay);
    }
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    return viewportLandscape() ? spanY > spanX * 1.1 : spanX > spanY * 1.1;
  }

  function syncAnchorsFromSim() {
    const { mx, my, iw, ih } = inset();
    for (const n of nodes) {
      // A ring at rest can be held in balance away from its anchor, which has
      // to stay put for the balance to hold.
      if (n.dragging || n.floating) continue;
      n.ax = n.x;
      n.ay = n.y;
      n.frac = {
        x: Math.max(0, Math.min(1, (n.x - mx) / iw)),
        y: Math.max(0, Math.min(1, (n.y - my) / ih)),
      };
    }
    recomputeRests();
  }

  function jaggedOffPx(off: number, len: number): number {
    if (off === 0) return 0;
    const px = off * len;
    const mag = Math.min(KNOBS.jag.max, Math.max(KNOBS.jag.min, Math.abs(px)));
    return px < 0 ? -mag : mag;
  }

  function edgePath(e: { a: Node; b: Node; shape: EdgeShape }): string {
    const ax = e.a.x;
    const ay = e.a.y + e.a.dotDy;
    const bx = e.b.x;
    const by = e.b.y + e.b.dotDy;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const s = e.shape;
    if (s.kind === 'straight' || len < 4) return `M ${ax} ${ay} L ${bx} ${by}`;

    const nx = -dy / len;
    const ny = dx / len;
    const sorted = s.points.slice().sort((p, q) => p.t - q.t);
    const wp = [{ t: 0, off: 0 }, ...sorted, { t: 1, off: 0 }];

    if (s.kind === 'wave') {
      const waves = s.points.length;
      const amp = Math.abs(s.points[0].off);
      const phase = s.points[0].off >= 0 ? 0 : Math.PI;
      const segs = Math.max(48, waves * 18);
      let wd = `M ${ax.toFixed(1)} ${ay.toFixed(1)}`;
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const off = Math.sin(t * Math.PI * waves + phase) * amp;
        const x = ax + dx * t + nx * off;
        const y = ay + dy * t + ny * off;
        wd += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return wd;
    }

    let d = `M ${ax.toFixed(1)} ${ay.toFixed(1)}`;
    for (let i = 1; i < wp.length - 1; i++) {
      const off = jaggedOffPx(wp[i].off, len);
      const x = ax + dx * wp[i].t + nx * off;
      const y = ay + dy * wp[i].t + ny * off;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += ` L ${bx.toFixed(1)} ${by.toFixed(1)}`;
    return d;
  }

  function recomputeRests() {
    for (const e of edges) {
      e.rest = Math.hypot(e.a.ax - e.b.ax, e.a.ay - e.b.ay);
    }
  }

  function closestPointOnSeg(
    px: number, py: number,
    a: { x: number; y: number }, b: { x: number; y: number },
  ) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = px - a.x;
    const wy = py - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return { x: a.x, y: a.y, d: Math.hypot(px - a.x, py - a.y) };
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return { x: b.x, y: b.y, d: Math.hypot(px - b.x, py - b.y) };
    const t = c1 / c2;
    const x = a.x + t * vx;
    const y = a.y + t * vy;
    return { x, y, d: Math.hypot(px - x, py - y) };
  }

  function relaxFloatingFromEdges(iterations = 60) {
    const floats = nodes.filter((n) => n.floating);
    if (!floats.length || !edges.length) return;
    const { mx, my, iw, ih } = inset();
    if (iw < 2 || ih < 2) return;
    const polys = edges.map(edgePolyline);
    const floor = H - rulerReach() - KNOBS.decor.gap;
    const portrait = stickerBox();
    for (let it = 0; it < iterations; it++) {
      let moved = 0;
      for (const n of floats) {
        const clear = nodeExtent(n);
        let pushX = 0;
        let pushY = 0;
        let hit = false;
        for (const poly of polys) {
          for (let i = 0; i < poly.length - 1; i++) {
            const c = closestPointOnSeg(n.ax, n.ay, poly[i], poly[i + 1]);
            if (c.d >= clear) continue;
            const dx = n.ax - c.x;
            const dy = n.ay - c.y;
            const dd = Math.hypot(dx, dy) || 0.01;
            const overlap = clear - c.d;
            pushX += (dx / dd) * overlap;
            pushY += (dy / dd) * overlap;
            hit = true;
          }
        }
        for (const o of nodes) {
          if (o === n) continue;
          const s = separationPush(n, o, o.ax, o.ay, n.ax, n.ay);
          if (!s.hit) continue;
          pushX += s.x * 0.5;
          pushY += s.y * 0.5;
          hit = true;
        }
        const off = stickerPush(portrait, n.ax, n.ay, nodeHalf(n));
        if (off) {
          pushX += off.x * 2;
          pushY += off.y * 2;
          hit = true;
        }
        if (!hit) continue;
        n.ax = Math.max(mx + 6, Math.min(mx + iw - 6, n.ax + pushX * 0.5));
        n.ay = Math.max(
          my + 6,
          Math.min(my + ih - 6, floor - nodeHalf(n).y, n.ay + pushY * 0.5),
        );
        moved = Math.max(moved, Math.hypot(pushX, pushY));
      }
      if (moved < 0.5) break;
    }
    for (const n of floats) {
      n.frac = clampFrac((n.ax - mx) / iw, (n.ay - my) / ih);
    }
  }

  function segmentsCross(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number,
  ): boolean {
    const r1 = bx - ax;
    const r2 = by - ay;
    const s1 = dx - cx;
    const s2 = dy - cy;
    const den = r1 * s2 - r2 * s1;
    if (Math.abs(den) < 1e-6) return false;
    const t = ((cx - ax) * s2 - (cy - ay) * s1) / den;
    const u = ((cx - ax) * r2 - (cy - ay) * r1) / den;
    return t > 0 && t < 1 && u > 0 && u < 1;
  }

  function swapNodeAnchors(a: Node, b: Node) {
    const tAx = a.ax, tAy = a.ay, tFx = a.frac.x, tFy = a.frac.y;
    a.ax = b.ax; a.ay = b.ay; a.frac = { x: b.frac.x, y: b.frac.y };
    b.ax = tAx; b.ay = tAy; b.frac = { x: tFx, y: tFy };
  }

  function edgePolyline(e: { a: Node; b: Node; shape: EdgeShape }): { x: number; y: number }[] {
    const ax = e.a.ax;
    const ay = e.a.ay + e.a.dotDy;
    const bx = e.b.ax;
    const by = e.b.ay + e.b.dotDy;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const sorted = e.shape.points.slice().sort((p, q) => p.t - q.t);
    const wp = [{ t: 0, off: 0 }, ...sorted, { t: 1, off: 0 }];
    const pts: { x: number; y: number }[] = [];
    if (e.shape.kind === 'straight' || wp.length === 2) {
      pts.push({ x: ax, y: ay }, { x: bx, y: by });
      return pts;
    }
    const jagged = e.shape.kind === 'jagged';
    for (const p of wp) {
      const off = jagged ? jaggedOffPx(p.off, len) : p.off;
      pts.push({ x: ax + dx * p.t + nx * off, y: ay + dy * p.t + ny * off });
    }
    return pts;
  }

  function countPolylineCrossings(a: { x: number; y: number }[], b: { x: number; y: number }[]) {
    let n = 0;
    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < b.length - 1; j++) {
        if (segmentsCross(
          a[i].x, a[i].y, a[i + 1].x, a[i + 1].y,
          b[j].x, b[j].y, b[j + 1].x, b[j + 1].y,
        )) n++;
      }
    }
    return n;
  }

  function totalCurveCrossings(): number {
    const polys = edges.map(edgePolyline);
    let n = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const ei = edges[i];
        const ej = edges[j];
        if (ei.a === ej.a || ei.a === ej.b || ei.b === ej.a || ei.b === ej.b) continue;
        n += countPolylineCrossings(polys[i], polys[j]);
      }
    }
    return n;
  }

  function refineCurveCrossings() {
    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      let best = totalCurveCrossings();
      if (best === 0) return;
      for (const e of edges) {
        if (e.shape.points.length === 0) continue;
        for (const p of e.shape.points) p.off = -p.off;
        const candidate = totalCurveCrossings();
        if (candidate < best) {
          best = candidate;
          improved = true;
        } else {
          for (const p of e.shape.points) p.off = -p.off;
        }
        if (best === 0) return;
      }
      if (!improved) break;
    }
  }

  function decrossEdges() {
    const order = chainOrder;
    const safety = 12;
    for (let pass = 0; pass < safety; pass++) {
      let improved = false;
      for (let i = 0; i < order.length - 1; i++) {
        for (let j = i + 2; j < order.length - 1; j++) {
          const a1 = order[i];
          const a2 = order[i + 1];
          const b1 = order[j];
          const b2 = order[j + 1];
          if (a1 === b1 || a1 === b2 || a2 === b1) continue;
          if (!segmentsCross(
            a1.ax, a1.ay, a2.ax, a2.ay,
            b1.ax, b1.ay, b2.ax, b2.ay,
          )) continue;
          let lo = i + 1;
          let hi = j;
          while (lo < hi) {
            swapNodeAnchors(order[lo], order[hi]);
            lo++;
            hi--;
          }
          improved = true;
        }
      }
      if (!improved) break;
    }
    recomputeRests();
  }

  function polylineMinDist(
    A: { x: number; y: number }[],
    B: { x: number; y: number }[],
  ) {
    let d = Infinity;
    let ax = 0, ay = 0, bx = 0, by = 0;
    for (const p of A) {
      for (let k = 0; k < B.length - 1; k++) {
        const c = closestPointOnSeg(p.x, p.y, B[k], B[k + 1]);
        if (c.d < d) { d = c.d; ax = p.x; ay = p.y; bx = c.x; by = c.y; }
      }
    }
    for (const p of B) {
      for (let k = 0; k < A.length - 1; k++) {
        const c = closestPointOnSeg(p.x, p.y, A[k], A[k + 1]);
        if (c.d < d) { d = c.d; ax = c.x; ay = c.y; bx = p.x; by = p.y; }
      }
    }
    return { d, ax, ay, bx, by };
  }

  function nudgeEdge(e: { a: Node; b: Node }, dx: number, dy: number) {
    e.a.ax += dx; e.a.ay += dy;
    e.b.ax += dx; e.b.ay += dy;
  }

  function openNearMisses(iterations = 32) {
    const { mx, my, iw, ih } = inset();
    if (iw < 2 || ih < 2 || edges.length < 2) return;
    const CLEAR = KNOBS.lineGap.base + KNOBS.lineGap.narrow * narrowness();
    for (let it = 0; it < iterations; it++) {
      let maxPush = 0;
      const polys = edges.map(edgePolyline);
      for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const ei = edges[i];
          const ej = edges[j];
          if (ei.a === ej.a || ei.a === ej.b || ei.b === ej.a || ei.b === ej.b) continue;
          const m = polylineMinDist(polys[i], polys[j]);
          if (m.d >= CLEAR) continue;
          let ux = m.ax - m.bx;
          let uy = m.ay - m.by;
          let dd = Math.hypot(ux, uy);
          if (dd < 0.01) {
            const cdx = ei.b.ax - ei.a.ax;
            const cdy = ei.b.ay - ei.a.ay;
            const cl = Math.hypot(cdx, cdy) || 1;
            ux = -cdy / cl; uy = cdx / cl; dd = 1;
          }
          ux /= dd; uy /= dd;
          const push = (CLEAR - m.d) * 0.25;
          nudgeEdge(ei, ux * push, uy * push);
          nudgeEdge(ej, -ux * push, -uy * push);
          maxPush = Math.max(maxPush, push);
        }
      }
      for (const n of nodes) {
        n.ax = Math.max(mx + 6, Math.min(mx + iw - 6, n.ax));
        n.ay = Math.max(my + 6, Math.min(my + ih - 6, n.ay));
      }
      if (maxPush < 0.4) break;
    }
    for (const n of nodes) {
      n.frac = clampFrac((n.ax - mx) / iw, (n.ay - my) / ih);
    }
    recomputeRests();
  }

  function routeEdges() {
    decrossEdges();
    refineCurveCrossings();
    openNearMisses();
    relaxAnchors();
    computeAnchors();
    decrossEdges();
    refineCurveCrossings();
    relaxFloatingFromEdges();
  }

  /** The sides a card could open on, roomiest first. This only breaks ties:
   *  placePanel takes a side where the card is clear of the other markers over
   *  a roomier one where it isn't. */
  function sideOrder(own: DOMRect): Side[] {
    const cx = (own.left + own.right) / 2;
    const cy = (own.top + own.bottom) / 2;
    const needH = KNOBS.cardRoom.side;
    const needV = KNOBS.cardRoom.vertical;
    const narrow = narrowness();
    const vBoost = KNOBS.cardRoom.narrowBias * narrow;
    const opts: [Side, number][] = [
      ['right', window.innerWidth - cx - needH],
      ['left', cx - needH],
      ['bottom', window.innerHeight - cy - needV + vBoost],
      ['top', cy - needV + vBoost],
    ];
    opts.sort((p, q) => q[1] - p[1]);
    return opts.map(([side]) => side);
  }

  function computeAnchors(first = false) {
    const rect = root.getBoundingClientRect();
    // Same guard as generateLayout: never let a bogus early rect (zero/short)
    // squash the canvas — fall back to the viewport.
    W = safeWidth(rect);
    H = safeHeight(rect);
    svgEl.setAttribute('width', String(W));
    svgEl.setAttribute('height', String(H));
    const { mx, my, iw, ih } = inset();
    for (const n of nodes) {
      n.ax = mx + n.frac.x * iw;
      n.ay = my + n.frac.y * ih;
      if (first) {
        n.x = n.ax + (Math.random() - 0.5) * SIM.initialScatter;
        n.y = n.ay + (Math.random() - 0.5) * SIM.initialScatter;
      }
    }
    recomputeRests();
  }

  function seedFromAnchors() {
    for (const n of nodes) {
      n.x = n.ax + (Math.random() - 0.5) * SIM.initialScatter;
      n.y = n.ay + (Math.random() - 0.5) * SIM.initialScatter;
      n.vx = 0;
      n.vy = 0;
    }
  }

  /** Where a decoration's drawing sits inside its frame. The drawing is what has
   *  to stay clear, not the empty margins around it. */
  function measureDecor(el: SVGSVGElement): Box {
    const frame = el.getBoundingClientRect();
    const parts = [...el.children]
      .map((part) => part.getBoundingClientRect())
      .filter((r) => r.width > 0 || r.height > 0);
    const left = Math.min(...parts.map((r) => r.left));
    const right = Math.max(...parts.map((r) => r.right));
    const top = Math.min(...parts.map((r) => r.top));
    const bottom = Math.max(...parts.map((r) => r.bottom));
    return {
      x: (left + right) / 2 - frame.left,
      y: (top + bottom) / 2 - frame.top,
      halfX: (right - left) / 2,
      halfY: (bottom - top) / 2,
    };
  }

  /**
   * Runs on a map at rest, after a new layout. The decorations belong to the
   * texture, so the simulation doesn't know about them and one stays exactly
   * where it is for as long as the map leaves it clear. Only one the new layout
   * has run into moves, and one with no room left stays hidden.
   */
  function settleDecor() {
    decorDue = false;
    if (!decor.length) return;
    const { gap, edge, tries } = KNOBS.decor;
    const blocks: Box[] = nodes.map((n) => {
      const half = nodeHalf(n);
      return { x: n.x, y: n.y, halfX: half.x, halfY: half.y };
    });
    const portrait = stickerBox();
    if (portrait) blocks.push(portrait);
    if (ruler) {
      const canvas = root.getBoundingClientRect();
      const frame = ruler.getBoundingClientRect();
      const ink = measureDecor(ruler);
      blocks.push({
        ...ink,
        x: frame.left - canvas.left + ink.x,
        y: frame.top - canvas.top + ink.y,
      });
    }
    // Closer together than the gap, so no connector slips between two of them.
    const step = gap / 2;
    const points = edges.flatMap(({ line }) =>
      Array.from({ length: Math.ceil(line.getTotalLength() / step) + 1 }, (_, i) =>
        line.getPointAtLength(i * step),
      ),
    );
    const fits = (x: number, y: number, ink: Box) =>
      x - ink.halfX >= edge &&
      x + ink.halfX <= W - edge &&
      y - ink.halfY >= edge &&
      y + ink.halfY <= H - edge &&
      blocks.every(
        (b) =>
          Math.abs(x - b.x) >= ink.halfX + b.halfX + gap ||
          Math.abs(y - b.y) >= ink.halfY + b.halfY + gap,
      ) &&
      points.every(
        (p) => Math.abs(x - p.x) >= ink.halfX + gap || Math.abs(y - p.y) >= ink.halfY + gap,
      );

    // The ones that can stay claim their spots first, for the rest to work
    // around, and of the rest the biggest go first, while there's most room.
    const moving = decor
      .map((d) => ({ d, ink: measureDecor(d.el) }))
      .filter(({ d, ink }) => {
        if (!d.spot || !fits(d.spot.x, d.spot.y, ink)) return true;
        blocks.push({ ...ink, ...d.spot });
        return false;
      })
      .sort((a, b) => b.ink.halfX * b.ink.halfY - a.ink.halfX * a.ink.halfY);

    for (const { d, ink } of moving) {
      d.spot = null;
      d.el.removeAttribute('data-placed');
      for (let i = 0; i < tries && !d.spot; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        if (fits(x, y, ink)) d.spot = { x, y };
      }
      if (!d.spot) continue;
      blocks.push({ ...ink, ...d.spot });
      d.el.style.setProperty('--decor-x', `${d.spot.x - ink.x}px`);
      d.el.style.setProperty('--decor-y', `${d.spot.y - ink.y}px`);
      // Reading layout ends the last fade, so this one starts from nothing.
      void d.el.getBoundingClientRect();
      d.el.setAttribute('data-placed', '');
    }
  }

  function relayout() {
    computeAnchors();
    relaxAnchors();
    computeAnchors();
    straightenAngles();
    relaxAnchors();
    computeAnchors();
    routeEdges();
    decorDue = true;
  }

  function resetLayout() {
    generateLayout();
    generateEdgeShapes();
    relayout();
    seedFromAnchors();
    wake();
  }

  /**
   * Times the one-off entrance and releases it (see the `is-mounted` rules in
   * index.astro). Markers land in chain order, each connector follows the
   * later of the two it joins, and the decorative rings come in last.
   */
  function startEntrance() {
    const {
      first: NODE_BASE,
      step: NODE_STEP,
      lineLag: EDGE_LAG,
      ringStep: RING_STEP,
    } = KNOBS.entrance;
    const delays = new Map<Node, number>();

    chainOrder.forEach((n, i) => {
      const delay = NODE_BASE + i * NODE_STEP;
      delays.set(n, delay);
      n.el.style.setProperty('--enter-delay', `${delay}ms`);
    });

    const ringBase = NODE_BASE + chainOrder.length * NODE_STEP;
    let ring = 0;
    for (const n of nodes) {
      if (!n.floating) continue;
      n.el.style.setProperty('--enter-delay', `${ringBase + ring++ * RING_STEP}ms`);
    }

    for (const e of edges) {
      const after = Math.max(delays.get(e.a) ?? 0, delays.get(e.b) ?? 0);
      e.line.style.setProperty('--enter-delay', `${after + EDGE_LAG}ms`);
      e.line.setAttribute('pathLength', '1');
    }

    root.classList.add('is-mounted');
  }

  function render() {
    for (const n of nodes) {
      n.el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%)`;
    }
    for (const e of edges) {
      e.line.setAttribute('d', edgePath(e));
    }
  }

  /** Spreads the anchors of markers left too close, and moves any left on the
   *  sticker off it; returns the biggest step. */
  function resolveOverlaps(iterations = 50) {
    let biggest = 0;
    const portrait = stickerBox();
    for (let it = 0; it < iterations; it++) {
      let moved = 0;
      for (const n of nodes) {
        if (n.floating || n.dragging) continue;
        const off = stickerPush(portrait, n.ax, n.ay, nodeHalf(n));
        if (!off) continue;
        n.ax += off.x;
        n.ay += off.y;
        moved = Math.max(moved, Math.hypot(off.x, off.y));
      }
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].floating) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].floating) continue;
          const a = nodes[i];
          const b = nodes[j];
          if (a.dragging || b.dragging) continue;
          const s = separationPush(a, b, a.ax, a.ay, b.ax, b.ay);
          if (!s.hit) continue;
          const hx = s.x * 0.5;
          const hy = s.y * 0.5;
          a.ax -= hx; a.ay -= hy;
          b.ax += hx; b.ay += hy;
          moved = Math.max(moved, Math.hypot(hx, hy));
        }
      }
      biggest = Math.max(biggest, moved);
      if (moved < 0.3) break;
    }
    return biggest;
  }

  let raf = 0;
  let running = false;
  let settledFrames = 0;

  function wake() {
    settledFrames = 0;
    if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  }

  function frame() {
    for (const n of nodes) {
      n.fx = 0;
      n.fy = 0;
    }
    for (const e of edges) {
      const dx = e.b.x - e.a.x;
      const dy = e.b.y - e.a.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = (d - e.rest) * SIM.edge;
      const ux = (dx / d) * f;
      const uy = (dy / d) * f;
      e.a.fx += ux;
      e.a.fy += uy;
      e.b.fx -= ux;
      e.b.fy -= uy;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const s = separationPush(a, b, a.x, a.y, b.x, b.y);
        if (!s.hit) continue;
        if (a.floating !== b.floating) {
          const fl = a.floating ? a : b;
          const sign = a.floating ? -1 : 1;
          if (!fl.dragging) {
            fl.fx += sign * s.x * SIM.repel * 2;
            fl.fy += sign * s.y * SIM.repel * 2;
          }
          continue;
        }
        const fx = s.x * SIM.repel;
        const fy = s.y * SIM.repel;
        if (!a.dragging) {
          a.fx -= fx;
          a.fy -= fy;
        }
        if (!b.dragging) {
          b.fx += fx;
          b.fy += fy;
        }
      }
    }

    let maxMotion = 0;
    let anyDragging = false;
    for (const n of nodes) {
      if (n.dragging) {
        anyDragging = true;
        continue;
      }
      // Motion is how far it really went, not the forces on it: a ring held in
      // balance between its anchor and a marker's push feels both for good
      // without going anywhere.
      const fromX = n.x;
      const fromY = n.y;
      if (n.calm) {
        n.x += (n.ax - n.x) * SIM.calmPull;
        n.y += (n.ay - n.y) * SIM.calmPull;
        n.vx = 0;
        n.vy = 0;
      } else {
        n.x += (n.ax - n.x) * SIM.anchorPull;
        n.y += (n.ay - n.y) * SIM.anchorPull;
        n.vx = (n.vx + n.fx) * SIM.drag;
        n.vy = (n.vy + n.fy) * SIM.drag;
        n.x += n.vx;
        n.y += n.vy;
      }
      maxMotion = Math.max(maxMotion, Math.abs(n.x - fromX) + Math.abs(n.y - fromY));
    }
    render();

    if (anyDragging) {
      settledFrames = 0;
      raf = requestAnimationFrame(frame);
      return;
    }
    settledFrames = maxMotion < SIM.settleMotion ? settledFrames + 1 : 0;
    if (settledFrames >= SIM.settleFrames) {
      syncAnchorsFromSim();
      const pushed = resolveOverlaps();
      recomputeRests();
      // Markers left too close glide to their new anchors, rather than jump.
      if (pushed > 1) {
        settledFrames = 0;
        raf = requestAnimationFrame(frame);
        return;
      }
      for (const n of nodes) {
        // A ring's velocity is half of the balance that holds it (see
        // syncAnchorsFromSim); zeroing it would make it dip on the next wake.
        if (n.floating) continue;
        n.vx = 0;
        n.vy = 0;
      }
      render();
      if (decorDue) settleDecor();
      running = false;
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function setCalm(n: Node) {
    n.calm = n.hover || n.focus || isOpen(n);
  }

  function overlap(a: Rect, b: Rect) {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  }

  /**
   * Picks where a card opens, toward free space. A popup (KNOBS.popupQuery)
   * simply takes the middle of the screen. Each side of its marker is
   * tried, with the card centred on it and then slid along it, always inside
   * the visible part of the map. The card abuts its marker's box, so it never
   * covers it. The spot that pokes least out of view wins, since a card cut off
   * at the edge can't be read; then the one that covers least of the other
   * markers; then the roomiest side, the shortest slide and the fewest rings
   * covered (KNOBS.cardClear). Only when every such spot covers a marker or
   * pokes out of view does the card stand off from its own.
   *
   * The spot is written as the card's offset from its marker's box, which
   * isn't transitioned, so it lands at once; `data-place` names the side, so
   * the card arrives from it. Sizes come from layout, not the live rect, so
   * they read the same while the card is hidden or fading.
   */
  /** The part of the map in view, less `KNOBS.cardEdge`, in viewport pixels.
   *  The visual viewport leaves out what a phone's browser bars cover. */
  function viewRect(): Rect {
    const map = root.getBoundingClientRect();
    const M = KNOBS.cardEdge;
    const vv = window.visualViewport;
    return {
      left: Math.max(map.left, 0, vv?.offsetLeft ?? 0) + M,
      top: Math.max(map.top, 0, vv?.offsetTop ?? 0) + M,
      right: Math.min(map.right, window.innerWidth, vv ? vv.offsetLeft + vv.width : Infinity) - M,
      bottom: Math.min(map.bottom, window.innerHeight, vv ? vv.offsetTop + vv.height : Infinity) - M,
    };
  }

  function placePanel(n: Node) {
    const panel = n.panel;
    if (!panel) return;
    const own = n.el.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const view = viewRect();
    // A popup takes the middle of the screen, wherever its marker is.
    if (isPopup()) {
      const x = Math.max(view.left, (view.left + view.right - w) / 2);
      const y = Math.max(view.top, (view.top + view.bottom - h) / 2);
      n.el.dataset.place = 'center';
      panel.style.setProperty('--panel-x', `${Math.round(x - own.left)}px`);
      panel.style.setProperty('--panel-y', `${Math.round(y - own.top)}px`);
      return;
    }
    const { gap, grip, drift, sideStep, ring } = KNOBS.cardClear;
    const markers: Rect[] = [];
    const rings: DOMRect[] = [];
    for (const o of nodes) {
      if (o === n) continue;
      const r = o.el.getBoundingClientRect();
      if (o.floating) rings.push(r);
      else markers.push({ left: r.left - gap, top: r.top - gap, right: r.right + gap, bottom: r.bottom + gap });
    }
    const cx = (own.left + own.right) / 2;
    const cy = (own.top + own.bottom) / 2;
    const STEPS = 8;
    type Spot = { side: Side; x: number; y: number; out: number; covered: number; soft: number };
    // Compared in order, each within a pixel's worth: out of view, markers
    // covered, then the rest.
    const beats = (a: Spot, b: Spot) =>
      a.out < b.out - 1 ||
      (a.out <= b.out + 1 &&
        (a.covered < b.covered - 1 || (a.covered <= b.covered + 1 && a.soft < b.soft)));
    let best: Spot = { side: 'bottom', x: cx - w / 2, y: own.bottom, out: Infinity, covered: Infinity, soft: Infinity };
    sideOrder(own).forEach((side, rank) => {
      const vertical = side === 'bottom' || side === 'top';
      const reach = Math.max(0, (vertical ? w : h) / 2 - grip);
      for (let i = -STEPS; i <= STEPS; i++) {
        const slide = (reach * i) / STEPS;
        let x: number;
        let y: number;
        if (vertical) {
          x = Math.max(view.left, Math.min(view.right - w, cx - w / 2 + slide));
          y = side === 'bottom' ? own.bottom : own.top - h;
        } else {
          x = side === 'right' ? own.right : own.left - w;
          y = Math.max(view.top, Math.min(view.bottom - h, cy - h / 2 + slide));
        }
        const card: Rect = { left: x, top: y, right: x + w, bottom: y + h };
        const out = w * h - overlap(card, view);
        let covered = 0;
        for (const m of markers) covered += overlap(card, m);
        let soft = rank * sideStep + (vertical ? Math.abs(x + w / 2 - cx) : Math.abs(y + h / 2 - cy));
        for (const r of rings) soft += (ring * overlap(card, r)) / (r.width * r.height || 1);
        const spot = { side, x, y, out, covered, soft };
        if (beats(spot, best)) best = spot;
      }
    });
    // No clear spot touches the marker, so take the clear spot nearest to it,
    // within `drift`. Where there is none either, as on a phone, the card stays
    // against its marker, in view if it fits, covering as little as it can.
    if (best.out > 1 || best.covered > 1) {
      const SCAN = 8;
      let near: Spot | null = null;
      const top = Math.max(view.top, own.top - drift - h);
      const left = Math.max(view.left, own.left - drift - w);
      const bottom = Math.min(view.bottom, own.bottom + drift + h);
      const right = Math.min(view.right, own.right + drift + w);
      for (let y = top; y <= bottom - h; y += SCAN) {
        for (let x = left; x <= right - w; x += SCAN) {
          const card: Rect = { left: x, top: y, right: x + w, bottom: y + h };
          if (overlap(card, own) > 0 || markers.some((m) => overlap(card, m) > 0)) continue;
          const dx = Math.max(0, card.left - own.right, own.left - card.right);
          const dy = Math.max(0, card.top - own.bottom, own.top - card.bottom);
          let soft = Math.hypot(dx, dy);
          if (soft > drift) continue;
          for (const r of rings) soft += (ring * overlap(card, r)) / (r.width * r.height || 1);
          if (near && soft >= near.soft) continue;
          const side: Side =
            card.top >= own.bottom ? 'bottom'
            : card.bottom <= own.top ? 'top'
            : card.left >= own.right ? 'right'
            : 'left';
          near = { side, x, y, out: 0, covered: 0, soft };
        }
      }
      if (near) best = near;
    }
    n.el.dataset.place = best.side;
    panel.style.setProperty('--panel-x', `${Math.round(best.x - own.left)}px`);
    panel.style.setProperty('--panel-y', `${Math.round(best.y - own.top)}px`);
  }

  /** `aria-expanded` is the one record of which card is open; the page's CSS
   *  shows a card from it, and nothing else does. */
  function isOpen(n: Node) {
    return n.button?.getAttribute('aria-expanded') === 'true';
  }

  function openNode() {
    return nodes.find(isOpen);
  }

  function setOpen(n: Node, open: boolean) {
    if (!n.button || !n.panel) return;
    if (open) {
      hidePreview(n);
      placePanel(n);
    }
    n.button.setAttribute('aria-expanded', open ? 'true' : 'false');
    setCalm(n);
    wake();
  }

  function closeAll(except?: Node) {
    for (const n of nodes) if (n !== except && isOpen(n)) setOpen(n, false);
  }

  /** Re-places the open card after the map under it has moved. */
  function placeOpenPanel() {
    const n = openNode();
    if (n) placePanel(n);
  }

  /* --- Previews ------------------------------------------------------
     While a desktop pointer is on a marker's button, its preview floats
     beside the button and moves with the pointer: it keeps the pointer's
     offset from the button's near edge, so however the pointer moves over
     the button the preview never covers it. Across that, it centres on the
     pointer, held inside the view. */

  type PreviewSide = 'right' | 'left' | 'bottom' | 'top';
  type Hovered = { n: Node; side: PreviewSide; x: number; y: number };
  let hovered: Hovered | null = null;
  let previewFrame = 0;

  /** Grows from the side that faces the marker. */
  const PREVIEW_ORIGIN: Record<PreviewSide, string> = {
    right: 'left center',
    left: 'right center',
    bottom: 'center top',
    top: 'center bottom',
  };

  function positionPreview() {
    previewFrame = 0;
    const h = hovered;
    const el = h?.n.preview;
    if (!h || !el || !h.n.button) return;
    const own = h.n.button.getBoundingClientRect();
    const map = root.getBoundingClientRect();
    const view = viewRect();
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const gap = KNOBS.previewGap;
    const alongX = Math.max(view.left, Math.min(view.right - pw, h.x - pw / 2));
    const alongY = Math.max(view.top, Math.min(view.bottom - ph, h.y - ph / 2));
    let x = alongX;
    let y = alongY;
    if (h.side === 'right') x = own.right + gap + (h.x - own.left);
    else if (h.side === 'left') x = own.left - gap - (own.right - h.x) - pw;
    else if (h.side === 'bottom') y = own.bottom + gap + (h.y - own.top);
    else y = own.top - gap - (own.bottom - h.y) - ph;
    el.style.setProperty('--preview-x', `${Math.round(x - map.left)}px`);
    el.style.setProperty('--preview-y', `${Math.round(y - map.top)}px`);
  }

  /**
   * The side is picked once, as the pointer arrives, so the preview doesn't
   * jump across the marker while the pointer is on it. The first side in
   * KNOBS.previewSides where it stays wholly in view wherever the pointer goes
   * on the button wins; where none does, the one it overflows least.
   */
  function previewSide(own: DOMRect, pw: number, ph: number): PreviewSide {
    const view = viewRect();
    const gap = KNOBS.previewGap;
    const spare: Record<PreviewSide, number> = {
      right: view.right - own.right - (gap + own.width + pw),
      left: own.left - view.left - (gap + own.width + pw),
      bottom: view.bottom - own.bottom - (gap + own.height + ph),
      top: own.top - view.top - (gap + own.height + ph),
    };
    const sides = KNOBS.previewSides;
    return sides.find((side) => spare[side] >= 0) ?? sides.reduce((a, b) => (spare[b] > spare[a] ? b : a));
  }

  function showPreview(n: Node, ev: PointerEvent) {
    const el = n.preview;
    if (!el || !n.button || isPopup() || ev.pointerType !== 'mouse' || isOpen(n) || n.dragging) return;
    const side = previewSide(n.button.getBoundingClientRect(), el.offsetWidth, el.offsetHeight);
    hovered = { n, side, x: ev.clientX, y: ev.clientY };
    el.style.setProperty('--preview-origin', PREVIEW_ORIGIN[side]);
    positionPreview();
    el.dataset.shown = '';
  }

  function movePreview(n: Node, ev: PointerEvent) {
    if (hovered?.n !== n) return;
    hovered.x = ev.clientX;
    hovered.y = ev.clientY;
    if (!previewFrame) previewFrame = requestAnimationFrame(positionPreview);
  }

  function hidePreview(n: Node) {
    if (hovered?.n === n) hovered = null;
    n.preview?.removeAttribute('data-shown');
  }

  // A card closes on a press anywhere outside its marker and itself, and on
  // Escape wherever focus is. Escape hands focus back to the marker, unless
  // focus has already moved on somewhere else. A press that closes a popup
  // does only that: the click it makes doesn't also open what was under it.
  let swallowClick = false;
  document.addEventListener('pointerdown', (ev) => {
    swallowClick = false;
    const n = openNode();
    if (n && !(ev.target instanceof Element && n.el.contains(ev.target))) {
      swallowClick = isPopup();
      setOpen(n, false);
    }
  });
  document.addEventListener(
    'click',
    (ev) => {
      if (!swallowClick) return;
      swallowClick = false;
      ev.preventDefault();
      ev.stopPropagation();
    },
    true,
  );
  // Switching between a hovering pointer and touch (a tablet docked to a
  // keyboard, a resized emulator) changes how cards open, so any open card
  // closes and is placed afresh next time.
  popupMedia.addEventListener('change', () => {
    root.dataset.cards = isPopup() ? 'popup' : 'flyout';
    for (const n of nodes) hidePreview(n);
    closeAll();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const n = openNode();
    if (!n) return;
    const focused = document.activeElement;
    const reclaim = !focused || focused === document.body || n.el.contains(focused);
    setOpen(n, false);
    if (reclaim) n.button?.focus();
  });

  for (const n of nodes) {
    const hit = n.el.querySelector<HTMLButtonElement>('button');
    if (!hit) continue;

    // Hover and focus only hold a marker still, so it doesn't drift from under
    // the pointer; a card opens on a click, or on Enter or Space.
    n.el.addEventListener('pointerenter', () => {
      n.hover = true;
      setCalm(n);
      wake();
    });
    n.el.addEventListener('pointerleave', () => {
      n.hover = false;
      setCalm(n);
      wake();
    });
    n.el.addEventListener('focusin', () => {
      n.focus = true;
      setCalm(n);
      wake();
    });
    n.el.addEventListener('focusout', () => {
      n.focus = false;
      setCalm(n);
      wake();
    });

    let downX = 0;
    let downY = 0;
    let moved = false;
    let pid: number | null = null;

    // The preview follows a mouse over the button and goes when it leaves or
    // presses; a click then opens the card.
    hit.addEventListener('pointerenter', (ev) => showPreview(n, ev));
    hit.addEventListener('pointermove', (ev) => movePreview(n, ev));
    hit.addEventListener('pointerleave', () => hidePreview(n));

    hit.addEventListener('pointerdown', (ev) => {
      hidePreview(n);
      if (reduce) return;
      pid = ev.pointerId;
      downX = ev.clientX;
      downY = ev.clientY;
      moved = false;
      try {
        hit.setPointerCapture(pid);
      } catch {}
      wake();
    });
    hit.addEventListener('pointermove', (ev) => {
      if (pid === null) return;
      const dx = ev.clientX - downX;
      const dy = ev.clientY - downY;
      if (!moved && Math.hypot(dx, dy) > KNOBS.dragThreshold) {
        moved = true;
        n.dragging = true;
        n.el.classList.add('is-dragging');
      }
      if (n.dragging) {
        const r = root.getBoundingClientRect();
        n.x = ev.clientX - r.left;
        n.y = ev.clientY - r.top;
        n.vx = 0;
        n.vy = 0;
        wake();
      }
    });
    const endDrag = () => {
      if (pid === null) return;
      try {
        hit.releasePointerCapture(pid);
      } catch {}
      pid = null;
      if (n.dragging) {
        n.dragging = false;
        n.el.classList.remove('is-dragging');
        const { mx, my, iw, ih } = inset();
        n.frac = {
          x: Math.max(0, Math.min(1, (n.x - mx) / iw)),
          y: Math.max(0, Math.min(1, (n.y - my) / ih)),
        };
        n.ax = n.x;
        n.ay = n.y;
        recomputeRests();
        if (isOpen(n)) placePanel(n);
        decrossEdges();
        refineCurveCrossings();
        wake();
      }
    };
    hit.addEventListener('pointerup', endDrag);
    hit.addEventListener('pointercancel', endDrag);

    hit.addEventListener('click', (ev) => {
      if (moved) {
        ev.preventDefault();
        return;
      }
      // The name at the centre reshuffles the map instead of opening a card.
      if (n.cfg.kind === 'identity') {
        resetLayout();
        closeAll();
        return;
      }
      const wasOpen = isOpen(n);
      closeAll(n);
      setOpen(n, !wasOpen);
    });
  }

  // Resize handling is split in two so the diagram doesn't convulse while the
  // user drags the window: during an active resize we only do a cheap anchor
  // remap each frame (nodes glide to track the new size), and the expensive
  // re-spacing / re-routing is debounced to fire once the viewport has been
  // stable for a beat — i.e. after the resize handle is released.
  let resizeScheduled = false;
  let lastLandscape: boolean | null = null;
  let lastObsW = 0;
  let lastObsH = 0;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const remapToViewport = () => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      computeAnchors();
      placeOpenPanel();
      wake();
    });
  };

  // Heavy re-layout once the viewport has settled. Re-derive the spine when
  // the orientation flipped / the chain runs across the wrong axis / boxes are
  // crowded, then RESEED the live positions onto the freshly separated anchors
  // before waking the sim. Seeding is essential: without it the sim would
  // transit from the old positions to the new anchors and could fold the chain
  // into the centre — the exact "collapse" this layout is designed to avoid.
  const settleLayout = () => {
    computeAnchors();
    const landscape = isLandscape();
    const orientChanged = lastLandscape !== null && lastLandscape !== landscape;
    lastLandscape = landscape;
    if (orientChanged || orientationMismatched() || layoutIsCrowded()) {
      layoutSpine(landscape, 0.15);
    }
    measureDotOffsets();
    relayout();
    seedFromAnchors();
    render();
    placeOpenPanel();
    wake();
  };

  // Only react to genuine size changes. A ResizeObserver always fires once on
  // observe, and font swaps / sub-pixel jitter can fire it again — running the
  // heavy settle on those no-op fires needlessly re-randomises (and could
  // disturb) a layout that is already correct, so we ignore them.
  const onResize = () => {
    const rect = root.getBoundingClientRect();
    const w = safeWidth(rect);
    const h = safeHeight(rect);
    if (Math.abs(w - lastObsW) < 1 && Math.abs(h - lastObsH) < 1) return;
    lastObsW = w;
    lastObsH = h;
    remapToViewport();
    if (settleTimer !== null) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      settleLayout();
    }, KNOBS.resizeSettle);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(root);

  generateLayout();
  generateEdgeShapes();
  computeAnchors(true);
  lastLandscape = isLandscape();
  lastObsW = W;
  lastObsH = H;
  measureDotOffsets();
  relayout();
  seedFromAnchors();
  render();
  startEntrance();

  if (reduce) {
    for (const n of nodes) {
      n.x = n.ax;
      n.y = n.ay;
    }
    render();
    settleDecor();
    return;
  }

  wake();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    } else {
      wake();
    }
  });
}
