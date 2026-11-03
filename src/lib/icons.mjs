/** The site's icons — the only list of them.
 *
 * `public/favicon.svg` is drawn by hand; `npm run icons` (`scripts/icons.mjs`)
 * rasterises every other file here from it. The <head> in `Base.astro` and the
 * manifest read the same list, so a file name lives in one place. It is plain
 * JavaScript so the Node script can import it without a TypeScript runtime.
 *
 * Paths are under /public, before `withBase()`.
 */

/** The source: a 512×512 SVG, also served to every browser that reads SVG icons. */
export const svgIcon = '/favicon.svg';

/** Legacy fallback for browsers and tools that ask for `/favicon.ico`. */
export const icoIcon = { path: '/favicon.ico', sizes: [16, 32, 48] };

/** iOS and iPadOS home screen. Opaque: iOS paints transparent pixels black. */
export const appleTouchIcon = { path: '/apple-touch-icon.png', size: 180 };

/**
 * Manifest icons for installing the site (Android, Chrome, Edge, Windows).
 * `maskable` fills its square edge to edge and keeps the drawing inside the
 * centre circle that launchers may crop to.
 * @type {{ path: string; size: number; purpose: 'any' | 'maskable' }[]}
 */
export const manifestIcons = [
  { path: '/icon-192.png', size: 192, purpose: 'any' },
  { path: '/icon-512.png', size: 512, purpose: 'any' },
  { path: '/icon-maskable-512.png', size: 512, purpose: 'maskable' },
];
