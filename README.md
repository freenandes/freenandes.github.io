# PMCF.XYZ Portfolio

Pedro MC Fernandes's portfolio site. The home page is an interactive map that links to an About/CV page (which prints to PDF) and to a set of case studies, some of them unlocked with a passphrase.

- Live (in development): https://www.pmcf.xyz/portfolio/. The old site stays at https://www.pmcf.xyz until launch.
- Repo: https://github.com/freenandes/portfolio (branch `main`)
- Every push to `main` deploys to the live site.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:4321/portfolio/ with live reload |
| `npm run build` | Encrypts locked projects, then builds to `./dist` |
| `npm run preview` | Serves the last build from `./dist` |
| `npm run check` | Type and template errors (`astro check`) |
| `npm run lint:css` | CSS lint, which CI also runs. `npm run lint:css:fix` fixes what it can |
| `npm run visual` | Compares this working tree's look with `origin/main` (see below) |
| `npm run encrypt` | Re-encrypts locked projects (also part of `build`) |
| `npm run sync:linkedin` | Rebuilds the About page data from your LinkedIn PDF |
| `npm run email -- you@example.com` | Changes the contact email |

Before you push: run `npm run check`, `npm run lint:css` and `npm run build`.

## Setup (once per machine)

1. Install Homebrew, then add it to your PATH. The installer prints the two lines to run under "Next steps".
2. Install Node 22, the version in `.nvmrc`, and add it to your PATH:

   ```bash
   brew install node@22
   echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zprofile && source ~/.zprofile
   ```

3. In the project folder, run `npm install`, then `npm run dev`.

The visual check also needs Google Chrome installed.

## How it's made

