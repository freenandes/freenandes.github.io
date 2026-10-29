/* =========================================================================
   static-server.mjs

   Serves a built `dist` under the site's base path, the way GitHub Pages does.
   `astro preview` would do this too, but two builds need serving at once and a
   plain file server keeps the two sides of a comparison identical.
   ========================================================================= */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function resolveFile(root, urlPath) {
  const clean = urlPath.split('?')[0].split('#')[0];
  const unsafe = decodeURIComponent(clean).replace(/^\/+/, '');
  const target = path.resolve(root, unsafe);
  if (!target.startsWith(path.resolve(root))) return null;
  const candidates = target.endsWith('/') || unsafe === ''
    ? [path.join(target, 'index.html')]
    : [target, path.join(target, 'index.html'), `${target}.html`];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* try the next shape */
    }
  }
  return null;
}

/**
 * @param {string} root  a built dist directory
 * @param {string} base  base path the site is mounted at, e.g. "/portfolio", or "/"
 * @returns {Promise<{ origin: string, base: string, close: () => Promise<void> }>}
 */
export function serveDist(root, base) {
  // "" when the site is at the root, so `${base}${path}` never doubles a slash.
  const trimmed = base.replace(/^\/+|\/+$/g, '');
  const prefix = trimmed ? `/${trimmed}` : '';
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/';
    const within = !prefix
      ? url
      : url === prefix
        ? '/'
        : url.startsWith(`${prefix}/`)
          ? url.slice(prefix.length)
          : null;
    if (within === null) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('outside the base path');
      return;
    }
    const file = await resolveFile(root, within);
    if (!file) {
      const notFound = await resolveFile(root, '/404.html');
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      if (notFound) createReadStream(notFound).pipe(res);
      else res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
      resolve({
        origin: `http://127.0.0.1:${port}`,
        base: prefix,
        close: () => new Promise((done) => server.close(() => done(undefined))),
      });
    });
  });
}
