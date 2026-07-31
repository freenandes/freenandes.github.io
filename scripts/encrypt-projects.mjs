#!/usr/bin/env node
/* =========================================================================
   encrypt-projects.mjs

   Encrypts the *protected* body of locked projects so the secret content is
   NEVER shipped to the browser in plaintext — only ciphertext is.

   Flow:
     src/protected/<slug>.md   (plaintext, git-ignored)  ──┐
     password (env or passwords.json, git-ignored)        ─┤── encrypt ──▶
                                                            public/locked/<slug>.json  (ciphertext, committed)

   The browser later derives the same key from the visitor's password
   (PBKDF2) and decrypts with AES-GCM. See src/components/PasswordGate.astro.

   This runs automatically before `astro build` (npm "prebuild") and can be
   run on demand with `npm run encrypt`.
   ========================================================================= */

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROTECTED_DIR = path.join(ROOT, 'src', 'protected');
const OUT_DIR = path.join(ROOT, 'public', 'locked');
const PASSWORDS_FILE = path.join(PROTECTED_DIR, 'passwords.json');

const ITERATIONS = 150_000;
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

const toB64 = (buf) => Buffer.from(buf).toString('base64');

/** Resolve a password for a slug: env var wins, then passwords.json. */
function resolvePassword(slug, fileMap) {
  const envKey = `LOCK_PASSWORD_${slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[envKey] ?? fileMap[slug];
}

async function deriveKey(password, salt) {
  const baseKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

async function encryptMarkdown(password, markdown) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(markdown)
  );
  return {
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iter: ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(ct),
  };
}

async function main() {
  if (!existsSync(PROTECTED_DIR)) {
    console.log('[encrypt] No src/protected directory — nothing to encrypt.');
    return;
  }

  let fileMap = {};
  if (existsSync(PASSWORDS_FILE)) {
    try {
      fileMap = JSON.parse(await readFile(PASSWORDS_FILE, 'utf8'));
    } catch (err) {
      console.warn('[encrypt] Could not parse passwords.json:', err.message);
    }
  }

  const entries = (await readdir(PROTECTED_DIR)).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
  );

  if (entries.length === 0) {
    console.log('[encrypt] No protected markdown files found.');
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  let done = 0;
  let skipped = 0;

  for (const file of entries) {
    const slug = file.replace(/\.md$/, '');
    const password = resolvePassword(slug, fileMap);

    if (!password) {
      console.warn(
        `[encrypt] ⚠ No password for "${slug}" (set LOCK_PASSWORD_${slug
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')} or add it to passwords.json) — skipped.`
      );
      skipped += 1;
      continue;
    }

    const markdown = await readFile(path.join(PROTECTED_DIR, file), 'utf8');
    const payload = await encryptMarkdown(password, markdown);
    const outPath = path.join(OUT_DIR, `${slug}.json`);
    await writeFile(outPath, JSON.stringify(payload), 'utf8');
    console.log(`[encrypt] ✓ ${slug} → public/locked/${slug}.json`);
    done += 1;
  }

  console.log(`[encrypt] Done. ${done} encrypted, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('[encrypt] Failed:', err);
  process.exit(1);
});
