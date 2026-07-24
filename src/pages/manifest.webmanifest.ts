import type { APIRoute } from 'astro';
import { site } from '../site.config';
import { withBase } from '../lib/base';

/** Web app manifest. Generated so icon/start paths respect the configured base. */
export const GET: APIRoute = () => {
  const manifest = {
    name: site.name,
    short_name: 'PMCF',
    description: site.description,
    lang: site.locale,
    start_url: withBase('/'),
    scope: withBase('/'),
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: withBase('/favicon.svg'),
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
