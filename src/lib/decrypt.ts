/* =========================================================================
   Client-side decryption for locked projects.
   Mirrors scripts/encrypt-projects.mjs: PBKDF2(SHA-256) → AES-GCM.
   The password never leaves the browser; only the derived key decrypts the
   ciphertext fetched from /locked/<slug>.json.
   ========================================================================= */

export interface LockedPayload {
  v: number;
  alg: string;
  kdf: string;
  hash: string;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

/** Decode base64 into a fresh ArrayBuffer-backed Uint8Array (BufferSource). */
const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Encode a string into a fresh ArrayBuffer-backed Uint8Array. */
const toBytes = (s: string): Uint8Array<ArrayBuffer> => {
  const encoded = new TextEncoder().encode(s);
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
};

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    toBytes(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

export async function fetchPayload(slug: string): Promise<LockedPayload> {
  const res = await fetch(`/locked/${slug}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Locked content not found for "${slug}".`);
  return res.json() as Promise<LockedPayload>;
}

/**
 * Decrypts a locked payload with the given password.
 * Throws if the password is wrong (AES-GCM auth tag fails to verify).
 */
export async function decryptMarkdown(
  payload: LockedPayload,
  password: string
): Promise<string> {
  const key = await deriveKey(password, fromB64(payload.salt), payload.iter);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(payload.iv) },
    key,
    fromB64(payload.ct)
  );
  return new TextDecoder().decode(plainBuffer);
}
