#!/usr/bin/env node
/* =========================================================================
   check-docs.mjs

   Fails when the docs or the code comments point at something that no
   longer exists:

     npm run check:docs

   It reads the Markdown docs below and every comment in the code, and checks
   that each of these still resolves:
   - a file path (in backticks, or starting `src/`, `scripts/` or `public/`)
     names a file in the repo, `<placeholders>` and `*` matching any name;
   - `npm run <script>` is in package.json;
   - a custom property (`--name`) or a `name()` appears in the code itself,
     not just in another comment;
   - `KNOBS.key` and `SIM.key` are keys in the map script;
   - a link to a heading (`#anchor`, `README.md#anchor`, `README → "Heading"`)
     finds it.
   It can't tell whether a sentence is still true; that's on whoever changes
   the code.
   ========================================================================= */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Knobs ------------------------------------------------------------------- */

/** The Markdown docs, checked whole. */
const DOCS = ['README.md', 'AGENTS.md', 'SPEC-COMPLIANCE.md', 'src/protected/README.md'];

/** Where comments are checked: code and config files, but not the case
    studies, which are content, or this file, whose examples aren't real. */
const CODE = /^(?!src\/content\/|scripts\/check-docs\.mjs).*\.(astro|ts|mjs|js|css|html|yml)$/;

/** Named in the docs but never in git: generated, or local-only. */
const UNTRACKED = [
  'dist/',
  '.visual/',
  '.astro/',
  'node_modules/',
  'notes/',
  'sources/',
  'public/locked/',
  'src/protected/passwords.json',
  'src/protected/<slug>.md',
];

/** Other tools' command-line flags, which look like custom properties. */
const FLAGS = ['--no-audit', '--no-fund', '--host'];

/* ------------------------------------------------------------------------- */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
/** The repo's top-level names: a path starting anywhere else, like
    `origin/main` or `astro/tsconfigs/strict`, isn't one of its files. */
const TOP = new Set(files.map((file) => file.split('/')[0]).concat(UNTRACKED.map((u) => u.split('/')[0])));

