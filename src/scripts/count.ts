/** Counts visits and a few clicks with GoatCounter: no cookie, no IP address
    kept, and nothing stored in a reader's browser. Deploy builds name the
    endpoint in `data-counter` on <html> (see `visitCounter` in
    `src/site.config.ts`); without it every call here does nothing, so local
    builds never count. Without scripting, Base's <noscript> image counts the
    page alone. Nothing here adds to the page: hits go out as beacons, or as
    images that are never put in the document. */

const endpoint = document.documentElement.dataset.counter;

/** Opening any page with this hash stops counting in that browser, the owner's
 *  own visits; `#count-me` undoes it. A per-browser switch, because IP
 *  addresses change and GoatCounter's IP filter can't follow them. */
const OPT_OUT = 'dont-count-me';

/** Sets or clears the opt-out if the address asks to. It's the one thing the
 *  site ever stores, and only in a browser that asked. */
function applySwitch() {
  const ask = location.hash;
  if (ask !== `#${OPT_OUT}` && ask !== '#count-me') return;
  try {
    if (ask === '#count-me') localStorage.removeItem(OPT_OUT);
    else localStorage.setItem(OPT_OUT, 'true');
  } catch {
    alert('This browser blocks site storage, so it can’t remember not to count you.');
    return;
  }
  // Drop the hash, so the address can be shared or bookmarked as is.
  history.replaceState(null, '', location.pathname + location.search);
  alert(
    ask === '#count-me'
      ? 'Visits from this browser are counted again.'
      : 'Visits from this browser are no longer counted. Open any page with #count-me to undo.'
  );
}

function optedOut() {
  try {
    return localStorage.getItem(OPT_OUT) === 'true';
  } catch {
    return false;
  }
}

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
  if (!endpoint || optedOut()) return;
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  // GoatCounter drops hits from headless browsers flagged this way.
  if (navigator.webdriver) url.searchParams.set('b', '153');
  // Some browsers cache a repeated image URL despite its headers. The clock,
  // not Math.random, so the map's random layout draws the same numbers whether
  // or not the counter is on (`npm run visual` seeds them).
  url.searchParams.set('rnd', Date.now().toString(36));
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
  // On load, and when the hash is typed onto the page already open, which
  // changes the address without loading the page again.
  applySwitch();
  window.addEventListener('hashchange', applySwitch);

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
