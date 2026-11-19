#!/usr/bin/env node
/* =========================================================================
   check-site.mjs

   Checks the built site in dist/ for mistakes that build without an error:

     npm run build && npm run check:site

   - Links: every address inside the site (href, src, srcset, a redirect, a
     CSS url(), or a full https://www.pmcf.xyz/… address in a page, the
     sitemap, /llms.txt or the manifest) names a file in dist/, and its
     #fragment names an id on that page. Links to other sites aren't fetched.
   - CSP: every page carries the policy from Base.astro, no script runs
     inline (JSON-LD is data, so it may), no element has an on…= handler or a
     javascript: link, a style attribute sets only custom properties, and
     each script, stylesheet, image and font comes from a source its page's
     policy allows. The browser would block anything else.
   - The UX audit stays apart: no portfolio page, nor /llms.txt, links to
     /services/ or says "UX audit", outside the places in ALLOWED below.

   Exit code is 1 when a check fails, 2 when there's no dist/ to check.
   ========================================================================= */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import astroConfig from '../astro.config.mjs';

/* Knobs ------------------------------------------------------------------- */

/** Where a portfolio page may point to the UX audit: a page in dist/ and the
    element, by its opening tag, whose contents may. About's footer link is
    the one AGENTS.md allows; the 404 page's is shown only to an address that
    was meant for the UX audit. */
const ALLOWED = {
  'about/index.html': '<footer',
  '404.html': '<section data-for="ux-audit"',
};

/** Pages of the UX audit itself, which may link anywhere. */
const SERVICES = 'services/';

/** Which policy directive a tag's address is checked against. */
const FETCHES = { script: 'script-src', img: 'img-src', source: 'img-src', iframe: 'frame-src' };
const LINKS = { stylesheet: 'style-src', icon: 'img-src', 'apple-touch-icon': 'img-src', manifest: 'manifest-src' };

/* ------------------------------------------------------------------------- */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
const BASE = (astroConfig.base ?? '/').replace(/\/?$/, '/');
const ORIGIN = new URL(astroConfig.site).origin;

if (!existsSync(DIST)) {
  console.error('check-site: no dist/ to check. Run `npm run build` first.');
  process.exit(2);
}

const files = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => path.relative(DIST, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
const fileSet = new Set(files);
const idCache = new Map();

const problems = [];
let checked = 0;
const fail = (file, message) => problems.push(`${file}: ${message}`);

for (const file of files) {
  const ext = path.extname(file);
  if (ext === '.html') checkPage(file);
  else if (ext === '.css') checkUrls(file, [...read(file).matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1]));
  else if (['.txt', '.xml', '.webmanifest'].includes(ext)) checkText(file);
}

