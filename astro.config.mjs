// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// SITE and BASE_PATH env vars override GitHub Pages defaults.
const SITE = process.env.SITE ?? 'https://freenandes.github.io';
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
