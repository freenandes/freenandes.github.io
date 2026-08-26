#!/usr/bin/env node
/* =========================================================================
   set-email.mjs

   Change the contact email in one step:

     npm run email -- you@example.com

   The address is turned into the obfuscated token stored in
   `src/site.config.ts` (`socials[].token`) and written there for you — so the
   plaintext never lands in the repo and you never hand-translate a token.
   `src/lib/email.ts` reverses the token in the browser to rebuild the link.

   The codec is imported from `src/lib/email-codec.mjs` — the same file the
   site ships — so the round-trip check below exercises the exact decoder the
   browser will run, and the two sides cannot drift apart.
   ========================================================================= */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encodeEmail, decodeEmail } from '../src/lib/email-codec.mjs';

const CONFIG = fileURLToPath(new URL('../src/site.config.ts', import.meta.url));

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