/** Comments: block (not a glob's `/*`), HTML, line, and YAML. */
const COMMENT = /(?<![\w'"`./*])\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^[ \t]*\/\/.*$/gm;
const YAML_COMMENT = /^[ \t]*#.*$/gm;

const codeFiles = files.filter((file) => CODE.test(file));
const comments = []; // { file, line, text }
let code = read('package.json');
for (const file of codeFiles) {
  const text = read(file);
  const pattern = file.endsWith('.yml') ? YAML_COMMENT : COMMENT;
  for (const match of text.matchAll(pattern)) {
    comments.push({ file, line: lineAt(text, match.index), text: match[0] });
  }
  code += '\n' + text.replace(pattern, ' ');
}

const scripts = Object.keys(JSON.parse(read('package.json')).scripts);
const solver = read('src/scripts/nav-diagram.ts').replace(COMMENT, ' ');
const headings = new Map(DOCS.map((doc) => [doc, headingsOf(read(doc))]));

const problems = [];
let checked = 0;
const fail = (where, message) => problems.push(`${where}: ${message}`);

for (const doc of DOCS) {
  const text = read(doc);
  // Fenced code is examples, not references, except for the commands in it.
  const prose = text.replace(/^```[\s\S]*?^```/gm, (block) => block.replace(/[^\n]/g, ' '));
  checkCommands(text, (i) => `${doc}:${lineAt(text, i)}`);
  checkReferences(prose, doc, (i) => `${doc}:${lineAt(text, i)}`, true);
}
for (const { file, line, text } of comments) {
  const where = (i) => `${file}:${line + lineAt(text, i) - 1}`;
  checkCommands(text, where);
  checkReferences(text, path.dirname(file), where, false);
}

if (problems.length) {
  console.error(`check-docs: ${problems.length} broken reference(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-docs: ${checked} references in the docs and comments all resolve.`);

/* ------------------------------------------------------------------------- */

function checkCommands(text, where) {
  for (const match of text.matchAll(/\bnpm run ([\w:-]+)/g)) {
    checked++;
    if (!scripts.includes(match[1])) fail(where(match.index), `no npm script "${match[1]}"`);
  }
}

/** `from` is the doc's file for its links, or a comment's folder for its
    relative paths. In a doc, only backticked spans count as code. */
function checkReferences(text, from, where, isDoc) {
  const spans = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => ({ value: m[1], index: m.index }));

  // Paths: backticked, plus bare ones under the main folders.
  const paths = spans.filter(({ value }) => isPath(value));
  for (const m of text.matchAll(/(?<![\w/`.-])(?:src|scripts|public)\/[\w./<>*[\]-]*[\w>*\]/]/g)) {
    if (!paths.some((p) => m.index > p.index && m.index < p.index + p.value.length + 2)) {
      paths.push({ value: m[0], index: m.index });
    }
  }
  for (const { value, index } of paths) {
    checked++;
    const relative = /^\.\.?\//.test(value) && !isDoc ? path.join(from, value) : value;
    if (!exists(relative)) fail(where(index), `no file ${value}`);
  }

  // Custom properties and functions: in a doc, only in backticks.
  const codeText = isDoc ? spans.map((s) => s.value).join('\n') : text;
  const at = (value) => (isDoc ? spans.find((s) => s.value.includes(value))?.index ?? 0 : text.indexOf(value));
  for (const m of codeText.matchAll(/(?<![\w-])--[a-zA-Z][\w-]*(?:(?:\*|<[^>]+>)[\w-]*)*/g)) {
    if (FLAGS.includes(m[0])) continue;
    checked++;
    const pattern = m[0].replace(/\*|<[^>]+>/g, '[\\w-]+');
    if (!new RegExp(`(?<![\\w-])${pattern}(?![\\w-])`).test(code)) {
      fail(where(at(m[0])), `no custom property ${m[0]} in the code`);
    }
  }
  for (const m of text.matchAll(/`(\w+)\(\)`/g)) {
    checked++;
    if (!new RegExp(`\\b${m[1]}\\b`).test(code)) fail(where(m.index), `no ${m[1]}() in the code`);
  }
  for (const m of text.matchAll(/\b(KNOBS|SIM)\.(\w+)/g)) {
    checked++;
    if (!new RegExp(`^\\s+${m[2]}:`, 'm').test(solver)) fail(where(m.index), `no ${m[0]} in nav-diagram.ts`);
  }

  // Headings.
  for (const m of text.matchAll(/\]\((?:\.\/)?([\w.-]*\.md)?#([\w-]+)\)/g)) {
    checked++;
    const doc = m[1] ? m[1] : isDoc ? from : undefined;
    if (doc && !headings.get(doc)?.slugs.includes(m[2])) fail(where(m.index), `no heading #${m[2]} in ${doc}`);
  }
  for (const m of text.matchAll(/README\.md → |README → (?:"([^"]+)")?/g)) {
    checked++;
    if (!m[1]) fail(where(m.index), 'quote the heading a README reference points to: README → "Heading"');
    else if (!headings.get('README.md').titles.includes(m[1].toLowerCase())) {
      fail(where(m.index), `no heading "${m[1]}" in README.md`);
    }
  }
}

/** A backticked span that names a file: under one of the repo's top-level
    folders, relative, or a file name with a known extension. */
function isPath(value) {
  if (/^[/@]|:\/\/|\s(?![^<]*>)/.test(value) || !/^[\w.@<>*[\]/ -]+$/.test(value)) return false;
  if (value.includes('/')) return /^\.{1,2}\//.test(value) || TOP.has(value.split('/')[0]);
  return /^[^.].*\.(astro|ts|mjs|js|css|mdx?|json|svg|png|jpg|yml|html|txt|woff2|ico)$/.test(value);
}

function exists(value) {
  const name = path.posix.normalize(value);
  if (UNTRACKED.some((u) => value === u || value.startsWith(u) || value === path.basename(u))) return true;
  const pattern = new RegExp(
    '^' +
      name
        .replace(/\/$/, '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/<[^>]+>|\\\*/g, '[^/]+') +
      (name.includes('/') ? '(?:/.*)?$' : '$')
  );
  return files.some((file) => pattern.test(name.includes('/') ? file : path.basename(file)));
}

/** A Markdown file's headings, as lower-case titles and GitHub's anchors. */
function headingsOf(text) {
  const titles = [...text.replace(/^```[\s\S]*?^```/gm, '').matchAll(/^#{1,6} (.+)$/gm)].map((m) =>
    m[1].replace(/`/g, '').trim().toLowerCase()
  );
  const slugs = titles.map((title) => title.replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-'));
  return { titles, slugs };
}

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}
