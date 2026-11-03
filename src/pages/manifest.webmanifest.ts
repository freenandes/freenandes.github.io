import type { APIRoute } from 'astro';
import { site } from '../site.config';
import { withBase } from '../lib/base';
import { svgIcon, manifestIcons } from '../lib/icons.mjs';

/** Web app manifest. Generated so icon/start paths respect the configured base. */
export const GET: APIRoute = () => {
  const manifest = {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    lang: site.locale,
    start_url: withBase('/'),
    scope: withBase('/'),
    display: 'standalone',
    background_color: site.themeColor,
    theme_color: site.themeColor,
    icons: [
      { src: withBase(svgIcon), type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      ...manifestIcons.map(({ path, size, purpose }) => ({
        src: withBase(path),
        type: 'image/png',
        sizes: `${size}x${size}`,
        purpose,
      })),
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
