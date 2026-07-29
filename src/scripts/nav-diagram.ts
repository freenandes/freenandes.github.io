type Node = {
  el: HTMLElement;
  id: string;
  
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

export function initDiagram(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('[data-links]');
  const edgeData = Array.from(
    root.querySelectorAll<HTMLElement>('.diagram__edges-data > li')
  );
  const nodeEls = Array.from(root.querySelectorAll<HTMLElement>('[data-node]'));
  if (!svg || !nodeEls.length) return;
  const svgEl: SVGSVGElement = svg;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const nodes: Node[] = nodeEls.map((el) => ({
    el,
    id: el.dataset.id || '',
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
    floating: el.dataset.floating !== undefined,
    calm: false,
    dragging: false,
    hover: false,
    focus: false,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges = edgeData
    .map((li) => {
      const a = byId.get(li.dataset.a || '');
      const b = byId.get(li.dataset.b || '');
      if (!a || !b) return null;
      const line = document.createElementNS(SVG_NS, 'path');
      line.setAttribute('class', 'link-line');
      line.setAttribute('fill', 'none');
      svgEl.appendChild(line);
      const shape: EdgeShape = { kind: 'straight', points: [] };
      return { a, b, line, rest: 0, shape };
    })
    .filter(Boolean) as {
    a: Node;
    b: Node;
    line: SVGPathElement;
    rest: number;
    shape: EdgeShape;
  }[];

  // Order the nodes along the chain (the diagram is one open line) so the
  // random walk lays them out sequentially and the connectors read as a line.
  const chainOrder: Node[] = (() => {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      (adj.get(e.a.id) || adj.set(e.a.id, []).get(e.a.id)!).push(e.b.id);
      (adj.get(e.b.id) || adj.set(e.b.id, []).get(e.b.id)!).push(e.a.id);
    }
    const ends = [...adj.keys()].filter((id) => (adj.get(id) || []).length === 1);
    if (!ends.length) return nodes.slice();
    const order: Node[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = ends[0];
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const n = byId.get(cur);
      if (n) order.push(n);
      cur = (adj.get(cur) || []).find((id) => !seen.has(id));
    }
    // Append any stragglers (defensive: not a clean path). Floating nodes are
    // never part of the chain — they are laid out independently.
    for (const n of nodes) if (!seen.has(n.id) && !n.floating) order.push(n);
    return order;
  })();

  let W = 0;
  let H = 0;

  
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

  function inset() {
    const narrow = narrowness();
    // Labels are centered under the dot and extend to each side, so the
    // horizontal margin grows a little on narrow viewports. The vertical
    // margin gets a small boost so the end labels have room.
    const mx = Math.min((0.12 + 0.1 * narrow) * W, 160);
    const my = Math.min((0.08 + 0.04 * narrow) * H, 150);
    return { mx, my, iw: Math.max(1, W - 2 * mx), ih: Math.max(1, H - 2 * my) };
  }

  function configFrac(n: Node, landscape: boolean) {
    const el = n.el;
    const x = parseFloat(landscape ? el.dataset.lx || '0.5' : el.dataset.px || '0.5');
    const y = parseFloat(landscape ? el.dataset.ly || '0.5' : el.dataset.py || '0.5');
    return { x, y };
  }

  function clampFrac(x: number, y: number) {
    return {
      x: Math.max(0.08, Math.min(0.92, x)),
      y: Math.max(0.08, Math.min(0.92, y)),
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
    // starts/stops without ever bunching the nodes together.
    const endPad = 0.03 + Math.random() * 0.05;
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
      chainOrder[i].frac = blendWithConfig(chainOrder[i], landscape, spine, configMix);
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
    const count = 4 + Math.floor(Math.random() * 3);
    const amp = 10 + Math.random() * 10;
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
      const dot = n.el.querySelector('.node__dot');
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
    return {
      x: 34 - 12 * narrow,
      y: 30 - 16 * narrow,
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

  function adaptLayoutForViewport(landscape: boolean) {
    layoutSpine(landscape, 0.15);
  }

  function syncAnchorsFromSim() {
    const { mx, my, iw, ih } = inset();
    for (const n of nodes) {
      if (n.dragging) continue;
      n.ax = n.x;
      n.ay = n.y;
      n.frac = {
        x: Math.max(0, Math.min(1, (n.x - mx) / iw)),
        y: Math.max(0, Math.min(1, (n.y - my) / ih)),
      };
      n.el.dataset.place = placeFor(n);
    }
    recomputeRests();
  }

  function jaggedOffPx(off: number, len: number): number {
    if (off === 0) return 0;
    const px = off * len;
    const mag = Math.min(60, Math.max(16, Math.abs(px)));
    return px < 0 ? -mag : mag;
  }

  function edgePath(e: { a: Node; b: Node; shape: EdgeShape; liveSpikes?: { x: number; y: number; vx: number; vy: number }[] | null }): string {
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
    const spikes = e.liveSpikes;
    if (spikes && spikes.length === s.points.length) {
      const indexed = s.points
        .map((p, i) => ({ i, t: p.t }))
        .sort((p, q) => p.t - q.t);
      for (const { i } of indexed) {
        const sp = spikes[i];
        d += ` L ${sp.x.toFixed(1)} ${sp.y.toFixed(1)}`;
      }
    } else {
      for (let i = 1; i < wp.length - 1; i++) {
        const off = jaggedOffPx(wp[i].off, len);
        const x = ax + dx * wp[i].t + nx * off;
        const y = ay + dy * wp[i].t + ny * off;
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
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
        if (!hit) continue;
        n.ax = Math.max(mx + 6, Math.min(mx + iw - 6, n.ax + pushX * 0.5));
        n.ay = Math.max(my + 6, Math.min(my + ih - 6, n.ay + pushY * 0.5));
        moved = Math.max(moved, Math.hypot(pushX, pushY));
      }
      if (moved < 0.5) break;
    }
    for (const n of floats) {
      n.frac = clampFrac((n.ax - mx) / iw, (n.ay - my) / ih);
      n.el.dataset.place = placeFor(n);
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
    a.el.dataset.place = placeFor(a);
    b.el.dataset.place = placeFor(b);
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
    const CLEAR = 54 - 20 * narrowness();
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

  function placeFor(n: Node): string {
    const right = W - n.ax;
    const left = n.ax;
    const top = n.ay;
    const bottom = H - n.ay;
    const needH = 220;
    const needV = 80;
    const narrow = narrowness();
    const vBoost = 80 * narrow;
    const opts: [string, number][] = [
      ['right', right - needH],
      ['left', left - needH],
      ['bottom', bottom - needV + vBoost],
      ['top', top - needV + vBoost],
    ];
    opts.sort((p, q) => q[1] - p[1]);
    return opts[0][0];
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
      n.el.dataset.place = placeFor(n);
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

  
  function relayout() {
    computeAnchors();
    relaxAnchors();
    computeAnchors();
    straightenAngles();
    relaxAnchors();
    computeAnchors();
    routeEdges();
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
   * NavDiagram.astro). Markers land in chain order, each connector follows the
   * later of the two it joins, and the decorative rings come in last.
   */
  function startEntrance() {
    const NODE_BASE = 40;
    const NODE_STEP = 50;
    const EDGE_LAG = 40;
    const RING_STEP = 90;
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

  function resolveOverlaps(iterations = 50) {
    for (let it = 0; it < iterations; it++) {
      let moved = 0;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].floating) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[j].floating) continue;
          const a = nodes[i];
          const b = nodes[j];
          if (a.dragging || b.dragging) continue;
          const s = separationPush(a, b, a.x, a.y, b.x, b.y);
          if (!s.hit) continue;
          const hx = s.x * 0.5;
          const hy = s.y * 0.5;
          a.x -= hx; a.y -= hy;
          b.x += hx; b.y += hy;
          moved = Math.max(moved, Math.hypot(hx, hy));
        }
      }
      if (moved < 0.3) break;
    }
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
      if (n.calm) {
        const mx = n.ax - n.x;
        const my = n.ay - n.y;
        n.x += mx * SIM.calmPull;
        n.y += my * SIM.calmPull;
        n.vx = 0;
        n.vy = 0;
        maxMotion = Math.max(maxMotion, Math.abs(mx) + Math.abs(my));
        continue;
      }
      const tx = n.ax;
      const ty = n.ay;
      const homeX = tx - n.x;
      const homeY = ty - n.y;
      n.x += homeX * SIM.anchorPull;
      n.y += homeY * SIM.anchorPull;
      n.vx = (n.vx + n.fx) * SIM.drag;
      n.vy = (n.vy + n.fy) * SIM.drag;
      n.x += n.vx;
      n.y += n.vy;
      maxMotion = Math.max(
        maxMotion,
        Math.abs(n.vx) +
          Math.abs(n.vy) +
          Math.abs(homeX) * SIM.anchorPull +
          Math.abs(homeY) * SIM.anchorPull
      );
    }
    render();

    if (anyDragging) {
      settledFrames = 0;
      raf = requestAnimationFrame(frame);
      return;
    }
    settledFrames = maxMotion < SIM.settleMotion ? settledFrames + 1 : 0;
    if (settledFrames >= SIM.settleFrames) {
      resolveOverlaps();
      syncAnchorsFromSim();
      for (const n of nodes) {
        n.vx = 0;
        n.vy = 0;
      }
      render();
      running = false;
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function setCalm(n: Node) {
    n.calm = n.hover || n.focus || n.el.classList.contains('is-open');
  }
  /**
   * Pulls a card back inside the viewport when its node sits near an edge.
   *
   * This runs at the moment a card is asked for, which is also the moment its
   * fade begins — so it must not touch the card's transition. Instead of
   * neutralising it to get a clean measurement, the resting position is derived
   * from the panel's layout box (the live rect with its `transform` matrix taken
   * back out), which reads the same whether or not a transition is in flight.
   * The correction is written to `translate`, which isn't transitioned, so it
   * lands in one frame.
   */
  function clampPanel(n: Node) {
    const panel = n.el.querySelector<HTMLElement>('.node__panel');
    if (!panel) return;
    panel.style.setProperty('--panel-nudge-x', '0px');
    panel.style.setProperty('--panel-nudge-y', '0px');
    const rect = panel.getBoundingClientRect();
    const matrix = getComputedStyle(panel).transform;
    const placement =
      matrix && matrix !== 'none' ? new DOMMatrixReadOnly(matrix) : null;
    const boxX = rect.left - (placement ? placement.m41 : 0);
    const boxY = rect.top - (placement ? placement.m42 : 0);
    // Once open, the placement transform is only the centring half-step
    // (`--shift` is 0), so that is all that goes back on.
    const acrossNode = n.el.dataset.place === 'bottom' || n.el.dataset.place === 'top';
    const left = boxX - (acrossNode ? rect.width / 2 : 0);
    const top = boxY - (acrossNode ? 0 : rect.height / 2);
    const M = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = 0;
    let ny = 0;
    if (left < M) nx = M - left;
    else if (left + rect.width > vw - M) nx = (vw - M) - (left + rect.width);
    if (top < M) ny = M - top;
    else if (top + rect.height > vh - M) ny = (vh - M) - (top + rect.height);
    panel.style.setProperty('--panel-nudge-x', `${Math.round(nx)}px`);
    panel.style.setProperty('--panel-nudge-y', `${Math.round(ny)}px`);
  }

  function clampVisiblePanels() {
    for (const n of nodes) {
      if (n.el.classList.contains('is-open') || n.hover || n.focus) clampPanel(n);
    }
  }

  function setOpen(n: Node, open: boolean) {
    n.el.classList.toggle('is-open', open);
    n.el
      .querySelector('.node__hit')
      ?.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) clampPanel(n);
    setCalm(n);
    wake();
  }
  function closeAll(except?: Node) {
    for (const n of nodes) if (n !== except) setOpen(n, false);
  }

  root.addEventListener('pointerdown', (ev) => {
    if (!(ev.target as HTMLElement).closest('[data-node]')) closeAll();
  });
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeAll();
  });

  for (const n of nodes) {
    const hit = n.el.querySelector<HTMLButtonElement>('.node__hit');
    if (!hit) continue;

    n.el.addEventListener('pointerenter', () => {
      n.hover = true;
      clampPanel(n);
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
      clampPanel(n);
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

    hit.addEventListener('pointerdown', (ev) => {
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
      if (!moved && Math.hypot(dx, dy) > 6) {
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
        n.el.dataset.place = placeFor(n);
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
      if (n.id === 'pedro') {
        resetLayout();
        closeAll();
        return;
      }
      const wasOpen = n.el.classList.contains('is-open');
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
  const SETTLE_DELAY = 220; // ms of quiet before the heavy re-layout runs

  const remapToViewport = () => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      computeAnchors();
      clampVisiblePanels();
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
      adaptLayoutForViewport(landscape);
    }
    measureDotOffsets();
    relayout();
    seedFromAnchors();
    clampVisiblePanels();
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
    }, SETTLE_DELAY);
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
