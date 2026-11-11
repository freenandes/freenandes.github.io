/* =========================================================================
   static-server.mjs

   Serves a built `dist` under the site's base path, the way GitHub Pages does.
   `astro preview` would do this too, but two builds need serving at once and a
   plain file server keeps the two sides of a comparison identical.

   `npm run browsers` serves it over HTTPS: the production CSP's
   upgrade-insecure-requests makes WebKit fetch every asset of an http page
   over https, even from 127.0.0.1, where Chrome and Firefox make an exception.
   ========================================================================= */

import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
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
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
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
 * @param {{ key: Buffer, cert: Buffer }} [tls]  serve over HTTPS with this key and certificate
 * @returns {Promise<{ origin: string, base: string, close: () => Promise<void> }>}
 */
export function serveDist(root, base, tls) {
  // "" when the site is at the root, so `${base}${path}` never doubles a slash.
  const trimmed = base.replace(/^\/+|\/+$/g, '');
  const prefix = trimmed ? `/${trimmed}` : '';
  const handler = async (req, res) => {
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
  };
  const server = tls ? createHttpsServer(tls, handler) : createHttpServer(handler);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
      resolve({
        origin: `${tls ? 'https' : 'http'}://127.0.0.1:${port}`,
        base: prefix,
        close: () => new Promise((done) => server.close(() => done(undefined))),
      });
    });
  });
}
