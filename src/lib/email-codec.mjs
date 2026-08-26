/** The email obfuscation codec — the only implementation.
 *
 * Everything that encodes or decodes the address goes through this file: the
 * browser (via `src/lib/email.ts` → `src/scripts/site.ts`) and the
 * `npm run email` setter (`scripts/set-email.mjs`). It is plain JavaScript so
 * the Node script can import it without a TypeScript runtime — one shared
 * implementation means the setter's round-trip check exercises the exact
 * decoder the site ships, and the two sides cannot drift apart.
 *
 * XOR each byte with a key, Cloudflare-style: the first octet is the key, the
 * rest are the address xor'd with it, all hex. The key is derived from the
 * address so the token is reproducible rather than random.
 */

/**
 * Turn an address into the token stored in `site.config.ts`.
 * @param {string} email
 * @returns {string}
 */
export function encodeEmail(email) {
  const key = (Array.from(email).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 251) + 1;
  const bytes = [key, ...Array.from(email, (ch) => ch.charCodeAt(0) ^ key)];
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Reverse {@link encodeEmail}. Runs in the browser.
 * @param {string} token
 * @returns {string}
 */
export function decodeEmail(token) {
  const key = parseInt(token.slice(0, 2), 16);
  let email = '';
  for (let i = 2; i < token.length; i += 2) {
    email += String.fromCharCode(parseInt(token.slice(i, i + 2), 16) ^ key);
  }
  return email;
}
