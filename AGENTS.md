# Portfolio

Personal portfolio website built with the **Astro** framework. Plain HTML/CSS
driven by design tokens, content authored in Markdown/MDX, with a
password-locked projects feature (build-time encryption + client-side decrypt).

## Cursor Cloud specific instructions

### Repository state

- **Stack:** Astro 5 + MDX, self-hosted fonts (`@fontsource`), `marked` for
  client-side Markdown of decrypted content.
- **Remote:** `github.com/freenandes/portfolio` on branch `main`.
- **Key paths:** `src/site.config.ts` (global content), `src/styles/tokens.css`
  (design tokens), `src/content/projects/*.mdx` (projects),
  `src/cv.config.ts` (CV), `scripts/encrypt-projects.mjs` (lock encryption).

### Services

| Service | Required | Notes |
|---------|----------|-------|
| Astro dev server | for local dev | `npm run dev` → http://localhost:4321 |

### Lint / test / build / run

- **Install:** `npm install`
- **Dev:** `npm run dev` (serves on port 4321)
- **Build:** `npm run build` (runs `npm run encrypt` first via `prebuild`, then
  `astro build` → `./dist`)
- **Preview:** `npm run preview`
- **Type/diagnostics:** `npx astro check`
- **Encrypt locked projects:** `npm run encrypt`

No separate test runner or linter is configured yet.

### Locked projects (secrets)

- Plaintext protected content (`src/protected/*.md`) and `passwords.json` are
  **git-ignored**. Only ciphertext (`public/locked/*.json`) is committed.
- Demo locked project `halcyon` uses passphrase `soft-club`.
- On a fresh checkout without the plaintext sources, `npm run encrypt` skips
  missing projects and the committed ciphertext is used as-is.

### VM update script

Use `npm ci` (or `npm install`) to restore dependencies on VM startup.
