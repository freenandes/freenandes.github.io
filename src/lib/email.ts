/** Keep the address out of the HTML the server ships — and out of this repo.
 *
 * Spam harvesters read static markup (and the plain-text /llms.txt), and they
 * scrape public repositories; none of that runs the page's JavaScript. So the
 * address is never written anywhere as `x@y.z` or a `mailto:` href. It lives as
 * an opaque hex token (no `@`, no dots) in `site.config.ts`, and the browser
 * turns it back into a real address at runtime with `decodeEmail` (wired up in
 * `src/scripts/site.ts`).
 *
 * The trade-off is that the mail link needs JavaScript to work; that is the
 * point. With scripting off the email entry hides itself rather than sit there
 * as a dead link or a blank printed line (the `[data-email]` noscript rule in
 * `src/layouts/Base.astro`) — the other contact links work without JS.
 *
 * Generating that token (the reverse of this) is a build-time chore, not a
 * runtime one, so it lives in `scripts/set-email.mjs`. Never edit the token by
 * hand — run `npm run email -- you@example.com` and it rewrites `site.config.ts`
 * for you.
 */

/** Turn the token from `site.config.ts` back into the address. The key is the
 *  first byte; every following byte is a character xor'd with it, all hex. */
export function decodeEmail(token: string): string {
  const key = parseInt(token.slice(0, 2), 16);
  let email = '';
  for (let i = 2; i < token.length; i += 2) {
    email += String.fromCharCode(parseInt(token.slice(i, i + 2), 16) ^ key);
  }
  return email;
}
