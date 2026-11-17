/** Counts visits and a few clicks with GoatCounter: no cookie, nothing stored
    in the browser, no IP address kept. Deploy builds name the endpoint in
    `data-counter` on <html> (see `visitCounter` in `src/site.config.ts`);
    without it every call here does nothing, so local builds never count.
    Without scripting, Base's <noscript> image counts the page alone. */

const endpoint = document.documentElement.dataset.counter;

/** Query keys GoatCounter reads as a campaign (`?ref=cv-pdf`). Nothing else in
 *  the address is sent. */
const CAMPAIGN_KEYS = ['ref', 'utm_source', 'utm_campaign'];

/** The page's address as GoatCounter files it: the canonical path, as the
 *  noscript image sends it, or, on a page without one (the 404), the address
 *  the reader asked for, so a broken link shows up by name. */
function pagePath() {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return canonical ? new URL(canonical.href).pathname : location.pathname;
}

function send(params: Record<string, string>) {
  if (!endpoint) return;
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  // GoatCounter drops hits from headless browsers flagged this way.
  if (navigator.webdriver) url.searchParams.set('b', '153');
  // Some browsers cache a repeated image URL despite its headers.
  url.searchParams.set('rnd', Math.random().toString(36).slice(2, 7));
  // A beacon survives the page unloading, which an outbound click starts; the
  // image is the fallback where beacons are missing or refused.
  if (!navigator.sendBeacon?.(url.href)) new Image().src = url.href;
}

/** Records an event, listed beside the pages under its name. */
export function countEvent(name: string, title: string) {
  send({ e: 'true', p: name, t: title });
}

function countVisit() {
  // Only the referring site, never the page on it: `linkedin.com`, not a post.
  let referrer = '';
  try {
    const from = new URL(document.referrer);
    if (from.origin !== location.origin) referrer = from.origin;
  } catch {
    // No referrer, or not a URL: leave it out.
  }
  const query = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(location.search)) {
    if (CAMPAIGN_KEYS.includes(key)) query.set(key, value);
  }
  send({
    p: pagePath(),
    t: document.title,
    r: referrer,
    q: query.toString() ? `?${query}` : '',
    // Width only, so the dashboard can tell phones from desktops.
    s: String(screen.width),
  });
}

/** Contact and outbound links, from any page (the footer, About, the map's
 *  contact card). Middle clicks open tabs too, hence `auxclick`. */
function countLink(ev: MouseEvent) {
  // `auxclick` also fires for the right button, which opens a menu, not a page.
  if (ev.type === 'auxclick' && ev.button !== 1) return;
  const link = (ev.target as Element | null)?.closest?.('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return;
  const label = link.textContent?.trim() ?? '';
  if (link.protocol === 'mailto:') return countEvent('email', label || 'Email');
  if (!link.protocol.startsWith('http') || link.origin === location.origin) return;
  const host = link.hostname.replace(/^www\./, '');
  countEvent(`out/${host}`, label || host);
}

if (endpoint) {
  // A page opened in a background tab, or prerendered, counts once it's seen.
  if (document.visibilityState === 'visible') countVisit();
  else {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onVisible);
      countVisit();
    };
    document.addEventListener('visibilitychange', onVisible);
  }

  document.addEventListener('click', countLink);
  document.addEventListener('auxclick', countLink);

  // The print button and Cmd+P both go through `beforeprint`. The title is
  // read now, before `site.ts` swaps in the PDF's file name.
  const title = document.title;
  window.addEventListener('beforeprint', () => countEvent(`print${pagePath()}`, title));
}
