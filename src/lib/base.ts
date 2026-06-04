const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Prefix an app-absolute path (e.g. "/about") with the configured base. */
export function withBase(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}` || '/';
}
