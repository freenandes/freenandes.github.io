/* =========================================================================
   Base-path helper.
   When the site is served from a sub-path (e.g. GitHub Pages project sites at
   /<repo>/), every internal URL must be prefixed with that base. Astro exposes
   the configured base via `import.meta.env.BASE_URL` (works in .astro files and
   client-side scripts alike), so this helper joins it to any app-absolute path.
   ========================================================================= */

const RAW_BASE = import.meta.env.BASE_URL;
// Normalise to no trailing slash so joins are predictable ('' when base is '/').
const BASE = RAW_BASE.replace(/\/+$/, '');

/** Prefix an app-absolute path (e.g. "/about") with the configured base. */
export function withBase(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}` || '/';
}

/** Strip a trailing slash for comparisons; keep root as "/". */
export function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}
