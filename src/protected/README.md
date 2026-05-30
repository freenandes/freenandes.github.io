# Protected project content

This folder holds the **plaintext** of password-locked projects. Nothing here is
shipped to the browser — it is encrypted at build time into
`public/locked/<slug>.json`, and only that ciphertext is deployed.

## How to add a locked project

1. In `src/content/projects/<slug>.mdx`, set `locked: true`. The MDX body is the
   public teaser shown before unlock.
2. Create `src/protected/<slug>.md` with the full, confidential write-up
   (plain Markdown).
3. Give it a password — either:
   - add `"<slug>": "your-password"` to `passwords.json` (copy from
     `passwords.example.json`), **or**
   - set an env var `LOCK_PASSWORD_<SLUG>` (uppercased, non-alphanumerics → `_`).
4. Run `npm run encrypt` (also runs automatically before `npm run build`).
5. Hand the password to your client. They enter it on the project page to
   decrypt the content in their browser.

## Security notes

- Encryption is **AES-GCM** with a key derived via **PBKDF2** (SHA-256,
  150k iterations) from the password. See `scripts/encrypt-projects.mjs`.
- `passwords.json` and the plaintext `*.md` files here are **git-ignored** so
  secrets don't end up in your repository. The committed
  `public/locked/*.json` is safe to publish.
- This protects content from casual access and from being scraped out of the
  static HTML. It is not a substitute for server-side auth for highly sensitive
  data — anyone with the password can decrypt.
