/** The email obfuscation codec, shared by the browser (through
 * `src/lib/email.ts`) and `npm run email` (`scripts/set-email.mjs`), so the
 * setter's round-trip check runs the decoder the site ships. Plain JavaScript,
 * so the Node script can import it.
 *
 * Cloudflare-style XOR: the first hex octet is the key, the rest is the address
 * xor'd with it. The key comes from the address, so a token is reproducible.
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
