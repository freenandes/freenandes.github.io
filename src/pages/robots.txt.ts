import type { APIRoute } from 'astro';
import { withBase } from '../lib/base';

/**
 * robots.txt: every crawler may read everything, and the sitemap is here.
 * Crawlers only read it at the domain root, so it only counts while the base
 * path is `/` (see astro.config.mjs).
 */
export const GET: APIRoute = ({ site: astroSite }) => {
  const sitemapPath = withBase('/sitemap-index.xml');
  const sitemap = astroSite ? new URL(sitemapPath, astroSite).toString() : sitemapPath;
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
