#!/usr/bin/env node
/* =========================================================================
   visual-check.mjs

   Answers one question: does this working tree look any different from a
   reference commit?

   It builds both, serves them side by side, photographs the same list of pages
   and states in each (see scripts/visual/scenarios.mjs), then compares the
   screenshots pixel by pixel *and* compares computed styles — the second catches
   changes a screenshot can't see, like an off-screen element or a different way
   of parking the skip link.

   Usage:
     npm run visual                       # against origin/main
     npm run visual -- --base HEAD~1
     npm run visual -- --only about       # scenarios whose name contains "about"
     npm run visual -- --keep             # keep the two builds around

   Exit code is 1 when anything changed, so it can gate a commit.
   ========================================================================= */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import astroConfig from '../astro.config.mjs';
import { launch, capture } from './visual/capture.mjs';
import { comparePng, compareStyles, report } from './visual/compare.mjs';
import { serveDist } from './visual/static-server.mjs';
import { scenarios, viewports, styleProbes, styleProperties } from './visual/scenarios.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.visual');
/** Served where the site is: astro.config.mjs owns the base path. */
const BASE_PATH = astroConfig.base ?? '/';

function parseArgs(argv) {
  const args = { base: null, only: null, keep: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--only') args.only = argv[++i];
    else if (argv[i] === '--keep') args.keep = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

const git = async (...args) => (await run('git', args, { cwd: ROOT })).stdout.trim();

/** origin/main if it has been fetched, else main — whichever exists. */
async function defaultBase() {
  for (const ref of ['origin/main', 'main']) {
    try {
      await git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
      return ref;
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No main branch to compare against. Pass --base <ref>.');
}

async function build(cwd, outDir, label) {
  console.log(`  building ${label}…`);
  await run('npm', ['run', 'encrypt', '--silent'], { cwd });
  await run('npx', ['astro', 'build', '--outDir', outDir], { cwd });
}

/**
 * Builds a reference commit in a throwaway worktree, so the working tree — the
 * thing being tested, uncommitted changes and all — is never touched.
 */
async function buildRef(ref, outDir) {
  const src = path.join(OUT, 'ref-src');
  await rm(src, { recursive: true, force: true });
  await git('worktree', 'prune');
  await git('worktree', 'add', '--detach', '--quiet', src, ref);
  try {
    const lockChanged = await git('diff', '--name-only', ref, '--', 'package-lock.json');
    if (lockChanged) {
      console.log('  note: package-lock.json differs from the reference; reusing the installed modules anyway.');
    }
    await symlink(path.join(ROOT, 'node_modules'), path.join(src, 'node_modules'), 'dir');
    await build(src, outDir, `${ref} (${(await git('rev-parse', '--short', ref))})`);
  } finally {
    await git('worktree', 'remove', '--force', src).catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base ?? (await defaultBase());
  const picked = args.only
    ? scenarios.filter((s) => s.name.includes(args.only))
    : scenarios;
  if (!picked.length) throw new Error(`No scenario matches "${args.only}".`);

  if (!existsSync(path.join(ROOT, 'node_modules'))) {
    throw new Error('Run npm install first.');
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const refDist = path.join(OUT, 'base');
  const headDist = path.join(OUT, 'current');
  await buildRef(base, refDist);
  await build(ROOT, headDist, 'the working tree');

  const before = await serveDist(refDist, BASE_PATH);
  const after = await serveDist(headDist, BASE_PATH);
  const browser = await launch();
  const probes = { selectors: styleProbes, properties: styleProperties };

  const results = [];
  const styleDiffs = [];
  try {
    for (const scenario of picked) {
      for (const [viewportName, viewport] of Object.entries(viewports)) {
        const key = `${scenario.name}-${viewportName}`;
        process.stdout.write(`  capturing ${key}…\r`);
        // Interleaved rather than one whole build then the other: the map's
        // simulation is timing-sensitive, so the two shots should be neighbours.
        const shotBefore = await capture(browser, before, scenario, viewport, probes);
        const shotAfter = await capture(browser, after, scenario, viewport, probes);
        const pixels = comparePng(shotBefore.png, shotAfter.png);
        if (pixels.diff) await writeFile(path.join(OUT, `${key}.png`), pixels.diff);
        results.push({ key, scenario, pixels });
        if (viewportName === 'desk') {
          for (const line of compareStyles(shotBefore.styles, shotAfter.styles)) {
            styleDiffs.push(`${scenario.name}: ${line}`);
          }
        }
      }
    }
  } finally {
    await browser.close();
    await before.close();
    await after.close();
  }

  console.log(`\n${base} → working tree`);
  const clean = report(results, styleDiffs, path.relative(ROOT, OUT));

  if (!args.keep) {
    await rm(refDist, { recursive: true, force: true });
    await rm(headDist, { recursive: true, force: true });
  }
  process.exitCode = clean ? 0 : 1;
}

main().catch((err) => {
  console.error('\n[visual] Failed:', err.message);
  process.exit(2);
});
