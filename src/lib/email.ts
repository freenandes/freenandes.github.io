/** Keep the address out of the HTML the server ships — and out of this repo.
 *
 * Spam harvesters read static markup (and the plain-text /llms.txt), and they
 * scrape public repositories; none of that runs the page's JavaScript. So the
 * address is never written anywhere as `x@y.z` or a `mailto:` href. It lives as
 * an opaque hex token (no `@`, no dots) in `site.config.ts`, and the browser
 * turns it back into a real address at runtime. See `decodeEmail`, wired up in
 * `src/scripts/site.ts`.
 *
 * The trade-off is that the mail link needs JavaScript to work; that is the
 * point, and the label still reads as a link with none.
 */

/** Turn an address into the token stored in `site.config.ts`. Not called at
 *  runtime — it is the tool you run by hand to (re)generate that token when the
 *  address changes:
 *  `node -e "import('./src/lib/email.ts').then((m) => console.log(m.encodeEmail('you@example.com')))"`
 *
 *  XOR each byte with a key, Cloudflare-style: the first octet is the key, the
 *  rest are the address xor'd with it, all hex. The key is derived from the
 *  address so the token is reproducible rather than random. */
export function encodeEmail(email: string): string {
  const key = (Array.from(email).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 251) + 1;
  const bytes = [key, ...Array.from(email, (ch) => ch.charCodeAt(0) ^ key)];
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Reverse {@link encodeEmail}. Runs in the browser. */
export function decodeEmail(token: string): string {
  const key = parseInt(token.slice(0, 2), 16);
  let email = '';
  for (let i = 2; i < token.length; i += 2) {
    email += String.fromCharCode(parseInt(token.slice(i, i + 2), 16) ^ key);
  }
  return email;
}
