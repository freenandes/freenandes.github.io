/** Keep the address out of the HTML the server ships — and out of this repo.
 *
 * Spam harvesters read static markup (and the plain-text /llms.txt), and they
 * scrape repositories; none of that runs the page's JavaScript. So the address
 * is never written anywhere as `x@y.z` or a `mailto:` href. It lives as an
 * opaque hex token (no `@`, no dots) in `site.config.ts`, and the browser
 * turns it back into a real address at runtime with `decodeEmail` (wired up in
 * `src/scripts/site.ts`).
 *
 * The trade-off is that the mail link needs JavaScript to work; that is the
 * point. With scripting off the email entry hides itself rather than sit there
 * as a dead link or a blank printed line (the `[data-email]` noscript rule in
 * `src/layouts/Base.astro`) — the other contact links work without JS.
 *
 * The codec itself lives in `./email-codec.mjs`: one implementation, plain
 * JavaScript, shared by this module and the `npm run email` setter
 * (`scripts/set-email.mjs`), so the encoder and decoder cannot drift apart.
 * Never edit the token by hand — run `npm run email -- you@example.com`.
 */

export { decodeEmail } from './email-codec.mjs';
