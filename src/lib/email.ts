/** Keeps the address out of the shipped HTML and out of this repo, where
 * harvesters look and no script runs. It's stored as a hex token in
 * `site.config.ts` (set with `npm run email -- you@example.com`, never by
 * hand), and `src/scripts/site.ts` decodes it in the browser. Without
 * JavaScript the email link stays hidden (`[data-email]` in global.css); the
 * other contact links still work. The codec is `./email-codec.mjs`.
 */

export { decodeEmail } from './email-codec.mjs';
