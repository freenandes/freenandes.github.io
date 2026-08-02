#!/usr/bin/env node
/* =========================================================================
   set-email.mjs

   Change the contact email in one step:

     npm run email -- you@example.com

   The address is turned into the obfuscated token stored in
   `src/site.config.ts` (`socials[].token`) and written there for you — so the
   plaintext never lands in the repo and you never hand-translate a token.
   `src/lib/email.ts` reverses the token in the browser to rebuild the link.

   The codec below mirrors `src/lib/email.ts` on purpose: this is a plain Node
   script with no TypeScript runtime, and the algorithm is a few lines that must
   not change in one place without the other.
   ========================================================================= */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CONFIG = fileURLToPath(new URL('../src/site.config.ts', import.meta.url));

/** XOR each byte with a key; the first octet is the key, the rest the address
 *  xor'd with it, all hex. The key is derived from the address so the token is
 *  reproducible. Mirror of `src/lib/email.ts`. */
function encodeEmail(email) {
  const key = (Array.from(email).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 251) + 1;
  const bytes = [key, ...Array.from(email, (ch) => ch.charCodeAt(0) ^ key)];
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeEmail(token) {
  const key = parseInt(token.slice(0, 2), 16);
  let email = '';
  for (let i = 2; i < token.length; i += 2) {
    email += String.fromCharCode(parseInt(token.slice(i, i + 2), 16) ^ key);
  }
  return email;
}

const email = process.argv[2]?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run email -- you@example.com');
  process.exit(1);
}

const token = encodeEmail(email);
if (decodeEmail(token) !== email) {
  console.error('Refusing to write: the token did not round-trip back to the address.');
  process.exit(1);
}

const source = await readFile(CONFIG, 'utf8');
const rel = path.relative(process.cwd(), CONFIG);

// Anchored on the Email social entry; only the hex between the quotes changes.
const emailEntry = /(\{\s*label:\s*'Email',\s*token:\s*')[0-9a-f]*('\s*\})/;
if (!emailEntry.test(source)) {
  console.error(`Could not find the Email token in ${rel}.`);
  console.error("Expected a line like: { label: 'Email', token: '…' }");
  process.exit(1);
}

const updated = source.replace(emailEntry, `$1${token}$2`);
if (updated === source) {
  console.log(`Contact email is already ${email} — nothing to change.`);
} else {
  await writeFile(CONFIG, updated);
  console.log(`Updated contact email → ${email}`);
  console.log(`  ${rel}: token ${token}`);
  console.log('Review the diff and commit. (The PDF/CV uses this same address at runtime.)');
}
