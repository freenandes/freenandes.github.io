/** Keep the address out of the HTML the server ships.
 *
 * Spam harvesters read static markup (and the plain-text /llms.txt); they do
 * not run the page's JavaScript. So the address is never written into a page as
 * `x@y.z` or a `mailto:` href — it travels as an opaque hex token (no `@`, no
 * dots) that the browser turns back into a real address at runtime. See
 * `decodeEmail`, wired up in `src/scripts/site.ts`.
 *
 * The trade-off is that the mail link needs JavaScript to work; that is the
 * point, and the label still reads as a link with none.
 */

const MAILTO = 'mailto:';

/** XOR each byte with a key, Cloudflare-style: the first octet is the key, the
 *  rest are the address xor'd with it, all hex. The key is derived from the
 *  address so a build is reproducible rather than random. */
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

/** A `mailto:` href → its obfuscated token; anything else → null, so callers
 *  render normal links for the non-email socials and obfuscate only the mail. */
export function mailtoToken(href: string): string | null {
  return href.startsWith(MAILTO) ? encodeEmail(href.slice(MAILTO.length)) : null;
}
