# PMCF.XYZ Portfolio

A minimal website built with:

- [Astro](https://astro.build)
- `marked` for client-side rendering of decrypted Markdown
- Web Crypto (PBKDF2 + AES-GCM) for the lock feature

## Features

- Home page with a dynamic, interactive diagram as the intro to the content.
- Password-locked pages for confidentiality. Content is encrypted at build time (AES-GCM via PBKDF2) and only decrypted client-side. Secrets never ship in HTML.
- A structured résumé/About page that downloads as a clean PDF (via the browser print pipeline + a dedicated print stylesheet).

## Quick start

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs to ./dist (runs encryption first)
npm run preview   # preview the build
```

## Where things live

Each page owns its own markup **and** its own styling, so changing how a page
looks means opening that page. Copy that a page reads from lives in one file
next to it.

| To change… | Open |
| --- | --- |
| Colour, type scale, spacing, motion — anything used more than once | `src/styles/tokens.css` |
| How plain elements look everywhere (links, buttons, headings, lists, rendered Markdown) | `src/styles/global.css` |
| Name, role, social links, OG image, theme colour | `src/site.config.ts` |
| `<head>`, metadata, JSON-LD, the skip link, the page shell | `src/layouts/Base.astro` |
| The home page — markup and look | `src/pages/index.astro` |
| The home page — which markers exist, what their cards say, what connects to what | `src/diagram.config.ts` |
| Where the markers end up on screen (the force layout) | `src/scripts/nav-diagram.ts` |
| The About page — markup and look, including its print stylesheet | `src/pages/about.astro` |
| The About page — content | `src/cv.data.json` (generated; see below) |
| A case study — markup and look | `src/pages/projects/[...slug].astro` |
| A case study — content | `src/content/projects/<slug>.mdx` |
| The passphrase gate — markup, look and crypto | `src/components/PasswordGate.astro` |
| The sticky page nav, the footer | `src/components/PageNav.astro`, `src/components/Footer.astro` |
| The 404 page | `src/pages/404.astro` |

### Conventions

- **Elements are styled as themselves.** A `<button>` looks like a button and an
  `<a>` looks like a link with no class on it. A class appears only when an
  element has to look unlike its own kind (`button.link` is a button that reads
  as a link) or when no element describes the job (`.prose`, `.meta`).
- **`role="list"` means "a row of things"** — nav, socials, tags, links. It gets
  the markers removed and laid out in a wrapping row. A list that keeps its
  bullets is a plain `<ul>`.
- **Stagger an entrance** with `data-reveal style="--reveal-step: 2"`: the step
  is its place in the queue, and the gap between steps is one token
  (`--reveal-stagger`).
- **Internal links go through `withBase()`** (`src/lib/base.ts`) — the site is
  served from a sub-path.

## Checking you haven't changed the look

```bash
npm run visual                    # this working tree vs origin/main
npm run visual -- --base HEAD~1
npm run visual -- --only about    # just the scenarios named like "about"
npm run visual -- --keep          # keep both builds in .visual/ to poke at
```

It builds the reference commit in a throwaway git worktree and the current
working tree (uncommitted changes included), serves both, and photographs the
same list of pages and states in each — home, the map with a card open, the CV
at three scroll positions and as it reaches a printer, a case study, the locked
project before/refused/after unlocking, and the 404 — at desktop and phone
sizes. It then compares the screenshots pixel by pixel **and** compares computed
styles, which catches changes a screenshot can't see.

Anything that differs is written to `.visual/<scenario>.png` as a highlighted
diff, and the run exits `1`. That exit code means "there are differences to
review", not "something is broken": if the change was the point, the run is your
evidence for it.

Three things to know:

- **Chrome does the photography.** `puppeteer-core` drives whatever Chrome is
  already installed; set `CHROME_PATH` if it lives somewhere unusual.
- **The home page drifts.** Its layout comes out of a randomised physics
  simulation, so two captures of the *same* build land within a few tenths of a
  percent. `Math.random` is seeded and looping animations are rewound and paused
  to keep that as small as possible; what's left is absorbed by the per-scenario
  `drift` budget in `scripts/visual/scenarios.mjs`, and shows up as `drift`
  rather than `CHANGED`.
- **The computed-style probes are structural** (`main > article > header h1`,
  not `.cv__name`), so renaming a class doesn't make the report shout. Moving a
  declaration from a wrapper onto the thing it wrapped still shows up, which is
  the point — check the pixels alongside it.

Pages, states and probed selectors all live in `scripts/visual/scenarios.mjs` —
add a page there and both builds get it.

## Syncing the About page from LinkedIn

The About page renders from `src/cv.data.json`, which is generated from a LinkedIn profile's PDF. To update:

1. On LinkedIn, open profile, save it to PDF.
2. Replace `sources/linkedin-profile.pdf` with the new export.
3. Regenerate the data:

   ```bash
   npm run sync:linkedin
   ```

   This reads the PDF and writes `src/cv.data.json`. Commit both files. The next build picks up the new content.

There's a Github action for this as well, `.github/workflows/sync-linkedin.yml` does steps 3 for you: when you push a new `sources/linkedin-profile.pdf` to `main`, it runs the sync, commits the regenerated `src/cv.data.json`, and that commit triggers the normal Pages deploy.

The sync also writes `selectedClients` and `recognition`, which no page renders
today — they are there if you want to add those sections.

## Locking a project behind a password

For confidential pages share a passphrase instead of publishing it.

1. In the project's MDX frontmatter set `locked: true`. The MDX body becomes the public teaser shown before unlock.
2. Put the full, confidential write-up in `src/protected/<slug>.md` (plain Markdown). This file is **git-ignored**.
3. Set the password — either:

   1. add `"<slug>": "your-pass"` to `src/protected/passwords.json` (copy `passwords.example.json`)
   2. or set an env var `LOCK_PASSWORD_<SLUG>`

4. Run `npm run encrypt` (also runs automatically on `npm run build`). This writes ciphertext to `public/locked/<slug>.json`.
5. Hand the passphrase to your client. They enter it on the project page; the content is decrypted in their browser with the Web Crypto API.

## Website Specification compliance

This site is audited against [The Website Specification](https://specification.website). See
[`SPEC-COMPLIANCE.md`](./SPEC-COMPLIANCE.md) for the full status: what's implemented (CSP, JSON-LD
structured data, manifest, robots/llms/security.txt, custom 404, contrast fixes, …), what the
GitHub Pages platform already provides, and what's still **pending** (notably an `og.png` social
image, raster app icons, and self-hosted fonts).

## To do

- [ ] Add map texture to 404 page
- [ ] Add `public/og.png` (1200×630) — `og:image` is wired up but the asset is missing.
- [ ] Add raster app icons (`favicon.ico`, `apple-touch-icon.png`, maskable PWA icon).
- [ ] Self-host the web fonts (drops the Google Fonts third-party request, enables SRI).
- [x] Create a solution to avoid exposing the email. The address lives only as
      an opaque hex token in `site.config.ts` (`socials[].token`) and is
      reassembled in the browser (`src/lib/email.ts`, `src/scripts/site.ts`), so
      it is never in plaintext in the served HTML, `/llms.txt`, or this public
      repo; the printed CV line is filled in the same way. Regenerate the token
      with `encodeEmail()` from `src/lib/email.ts` if the address changes.
- [ ] See [`SPEC-COMPLIANCE.md`](./SPEC-COMPLIANCE.md) for the complete pending list.