if (problems.length) {
  console.error(`check-site: ${problems.length} problem(s) in dist/:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-site: ${checked} links and rules in ${files.length} files all pass.`);

/* ------------------------------------------------------------------------- */

function checkPage(file) {
  const html = read(file);
  // Script and style bodies, and comments, aren't markup; keep the tags.
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<(script|style)\b[^>]*>)[\s\S]*?(<\/\2>)/gi, '$1$3');
  const tags = [...markup.matchAll(/<([a-zA-Z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g)].map(
    (m) => ({ name: m[1].toLowerCase(), attrs: attributes(m[2]) })
  );
  const refresh = tags.find((t) => t.name === 'meta' && t.attrs['http-equiv']?.toLowerCase() === 'refresh');
  const policy = tags.find((t) => t.name === 'meta' && t.attrs['http-equiv']?.toLowerCase() === 'content-security-policy');

  // Links.
  const refs = [];
  for (const { name, attrs } of tags) {
    for (const key of ['href', 'src', 'xlink:href', 'poster', 'action']) if (attrs[key]) refs.push(attrs[key]);
    for (const key of ['srcset', 'imagesrcset']) if (attrs[key]) refs.push(...srcset(attrs[key]));
    if (name === 'meta' && attrs.content?.startsWith(ORIGIN)) refs.push(attrs.content);
    for (const m of (attrs.style ?? '').matchAll(/url\(\s*['"]?([^'")]+)/g)) refs.push(m[1]);
  }
  // <style> blocks: the fonts' @font-face rules are written into the page.
  for (const block of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const m of block[1].matchAll(/url\(\s*['"]?([^'")]+)/g)) refs.push(m[1]);
  }
  if (refresh) refs.push(refresh.attrs.content.replace(/^[^;]*;\s*url=/i, ''));
  refs.push(...absolute(html)); // JSON-LD and anything else naming the site
  checkUrls(file, refs);

  // CSP.
  checked++;
  if (!policy) {
    if (!refresh || /<script\b/i.test(html)) fail(file, 'no Content-Security-Policy <meta> (does it render into Base.astro?)');
  } else {
    const directives = parsePolicy(policy.attrs.content);
    const allows = (directive, ref) => matches(directives.get(directive) ?? directives.get('default-src') ?? [], ref, file);
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = attributes(m[1]);
      checked++;
      if (attrs.src && m[2].trim()) fail(file, `a <script src="${attrs.src}"> also holds code, which never runs`);
      else if (!attrs.src && !/^application\/(ld\+)?json$/i.test(attrs.type ?? '')) {
        fail(file, `inline <script>, which the CSP blocks: ${m[2].trim().slice(0, 60)}…`);
      }
    }
    for (const { name, attrs } of tags) {
      const directive = name === 'link' ? linkDirective(attrs) : FETCHES[name];
      if (!directive) continue;
      const sources = name === 'link' ? [attrs.href] : [attrs.src, ...(attrs.srcset ? srcset(attrs.srcset) : [])];
      for (const ref of sources.filter(Boolean)) {
        checked++;
        if (!allows(directive, ref)) fail(file, `<${name}> loads ${ref}, which ${directive} doesn't allow`);
      }
    }
  }
  for (const { name, attrs } of tags) {
    for (const [key, value] of Object.entries(attrs)) {
      checked++;
      if (/^on[a-z]+$/.test(key)) fail(file, `<${name} ${key}="…">: the CSP blocks inline handlers`);
      if (/^\s*javascript:/i.test(value)) fail(file, `<${name} ${key}="${value}">: the CSP blocks javascript: links`);
    }
    if (attrs.style !== undefined) {
      checked++;
      const declarations = attrs.style.split(';').map((d) => d.trim()).filter(Boolean);
      if (declarations.some((d) => !/^--[\w-]+\s*:/.test(d))) {
        fail(file, `style="${attrs.style}" sets more than custom properties`);
      }
    }
  }

  // The UX audit stays apart.
  if (!file.startsWith(SERVICES) && !refresh) {
    let text = html;
    if (ALLOWED[file]) {
      const start = text.indexOf(ALLOWED[file]);
      const tag = ALLOWED[file].slice(1).split(/\s/)[0];
      if (start === -1) fail(file, `no ${ALLOWED[file]}…> here any more: update ALLOWED in scripts/check-site.mjs`);
      else text = text.slice(0, start) + text.slice(closing(text, start, tag));
    }
    checkApart(file, text);
  }
}

function checkText(file) {
  const text = read(file);
  const refs = absolute(text);
  if (file.endsWith('.webmanifest')) {
    for (const m of text.matchAll(/"(?:src|start_url|scope)"\s*:\s*"([^"]+)"/g)) refs.push(m[1]);
  }
  checkUrls(file, refs);
  if (file === 'llms.txt') checkApart(file, text);
}

/** Each address inside the site names a file, and its #fragment an id. */
function checkUrls(file, refs) {
  const here = new URL(BASE + file, ORIGIN);
  for (const ref of new Set(refs)) {
    let url;
    try {
      url = new URL(ref.trim(), here);
    } catch {
      fail(file, `can't read the address ${ref}`);
      continue;
    }
    if (url.origin !== ORIGIN) continue;
    checked++;
    const target = resolve(url.pathname);
    if (!target) fail(file, `${ref} isn't in dist/`);
    else if (url.hash.length > 1 && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!ids(target).has(id)) fail(file, `${ref}: no id="${id}" in ${target}`);
    }
  }
}

function checkApart(file, text) {
  checked++;
  const link = text.match(new RegExp(`(?:${escape(ORIGIN)})?${escape(BASE)}services\\b[^"'\\s<)]*`));
  if (link) fail(file, `points to ${link[0]}; only the places in ALLOWED in scripts/check-site.mjs may`);
  const words = text.replace(/<[^>]*>/g, ' ').match(/.{0,30}\bUX[ -]?audit\b.{0,30}/i);
  if (words) fail(file, `mentions the UX audit ("${words[0].trim()}"); only the places in ALLOWED may`);
}

/** A path in the site, as the file GitHub Pages would serve for it. */
function resolve(pathname) {
  if (!pathname.startsWith(BASE)) return null;
  const rel = decodeURIComponent(pathname.slice(BASE.length));
  const candidates = rel === '' || rel.endsWith('/') ? [`${rel}index.html`] : [rel, `${rel}/index.html`, `${rel}.html`];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

function ids(file) {
  if (!idCache.has(file)) {
    idCache.set(file, new Set([...read(file).matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => decode(m[1]))));
  }
  return idCache.get(file);
}

function parsePolicy(content) {
  return new Map(
    content
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...sources]) => [name.toLowerCase(), sources])
  );
}

/** Whether a CSP source list allows an address, for the sources this site
    uses: 'self', a scheme such as data:, a host, or *. */
function matches(sources, ref, file) {
  const url = new URL(ref, new URL(BASE + file, ORIGIN));
  return sources.some((source) => {
    if (source === '*') return url.protocol !== 'data:';
    if (source === "'self'") return url.origin === ORIGIN;
    if (/^[a-z][\w+.-]*:$/.test(source)) return url.protocol === source;
    if (source.startsWith("'")) return false;
    const allowed = new URL(source.includes('://') ? source : `https://${source}`);
    return url.origin === allowed.origin && url.pathname.startsWith(allowed.pathname);
  });
}

function linkDirective(attrs) {
  const rels = (attrs.rel ?? '').toLowerCase().split(/\s+/);
  if (rels.includes('preload') || rels.includes('modulepreload')) {
    return rels.includes('modulepreload') || attrs.as === 'script' ? 'script-src' : attrs.as && `${attrs.as}-src`;
  }
  return rels.map((rel) => LINKS[rel]).find(Boolean);
}

/** The attributes in a tag's source, by lower-case name, values decoded. */
function attributes(source) {
  const attrs = {};
  for (const m of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

function srcset(value) {
  return value.split(/,\s+/).map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean);
}

/** Full addresses on this site, wherever they're written, without their
    #fragment: JSON-LD's `@id`s look like anchors but name things, not ids. */
function absolute(text) {
  return [...decode(text).matchAll(new RegExp(`${escape(ORIGIN)}[^\\s"'<>)\\]\\\\#]*`, 'g'))].map((m) =>
    m[0].replace(/[.,;:]+$/, '')
  );
}

/** Where the element opened at `start` closes, counting nested ones. */
function closing(text, start, tag) {
  const pattern = new RegExp(`<(/?)${tag}\\b`, 'g');
  pattern.lastIndex = start + 1;
  let depth = 1;
  for (const m of text.matchAll(pattern)) {
    if (m.index <= start) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return text.indexOf('>', m.index) + 1;
  }
  return text.length;
}

function decode(value) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function read(file) {
  return readFileSync(path.join(DIST, file), 'utf8');
}
