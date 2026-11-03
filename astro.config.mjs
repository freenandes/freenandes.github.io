// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Where the site is served. This is the only place it's set: CI and
// `npm run visual` read it from here, and SITE / BASE_PATH env vars override it
// for a one-off build.
const SITE = process.env.SITE ?? 'https://www.pmcf.xyz';
const BASE_PATH = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE_PATH,
  // The site was served from www.pmcf.xyz/portfolio/ before it moved to the
  // root, and links to those addresses were shared. GitHub Pages can't send
  // server redirects, so each old address gets a page that forwards to the new
  // one (an instant meta refresh plus a canonical link; no script, so the CSP
  // is unaffected). The case-study line covers every project, new ones too.
  redirects: {
    '/portfolio': '/',
    '/portfolio/about': '/about',
    '/portfolio/projects/[...slug]': '/projects/[...slug]',
  },
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
