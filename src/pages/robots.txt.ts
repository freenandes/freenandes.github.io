import type { APIRoute } from 'astro';
import { withBase } from '../lib/base';

/**
 * robots.txt. NOTE: crawlers only honour robots.txt at the *domain root*, so
 * this file only counts while the base path is `/` (see astro.config.mjs).
 */
export const GET: APIRoute = ({ site: astroSite }) => {
  const sitemapPath = withBase('/sitemap-index.xml');
  const sitemap = astroSite ? new URL(sitemapPath, astroSite).toString() : sitemapPath;

  // Named AI crawlers are allowed: a portfolio benefits from being legible to
  // LLMs and AI search. Flip any of these to `Disallow: /` to opt out.
  const aiAgents = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
  ];

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    ...aiAgents.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
