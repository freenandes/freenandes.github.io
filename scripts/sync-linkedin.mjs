#!/usr/bin/env node
/* =========================================================================
   sync-linkedin.mjs

   Turns a LinkedIn "Save to PDF" profile export into the structured data the
   About / CV page renders — so the About page stays in sync with LinkedIn
   with (almost) zero manual work.

   Workflow:
     1. On LinkedIn → your profile → "Resources" → "Save to PDF".
     2. Drop the file in  sources/linkedin-profile.pdf  (overwrite the old one).
     3. Run  `npm run sync:linkedin`. There is no CI sync: sources/ is
        git-ignored, so the PDF only exists on your machine.
        → writes  src/cv.data.json , which src/pages/about.astro renders.

   How it works:
     LinkedIn's PDF is a two-column layout. We read the PDF with pdf.js (via
     `unpdf`), keep each text fragment's x/y position, and rebuild the visual
     lines per column. The narrow left column is the sidebar (Top Skills,
     Languages, Certifications, Honors-Awards, Contact); the wide right column
     is the main flow (name, headline, Summary, Experience, Education).

     Bulleted achievements always start with "- ". A wrapped continuation of a
     bullet sits one line-height below it (~18pt here); a bold thematic
     sub-heading or a new paragraph sits ~2x line-heights below. That vertical
     gap is what lets us join wrapped lines and drop the thematic sub-headings
     cleanly, without a brittle keyword list.

   Usage:
     node scripts/sync-linkedin.mjs [input.pdf] [output.json]
   ========================================================================= */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocumentProxy } from 'unpdf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT = process.argv[2] || path.join(ROOT, 'sources', 'linkedin-profile.pdf');
const OUTPUT = process.argv[3] || path.join(ROOT, 'src', 'cv.data.json');

/** x below this (in PDF points) is the narrow sidebar column. */
const COLUMN_X = 150;
/** Lines whose vertical gap exceeds (lineUnit * this) start a new block. */
const GAP_FACTOR = 1.5;

/** Generic "employers" we don't want to list as clients/companies. */
const GENERIC_ORGS = /^(self[\s-]?employed|freelance|freelancer)$/i;

/* ------------------------------------------------------------------ */
/* PDF → positioned visual lines                                       */
/* ------------------------------------------------------------------ */

/** Group text items that share a baseline (y) into a single visual line. */
function buildRows(items) {
  const rows = [];
  for (const it of items) {
    if (!('str' in it) || it.str === '') continue;
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) <= 3);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(it);
  }
  return rows
    .sort((a, b) => b.y - a.y) // top of page first
    .map((r) => {
      r.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const text = r.items
        .map((z) => z.str)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      return { text, y: r.y, left: r.items[0].transform[4] };
    })
    .filter((r) => r.text);
}

/**
 * Returns { sidebar, main } where each is an array of
 * { text, page, gap } in reading order. `gap` is the vertical distance to the
 * previous line on the same page (null at a page top), used to tell wrapped
 * continuations from new paragraphs / sub-headings.
 */
async function extractColumns(file) {
  const buf = new Uint8Array(await readFile(file));
  const pdf = await getDocumentProxy(buf);

  const sidebar = [];
  const main = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();

    const sideItems = items.filter((it) => 'str' in it && it.transform[4] < COLUMN_X);
    const mainItems = items.filter((it) => 'str' in it && it.transform[4] >= COLUMN_X);

    addRows(sidebar, buildRows(sideItems), p);
    addRows(main, buildRows(mainItems), p);
  }

  // Drop the "Page N of M" footers from the main flow.
  const cleanMain = main.filter((l) => !/^Page \d+ of \d+$/i.test(l.text));
  return { sidebar, main: cleanMain };
}

function addRows(out, rows, page) {
  let prevY = null;
  for (const r of rows) {
    out.push({ text: r.text, page, gap: prevY == null ? null : prevY - r.y });
    prevY = r.y;
  }
}

/** Smallest recurring line gap in a slice — i.e. the single-line height. */
function lineUnit(lines) {
  const gaps = lines.map((l) => l.gap).filter((g) => g != null && g > 4);
  return gaps.length ? Math.min(...gaps) : 18;
}

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                     */
/* ------------------------------------------------------------------ */

const MONTHS =
  '(January|February|March|April|May|June|July|August|September|October|November|December)';
const DATE_RANGE = new RegExp(`^${MONTHS}\\s+\\d{4}\\s*[-\u2013]\\s*(Present|${MONTHS}\\s+\\d{4})\\s*\\(.+\\)$`);

const enDash = (s) => s.replace(/\s*[-\u2013]\s*/g, ' \u2014 ');

