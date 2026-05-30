// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Deployment URL + sub-path. Defaults target GitHub Pages for the
// `freenandes/portfolio` repo (https://freenandes.github.io/portfolio/).
//
// Overrides (set as env vars in CI or your shell):
//   SITE       — origin only, no trailing slash, e.g. https://freenandes.github.io
//   BASE_PATH  — sub-path the site is served from, e.g. /portfolio
//
// For a user/org page (repo named <user>.github.io) or a custom domain, set
// BASE_PATH=/ (and SITE to your domain).
const SITE = process.env.SITE ?? 'https://freenandes.github.io';
const BASE_PATH = process.env.BASE_PATH ?? '/portfolio';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE_PATH,
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
    },
  },
});
