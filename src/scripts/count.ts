/** Counts a visit with GoatCounter, in place of its count.js, so the browser
    sends as little as possible: the page's canonical path, its title, and the
    site a visitor came from (scheme and host only, and only from another site).
    No query string, screen size or bot score, and nothing stored in the
    browser. It counts nothing away from the live site, from a browser that
    reports being automated, inside a frame, or when the visitor asks not to be
    tracked (Global Privacy Control or Do Not Track). The parameters are the
    ones GoatCounter's tracking-pixel docs list for the `/count` endpoint. */

const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null };

function count(endpoint: string) {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const params = new URLSearchParams({
    p: canonical ? new URL(canonical.href).pathname : location.pathname,
    t: document.title,
  });
  if (document.referrer) {
    const from = new URL(document.referrer);
    if (from.host && from.host !== location.host) params.set('r', `${from.protocol}//${from.host}`);
  }
  navigator.sendBeacon(`${endpoint}?${params}`);
}

const endpoint = document.body.dataset.goatcounter;
const live = import.meta.env.SITE && location.origin === new URL(import.meta.env.SITE).origin;
const optedOut = nav.globalPrivacyControl === true || nav.doNotTrack === '1';

if (endpoint && live && !optedOut && !navigator.webdriver && window.top === window.self) {
  // A tab opened in the background counts once it's first looked at.
  if (document.visibilityState === 'visible') count(endpoint);
  else
    document.addEventListener('visibilitychange', function onShow() {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onShow);
      count(endpoint);
    });
}
