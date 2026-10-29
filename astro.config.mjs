// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Where the site is served. This is the only place it's set: CI and
// `npm run visual` read it from here, and SITE / BASE_PATH env vars override it
// for a one-off build. It sits under /portfolio while in development; launching
// at www.pmcf.xyz/ means changing the BASE_PATH default to '/'.
const SITE = process.env.SITE ?? 'https://www.pmcf.xyz';
const BASE_PATH = process.env.BASE_PATH ?? '/portfolio';

export default defineConfig({
  site: SITE,
  base: BASE_PATH,
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
      wrap: true,
    },
  },
  vite: {
    build: {
      // Astro inlines small bundled scripts by default, which the strict
      // `script-src 'self'` CSP in Base.astro then blocks. Keep every bundled
      // script as its own file; other assets keep Vite's default inlining.
      assetsInlineLimit: (filePath) => (filePath.endsWith('.js') ? false : undefined),
    },
  },
});