- [Astro](https://astro.build) 5 builds a fully static site. Pages are `.astro` files, and case studies are MDX. There's no React or Tailwind, just Astro components, TypeScript and plain CSS.
- The site lives under `/portfolio/` on GitHub Pages, so internal links go through `withBase()` (`src/lib/base.ts`). The domain `pmcf.xyz` belongs to the old site's repo (`freenandes.github.io`), which is why this repo shows up at `www.pmcf.xyz/portfolio/`.
- The home map takes its markers and card text from `src/diagram.config.ts`. A physics simulation in `src/scripts/nav-diagram.ts` positions the markers, so the layout varies a little on every load.
- The About page renders `src/cv.data.json`, which is generated from a LinkedIn PDF export.
- To lock a project, you write its full text in a git-ignored file, and the build encrypts it into `public/locked/<slug>.json`. Visitors decrypt it in their browser with the passphrase (PBKDF2 + AES-GCM), and `marked` renders the Markdown. The plaintext is never published.
- A strict Content Security Policy in `src/layouts/Base.astro` blocks inline and third-party scripts.
- Deploy: `.github/workflows/deploy.yml` lints the CSS, builds and publishes to Pages on every push to `main`.

## Where things live

Each page owns its markup and its styling, so changing how a page looks means opening that page.

| To change… | Open |
| --- | --- |
| Colours, type scale, spacing, motion | `src/styles/tokens.css` |
| How plain elements look everywhere (links, buttons, headings, lists, Markdown), shared print | `src/styles/global.css` |
| Name, role, social links, OG image, theme colour | `src/site.config.ts` |
| `<head>`, metadata, CSP, JSON-LD, page shell | `src/layouts/Base.astro` |
| Home page: markup and look | `src/pages/index.astro` |
| Home page: markers, card copy, what connects to what | `src/diagram.config.ts` |
| Home page: where markers end up (force layout) | `src/scripts/nav-diagram.ts` |
| About page: markup, look, its print rules | `src/pages/about.astro` |
| About page: content | `src/cv.data.json` (generated, don't edit by hand) |
| Case study: markup and look | `src/pages/projects/[...slug].astro` |
| Case study: content | `src/content/projects/<slug>.mdx` |
| Case study frontmatter fields | `src/content.config.ts` |
| Passphrase gate | `src/components/PasswordGate.astro` |
| Page nav, footer | `src/components/PageNav.astro`, `src/components/Footer.astro` |
| Print button, email decoding, reveal-on-print | `src/scripts/site.ts` |
| 404, `/llms.txt`, `/robots.txt`, manifest | `src/pages/` |
| Build scripts (encrypt, LinkedIn sync, email, visual check) | `scripts/` |

## Common tasks

### Add a case study

1. Create `src/content/projects/<slug>.mdx`. The file name becomes the URL, `/portfolio/projects/<slug>/`.

   ```mdx
   ---
   title: Project name
   description: One sentence, used on the page and in search results.
   date: 2024-06-01
   order: 1            # lower comes first; optional
   role: Lead Product Designer
   client: Company
   tags: ['Design Systems', 'Growth']
   draft: true         # hides it from the live site, still shows in dev
   ---

   The write-up, in Markdown.
   ```

2. To put it on the home map, add a node with `kind: 'project'` to `src/diagram.config.ts`, and add its `id` to `diagramChain` so it gets connected.
3. When it's ready, remove `draft: true`.

### Lock a project behind a passphrase

1. In the project's MDX, set `locked: true`. The MDX body becomes the public teaser.
2. Put the full write-up in `src/protected/<slug>.md`. This file is git-ignored.
3. Add `"<slug>": "the-passphrase"` to `src/protected/passwords.json` (copy it from `passwords.example.json`), or set the env var `LOCK_PASSWORD_<SLUG>`.
4. Run `npm run encrypt`, then commit `public/locked/<slug>.json`.
5. Send the passphrase to whoever should read it.

The demo project `halcyon` uses the passphrase `soft-club`. If a checkout has no plaintext files, encrypting leaves the committed files alone. More detail is in `src/protected/README.md`.

### Update the About page from LinkedIn

1. On LinkedIn, open your profile and choose Resources → Save to PDF.
2. Save the file as `sources/linkedin-profile.pdf`. The folder is git-ignored, because the PDF contains your phone number and email.
3. Run `npm run sync:linkedin`, check the About page in dev, then commit `src/cv.data.json`.

The sync drops your email and phone number. It also writes `selectedClients` and `recognition`, which no page shows yet.

### Change the contact email

Run `npm run email -- you@example.com`. It stores an obfuscated token in `src/site.config.ts`, so the address never appears as plain text in the repo or the HTML. Don't edit the token by hand: if it doesn't decode to a valid address, the build fails.

### Check you haven't changed the look

```bash
npm run visual                    # this working tree vs origin/main
npm run visual -- --base HEAD~1   # compare against another commit
npm run visual -- --only about    # only scenarios with "about" in the name
npm run visual -- --keep          # keep both builds in .visual/
```

It builds both versions and screenshots the same pages and states at desktop and phone sizes. Then it compares pixels and computed styles. Differences are saved as highlighted images in `.visual/`, and the run exits `1`. That means "there's something to review", not "it's broken". The home page always varies slightly because of the simulation; small differences there are reported as `drift`. To add pages or states, edit `scripts/visual/scenarios.mjs`. If Chrome isn't found, set `CHROME_PATH`.

## Conventions

- Style elements, not classes. `<a>`, `<button>` and the headings look right without classes. Use a class only when an element must look unlike its own kind (`button.link`) or when no element fits (`.prose`, `.meta`).
- `role="list"` means "a row of things" (nav, socials, tags): no bullets, laid out in a wrapping row. A plain `<ul>` keeps its bullets.
- Page-specific CSS lives in that page's `<style>` block. Shared values belong in `tokens.css`.
- To stagger an entrance, use `data-reveal style="--reveal-step: 2"`. The step number is its place in the queue.

### Launching at www.pmcf.xyz

Not yet. While the old site lives at the root, keep this one under `/portfolio/`. When you're ready:

1. In the old site's repo (`freenandes.github.io`), go to Settings → Pages and remove the custom domain.
2. In this repo, set `BASE_PATH: /` in `.github/workflows/deploy.yml` and change the default in `astro.config.mjs` to match.
3. In this repo, go to Settings → Pages, set the custom domain to `www.pmcf.xyz` and tick "Enforce HTTPS".
4. Push, then check https://www.pmcf.xyz/ and update the "Live" line and the base-path notes in this README and `AGENTS.md`.

`withBase()` makes every internal link follow the new base, so no page code changes. Once at the root, `robots.txt` and `/llms.txt` start being read by crawlers.

## Website Specification

The site is audited against [The Website Specification](https://specification.website). [`SPEC-COMPLIANCE.md`](./SPEC-COMPLIANCE.md) lists what's done, what GitHub Pages provides and what's pending.

## To do

- [ ] Create the content based on [the list](notes/content-strategy.md) (local-only, `notes/` is git-ignored)
- [ ] Replace or draft the placeholder projects `atlas-design-system`, `field-notes` and `helio-banking`. They're live pages with fictional content.
- [ ] Add `public/og.png` (1200×630). `og:image` already points to it, but the file is missing.
- [ ] Add raster app icons (`favicon.ico`, `apple-touch-icon.png`, maskable PWA icon).
- [ ] Self-host the fonts (currently Google Fonts).
