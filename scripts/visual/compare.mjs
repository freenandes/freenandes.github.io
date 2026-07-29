/* =========================================================================
   compare.mjs

   Pixel and computed-style comparison, plus the report the run prints.
   ========================================================================= */

import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/** Per-pixel colour tolerance; below this, two pixels count as the same. */
const PIXEL_THRESHOLD = 0.1;

/**
 * @returns {{ changed: number, total: number, ratio: number, diff: Buffer|null, note?: string }}
 */
export function comparePng(before, after) {
  const a = PNG.sync.read(before);
  const b = PNG.sync.read(after);
  if (a.width !== b.width || a.height !== b.height) {
    return { changed: Infinity, total: 0, ratio: 1, diff: null, note: 'different size' };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: PIXEL_THRESHOLD,
  });
  const total = a.width * a.height;
  return {
    changed,
    total,
    ratio: changed / total,
    diff: changed > 0 ? PNG.sync.write(diff) : null,
  };
}

/** Flat list of `selector { property: before -> after }` differences. */
export function compareStyles(before, after) {
  const out = [];
  for (const [selector, properties] of Object.entries(before)) {
    if (!after[selector]) {
      out.push(`${selector} — gone`);
      continue;
    }
    for (const [property, value] of Object.entries(properties)) {
      const next = after[selector][property];
      if (next !== value) out.push(`${selector} { ${property}: ${value} → ${next} }`);
    }
  }
  for (const selector of Object.keys(after)) {
    if (!before[selector]) out.push(`${selector} — new`);
  }
  return out;
}

const pct = (ratio) => `${(ratio * 100).toFixed(3)}%`;

/** Prints the run and returns true when everything is within tolerance. */
export function report(results, styleDiffs, outDir) {
  const rows = results.map((r) => {
    const drift = r.scenario.drift ?? 0;
    const withinDrift = r.pixels.ratio <= drift;
    const status = r.pixels.changed === 0 ? 'same' : withinDrift ? 'drift' : 'CHANGED';
    return { ...r, status };
  });

  const width = Math.max(...rows.map((r) => r.key.length));
  console.log('\nPixels');
  for (const row of rows) {
    const detail =
      row.pixels.changed === 0
        ? 'identical'
        : `${row.pixels.changed} px (${pct(row.pixels.ratio)})${row.pixels.note ? ` — ${row.pixels.note}` : ''}`;
    console.log(`  ${row.status.padEnd(7)} ${row.key.padEnd(width)}  ${detail}`);
  }

  console.log('\nComputed styles');
  if (styleDiffs.length === 0) {
    console.log('  no differences across the probed selectors');
  } else {
    for (const line of styleDiffs) console.log(`  ${line}`);
  }

  const changed = rows.filter((r) => r.status === 'CHANGED');
  const drifted = rows.filter((r) => r.status === 'drift');
  console.log('');
  if (drifted.length) {
    console.log(
      `${drifted.length} scenario(s) within their allowed drift: ${drifted.map((r) => r.key).join(', ')}`
    );
  }
  if (changed.length === 0 && styleDiffs.length === 0) {
    console.log('No visual change.');
    return true;
  }
  if (changed.length) {
    console.log(`${changed.length} scenario(s) changed. Diff images in ${outDir}:`);
    for (const row of changed) console.log(`  ${row.key}.png`);
  }
  console.log('\nReview the diffs; if the change is intended, this run is your evidence.');
  return false;
}
