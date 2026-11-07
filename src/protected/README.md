# Protected case-study content

The plaintext of locked case studies. Nothing here is published: `npm run encrypt` (also run by
`npm run build`) encrypts it into `public/locked/<slug>.json`, and only that ciphertext is
deployed. The steps to lock one are in the root README → "Lock a case study".

- `<slug>.md`: the full write-up for `src/content/projects/<slug>.mdx`, in Markdown. Git-ignored.
- `passwords.json`: `{ "<slug>": "the-passphrase" }`, copied from `passwords.example.json`.
  Git-ignored. An env var `LOCK_PASSWORD_<SLUG>` (uppercased, other characters → `_`) wins over it.

## What it protects

AES-GCM with a key derived by PBKDF2 (SHA-256, 150,000 iterations) from the passphrase
(`scripts/encrypt-projects.mjs`). It keeps the text out of the static HTML, away from casual
readers and scrapers. It isn't server-side access control: anyone with the passphrase can decrypt
it, and share it.
