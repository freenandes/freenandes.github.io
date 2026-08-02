# Portfolio website

About this website at README.md, which includes a "Where things live" map — read
it before adding a file.

## State

- **Stack:** Astro 5 + MDX, `marked` for client-side Markdown of decrypted content
- **Remote:** `github.com/freenandes/portfolio` on branch `main`
- The site is served from the `/portfolio/` sub-path on GitHub Pages, so both dev and preview mount under that base. Internal links must use `withBase()` from `src/lib/base.ts`
 - `astro.config.mjs` reads `SITE`/`BASE_PATH` env vars
 - defaults `https://freenandes.github.io` and `/portfolio`

## Code conventions

- **A page owns its own look.** Page-specific CSS goes in that page's `<style>`
  block, not into `global.css`. Only styling that is genuinely shared is global.
- **Two stylesheets, and no more:** `src/styles/tokens.css` (every value) and
  `src/styles/global.css` (reset, element defaults, layout, prose, utilities,
  motion, print).
- **Style elements, not classes.** `a`, `button`, `input`, `h1`–`h4` and
  `ul[role="list"]` are styled as themselves. Add a class only when an element
  must look unlike its own kind (`button.link`) or when no element describes the
  job (`.prose`, `.meta`, `.meta-row`). Prefer an element or structural selector
  inside a scoped block over inventing a class.
- **No orphan classes.** A class in the markup must be styled or queried by
  script; a hook that only scripts use is a `data-` attribute.
- Astro scopes styles by appending `[data-astro-cid-…]` to *every* compound in a
  selector, so each element selector gains class-level specificity. When adding a
  state rule (`:hover`, `.is-open`), spell out the same path as the base rule or
  it will lose.

## Lint / test / build / run / etc.

- **Install:** `npm install`
- **Dev:** `npm run dev` (serves on port 4321)
- **Build:** `npm run build` (runs `npm run encrypt` first via `prebuild`, then `astro build` → `./dist`)
- **Preview:** `npm run preview`
- **Type/diagnostics:** `npx astro check`
- **CSS lint:** `npm run lint:css`
- **Visual regression:** `npm run visual` — builds this working tree *and* the
 reference commit (`origin/main` by default, `--base <ref>` to change it),
 screenshots the same pages and states in both, and diffs pixels plus computed
 styles. Exits `1` when anything differs, with highlighted diffs in `.visual/`.
 Needs a local Chrome (`CHROME_PATH` overrides the lookup). Run it whenever a
 change is *not* meant to alter the look, and quote the result as evidence.
 Scenarios live in `scripts/visual/scenarios.mjs`; the home page carries a small
 `drift` budget because its layout is a randomised simulation, and the
 computed-style probes are structural so a class rename doesn't drown the report.
- **Encrypt locked projects:** `npm run encrypt`
- **Sync About page from LinkedIn:** `npm run sync:linkedin` (parses `sources/linkedin-profile.pdf` → `src/cv.data.json`)
- **Change contact email:** `npm run email -- you@example.com` (writes the obfuscated token into `src/site.config.ts`; the address is never stored as plaintext)

## Locked projects

- Plaintext protected content (`src/protected/*.md`) and `passwords.json` are **git-ignored**. Only ciphertext (`public/locked/*.json`) is committed.
- Demo locked project `halcyon` uses passphrase `soft-club`.
- On a fresh checkout without the plaintext sources, `npm run encrypt` skips missing projects and the committed ciphertext is used as-is.