/** A location line looks like "City, Country" / "Remote" / "...Area". */
function isLocation(text) {
  if (!text) return false;
  if (text.startsWith('- ')) return false;
  return /,/.test(text) || /\b(Remote|Area|Region|Metropolitan)\b/i.test(text);
}

/**
 * Join wrapped lines into bullets, dropping bold thematic sub-headings.
 * `lines` is the body slice of one experience entry (already gap-annotated).
 */
function linesToPoints(lines) {
  const unit = lineUnit(lines);
  const threshold = unit * GAP_FACTOR;
  const points = [];
  let current = null;

  const flush = () => {
    if (current) points.push(current.replace(/\s+/g, ' ').trim());
    current = null;
  };

  for (const line of lines) {
    const t = line.text;
    if (t.startsWith('- ')) {
      flush();
      current = t.slice(2);
    } else if (current && line.gap != null && line.gap <= threshold) {
      // Tight gap under an open bullet → wrapped continuation.
      current += ' ' + t;
    } else {
      // No open bullet, or a big gap → thematic sub-heading / stray. Drop it.
      flush();
    }
  }
  flush();
  return points.filter(Boolean);
}

/** Split a prose block into paragraphs using the vertical gap. */
function linesToParagraphs(lines) {
  const unit = lineUnit(lines);
  const threshold = unit * GAP_FACTOR;
  const paras = [];
  let current = '';

  for (const line of lines) {
    if (current && line.gap != null && line.gap > threshold) {
      paras.push(current.trim());
      current = line.text;
    } else {
      current = current ? current + ' ' + line.text : line.text;
    }
  }
  if (current.trim()) paras.push(current.trim());
  return paras;
}

/* ------------------------------------------------------------------ */
/* Sidebar (left column)                                               */
/* ------------------------------------------------------------------ */

const SIDEBAR_HEADERS = new Set([
  'Contact',
  'Top Skills',
  'Skills',
  'Languages',
  'Certifications',
  'Licenses & Certifications',
  'Honors-Awards',
  'Honors & Awards',
  'Publications',
  'Patents',
  'Courses',
  'Projects',
  'Organizations',
  'Volunteering',
]);

function parseSidebar(lines) {
  const sections = {};
  let key = null;
  for (const { text } of lines) {
    if (SIDEBAR_HEADERS.has(text)) {
      key = text;
      sections[key] = [];
    } else if (key) {
      sections[key].push(text);
    }
  }
  return sections;
}

function parseContact(items = []) {
  const contact = {};
  for (const raw of items) {
    const t = raw.replace(/\s*\((LinkedIn|Personal|Mobile|Home|Work)\)\s*$/i, '').trim();
    // The email and phone are intentionally never stored: they would leak into
    // the repo, and no page renders them. The site carries the email as an
    // obfuscated token instead (src/lib/email.ts).
    if (/@/.test(t)) continue;
    if (/^\+?\d[\d\s()-]{6,}$/.test(t)) continue;
    if (/linkedin\.com/i.test(t)) contact.linkedin = t.startsWith('http') ? t : `https://${t}`;
    else if (/\.[a-z]{2,}($|\/)/i.test(t) && !/,/.test(t)) contact.website = t.startsWith('http') ? t : `https://${t}`;
    else if (/,/.test(t) && !contact.location) contact.location = t;
  }
  return contact;
}

/* ------------------------------------------------------------------ */
/* Main column (right)                                                 */
/* ------------------------------------------------------------------ */

function indexOfText(lines, text) {
  return lines.findIndex((l) => l.text === text);
}

function parseExperience(lines) {
  const jobs = [];
  // Indices of every "Mon YYYY - ... (duration)" date line.
  const dateIdx = [];
  lines.forEach((l, i) => {
    if (DATE_RANGE.test(l.text)) dateIdx.push(i);
  });

  for (let d = 0; d < dateIdx.length; d++) {
    const i = dateIdx[d];
    const org = lines[i - 2]?.text?.trim();
    const role = lines[i - 1]?.text?.trim();
    if (!org || !role) continue;

    const period = enDash(lines[i].text.replace(/\s*\(.*\)\s*$/, '').trim());

    let bodyStart = i + 1;
    let location;
    if (lines[i + 1] && isLocation(lines[i + 1].text)) {
      location = lines[i + 1].text.trim();
      bodyStart = i + 2;
    }

    // Body runs until the org line of the next experience (2 lines before its
    // date), or to the end of the section.
    const bodyEnd = d + 1 < dateIdx.length ? dateIdx[d + 1] - 2 : lines.length;
    const points = linesToPoints(lines.slice(bodyStart, bodyEnd));

    jobs.push({ role, org, period, ...(location ? { location } : {}), points });
  }
  return jobs;
}

