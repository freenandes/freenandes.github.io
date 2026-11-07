// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Where the site is served. This is the only place it's set: CI and
// `npm run visual` read it from here, and SITE / BASE_PATH env vars override it
// for a one-off build.
const SITE = process.env.SITE ?? 'https://www.pmcf.xyz';
const BASE_PATH = process.env.BASE_PATH ?? '/';

// Case studies moved from /projects/<old slug>/ (and, before that,
// /portfolio/projects/<old slug>/) to /<slug>/. Old slug → current file name.
// A renamed project file adds its old name here.
const MOVED_PROJECTS = {
  'percona-case-1': 'peak-systems-at-percona',
  'percona-case-2': 'reading-the-terrain-at-percona',
  'tui-case': '100000-pages-high-at-tui-group',
};

export default defineConfig({
  site: SITE,
  base: BASE_PATH,
  // The fonts, self-hosted from src/assets/fonts/: one variable file per
  // style, each holding the Latin set Google Fonts serves (every character the
  // site uses). Astro serves them from the site, writes the @font-face rules
  // and a fallback sized to match, so text barely moves when the font arrives.
  // Base.astro puts each family on the page with <Font>, and tokens.css reads
  // the CSS variable it sets.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--font-next',
      fallbacks: ['roboto', 'arial', 'Helvetica Neue', 'helvetica', 'sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/atkinson-hyperlegible-next.woff2'], weight: '200 800', style: 'normal' },
          { src: ['./src/assets/fonts/atkinson-hyperlegible-next-italic.woff2'], weight: '200 800', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Mono',
      cssVariable: '--font-mono-face',
      fallbacks: ['menlo', 'Roboto Mono', 'monaco', 'monospace'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/atkinson-hyperlegible-mono.woff2'], weight: '200 800', style: 'normal' },
          { src: ['./src/assets/fonts/atkinson-hyperlegible-mono-italic.woff2'], weight: '200 800', style: 'italic' },
        ],
      },
    },
  ],
  // The site was served from www.pmcf.xyz/portfolio/ before it moved to the
  // root, and links to those addresses were shared. GitHub Pages can't send
  // server redirects, so each old address gets a page that forwards to the new
  // one (an instant meta refresh plus a canonical link; no script, so the CSP
  // is unaffected). The same goes for the case studies' old addresses.
  redirects: {
    '/portfolio': '/',
    '/portfolio/about': '/about',
    ...Object.fromEntries(
      Object.entries(MOVED_PROJECTS).flatMap(([old, slug]) => [
        [`/projects/${old}`, `/${slug}/`],
        [`/portfolio/projects/${old}`, `/${slug}/`],
      ])
    ),
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
