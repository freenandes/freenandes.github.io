/** Lays the paper texture (global.css → Layout) in square tiles, each turned a
    random number of quarter turns, mirrored or not, and cut from a random
    square of the scan's width, so it repeats without a visible pattern.
    Quarter turns only: a tile turned by anything else would leave gaps between
    tiles or overlap them. A new roll on every visit, like the map. Tiles are
    added as the page grows, and never moved or redrawn. */

// One draw from Math.random seeds the rest. A tile's look then depends only on
// its place, so rows added later don't reshuffle those above, and the map's
// random sequence (which `npm run visual` seeds) moves by a single draw.
const seed = Math.floor(Math.random() * 2 ** 32);

/** A repeatable number in [0, 1) for one trait of the tile at (col, row). */
function roll(col: number, row: number, trait: number): number {
  let h = seed ^ Math.imul(col, 0x27d4eb2d) ^ Math.imul(row, 0x165667b1) ^ Math.imul(trait + 1, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}

const paper = document.createElement('div');
paper.className = 'paper';
paper.setAttribute('aria-hidden', 'true');
document.body.prepend(paper);

const laid = new Set<string>();

function add(col: number, row: number): void {
  const key = `${col},${row}`;
  if (laid.has(key)) return;
  laid.add(key);
  const tile = document.createElement('div');
  tile.style.setProperty('--col', String(col));
  tile.style.setProperty('--row', String(row));
  tile.style.setProperty('--turn', String(Math.floor(roll(col, row, 0) * 4)));
  tile.style.setProperty('--mirror', roll(col, row, 1) < 0.5 ? '1' : '-1');
  tile.style.setProperty('--crop', `${(roll(col, row, 2) * 100).toFixed(2)}%`);
  paper.append(tile);
}

/** Covers the page: column 0 centred, as many either side as the width needs. */
function lay(): void {
  const side = first.offsetWidth;
  if (!side) return;
  const cols = Math.ceil((paper.clientWidth / side - 1) / 2);
  const rows = Math.ceil(paper.clientHeight / side);
  for (let row = 0; row < rows; row++) {
    for (let col = -cols; col <= cols; col++) add(col, row);
  }
}

// The page growing needs more tiles, and so does a smaller --texture-size.
add(0, 0);
const first = paper.firstElementChild as HTMLElement;
const watch = new ResizeObserver(lay);
watch.observe(paper);
watch.observe(first);