function parseEducation(lines) {
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text;
    // Degree line, e.g. "Master's Degree, Industrial Design · (2002 - 2007)".
    const m = t.match(/^(.*?)\s*[·•]\s*\(([^)]*)\)\s*$/);
    if (!m) continue;
    const org = lines[i - 1]?.text?.trim();
    if (!org) continue;
    entries.push({
      title: m[1].trim(),
      org,
      period: enDash(m[2].trim()),
    });
  }
  return entries;
}

/* ------------------------------------------------------------------ */
/* Build the CV data object                                            */
/* ------------------------------------------------------------------ */

function buildCV({ sidebar, main }) {
  const side = parseSidebar(sidebar);

  // --- header block: name / headline / location / summary ---
  const sIdx = indexOfText(main, 'Summary');
  const eIdx = indexOfText(main, 'Experience');
  const eduIdx = indexOfText(main, 'Education');

  const name = main[0]?.text?.trim() ?? '';

  const headlineEnd = sIdx > 0 ? sIdx : main.length;
  // Last line before "Summary" is the location; the rest (after the name) is
  // the headline.
  let location = '';
  let headlineLines = main.slice(1, headlineEnd);
  if (headlineLines.length && isLocation(headlineLines[headlineLines.length - 1].text)) {
    location = headlineLines[headlineLines.length - 1].text.trim();
    headlineLines = headlineLines.slice(0, -1);
  }
  const headline = headlineLines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();

  const summaryLines = sIdx >= 0 ? main.slice(sIdx + 1, eIdx > sIdx ? eIdx : undefined) : [];
  const summary = linesToParagraphs(summaryLines).join('\n\n');

  const expEnd = eduIdx > eIdx ? eduIdx : main.length;
  const experience = eIdx >= 0 ? parseExperience(main.slice(eIdx + 1, expEnd)) : [];

  const education = eduIdx >= 0 ? parseEducation(main.slice(eduIdx + 1)) : [];

  // --- skills / capabilities from the sidebar ---
  const skills = [];
  const addGroup = (label, items) => {
    if (items && items.length) skills.push({ label, items });
  };
  addGroup('Top Skills', side['Top Skills'] || side['Skills']);
  addGroup('Languages', side['Languages']);
  addGroup('Certifications', side['Certifications'] || side['Licenses & Certifications']);

  // --- recognition from Honors-Awards ---
  const honors = side['Honors-Awards'] || side['Honors & Awards'] || [];
  const recognition = honors.map((title) => ({ title }));

  // --- "selected companies" derived from experience orgs ---
  const seen = new Set();
  const selectedClients = [];
  for (const job of experience) {
    const org = job.org;
    if (GENERIC_ORGS.test(org)) continue;
    const k = org.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    selectedClients.push(org);
  }

  const contact = parseContact(side['Contact']);

  return {
    name,
    headline,
    location: location || contact.location || '',
    summary,
    experience,
    education,
    skills,
    selectedClients,
    recognition,
    contact,
    _meta: {
      source: 'linkedin-pdf',
      generatedBy: 'scripts/sync-linkedin.mjs',
    },
  };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(INPUT)) {
    console.error(`[sync-linkedin] ✗ PDF not found: ${path.relative(ROOT, INPUT)}`);
    console.error('  Export your profile on LinkedIn (More → Save to PDF) and');
    console.error('  save it there, then run this again.');
    process.exit(1);
  }

  console.log(`[sync-linkedin] Reading ${path.relative(ROOT, INPUT)} …`);
  const columns = await extractColumns(INPUT);
  const cv = buildCV(columns);

  if (!cv.name || cv.experience.length === 0) {
    console.error('[sync-linkedin] ✗ Parsed no name/experience — is this a LinkedIn "Save to PDF" export?');
    process.exit(1);
  }

  await writeFile(OUTPUT, JSON.stringify(cv, null, 2) + '\n', 'utf8');

  console.log(`[sync-linkedin] ✓ Wrote ${path.relative(ROOT, OUTPUT)}`);
  console.log(
    `  name: ${cv.name}\n  experience: ${cv.experience.length} roles` +
      `\n  education: ${cv.education.length}\n  skill groups: ${cv.skills.length}` +
      `\n  recognition: ${cv.recognition.length}\n  companies: ${cv.selectedClients.length}`
  );
}

main().catch((err) => {
  console.error('[sync-linkedin] Failed:', err);
  process.exit(1);
});
