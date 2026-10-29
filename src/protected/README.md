# Protected project content

This folder holds the **plaintext** of password-locked projects. Nothing here is
shipped to the browser — it is encrypted at build time into
`public/locked/<slug>.json`, and only that ciphertext is deployed.

The steps to lock a project are in the root README → "Lock a project behind a
passphrase". What lives here:

- `<slug>.md`: the full, confidential write-up for `src/content/projects/<slug>.mdx`
  (plain Markdown). Git-ignored.
- `passwords.json`: `{ "<slug>": "the-passphrase" }`, copied from
  `passwords.example.json`. Git-ignored. An env var `LOCK_PASSWORD_<SLUG>`
  (uppercased, non-alphanumerics → `_`) wins over it.

## Security notes

- Encryption is **AES-GCM** with a key derived via **PBKDF2** (SHA-256,
  150k iterations) from the password. See `scripts/encrypt-projects.mjs`.
- `passwords.json` and the plaintext `*.md` files here are **git-ignored** so
  secrets don't end up in your repository. The committed
  `public/locked/*.json` is safe to publish.
- This protects content from casual access and from being scraped out of the
  static HTML. It is not a substitute for server-side auth for highly sensitive
  data — anyone with the password can decrypt.
