# Portfolio website

About this website at README.md.

## State

- **Stack:** Astro 5 + MDX, `marked` for client-side Markdown of decrypted content
- **Remote:** `github.com/freenandes/portfolio` on branch `main`
- The site is served from the `/portfolio/` sub-path on GitHub Pages, so both dev and preview mount under that base. Internal links must use `withBase()` from `src/lib/base.ts`
  - `astro.config.mjs` reads `SITE`/`BASE_PATH` env vars
  - defaults `https://freenandes.github.io` and `/portfolio`

## Lint / test / build / run / etc.

- **Install:** `npm install`
- **Dev:** `npm run dev` (serves on port 4321)
- **Build:** `npm run build` (runs `npm run encrypt` first via `prebuild`, then `astro build` → `./dist`)
- **Preview:** `npm run preview`
- **Type/diagnostics:** `npx astro check`
- **Visual regression:** `npm run visual` — builds this working tree *and* the
  reference commit (`origin/main` by default, `--base <ref>` to change it),
  screenshots the same pages and states in both, and diffs pixels plus computed
  styles. Exits `1` when anything differs, with highlighted diffs in `.visual/`.
  Needs a local Chrome (`CHROME_PATH` overrides the lookup). Run it whenever a
  change is *not* meant to alter the look, and quote the result as evidence.
  Scenarios live in `scripts/visual/scenarios.mjs`; the home page carries a small
  `drift` budget because its layout is a randomised simulation.
- **Encrypt locked projects:** `npm run encrypt`
- **Sync About page from LinkedIn:** `npm run sync:linkedin` (parses `sources/linkedin-profile.pdf` → `src/cv.data.json`)

## Locked projects

- Plaintext protected content (`src/protected/*.md`) and `passwords.json` are **git-ignored**. Only ciphertext (`public/locked/*.json`) is committed.
- Demo locked project `halcyon` uses passphrase `soft-club`.
- On a fresh checkout without the plaintext sources, `npm run encrypt` skips missing projects and the committed ciphertext is used as-is.

## Cursor Cloud specific instructions

- Dev/preview serve under the `/portfolio/` base path, so browse `http://localhost:4321/portfolio/` (a bare `/` 404s).
- Dependencies are baked into the snapshot via the `npm ci` startup script, so `node_modules` is present without an install step.
- `npm run visual` uses `puppeteer-core` against the system Chrome. The base image ships Chrome at `/usr/bin/google-chrome-stable`, which is in the script's candidate list (`scripts/visual/capture.mjs`), so it works with **no `CHROME_PATH`**. Do not install a browser via puppeteer/playwright downloads. The check builds `origin/main` in a throwaway worktree, so `origin/main` must be fetched first (`git fetch origin main`). `ffmpeg` and `Xvfb` are present for demo recordings.
