# PMCF.XYZ Portfolio

Pedro MC Fernandes's portfolio site. The home page is an interactive map that links to an About/CV page (which prints to PDF) and to a set of case studies, some of them unlocked with a passphrase.

- Live: https://www.pmcf.xyz/. Links to the old https://www.pmcf.xyz/portfolio/ addresses forward to the same pages at the root (see [Old `/portfolio/` links](#old-portfolio-links)).
- Repo: https://github.com/freenandes/portfolio (branch `main`)
- Every push to `main` deploys to the live site.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:4321/ with live reload |
| `npm run build` | Encrypts locked projects, then builds to `./dist` |
| `npm run preview` | Serves the last build from `./dist` |
| `npm run check` | Type and template errors (`astro check`) |
| `npm run lint:css` | CSS lint, which CI also runs. `npm run lint:css:fix` fixes what it can |
| `npm run visual` | Compares this working tree's look with `origin/main` (see below) |
| `npm run encrypt` | Re-encrypts locked projects (also part of `build`) |
| `npm run email -- you@example.com` | Changes the contact email |
| `npm run icons` | Redraws the favicon's PNG and .ico versions from `public/favicon.svg` |

Before you push: run `npm run check`, `npm run lint:css` and `npm run build`. CI runs the same three on every pull request to `main`, and a push to `main` doesn't deploy if one of them fails.

## Setup (once per machine)

1. Install Homebrew, then add it to your PATH. The installer prints the two lines to run under "Next steps".
2. Install Node 22 and add it to your PATH. `.nvmrc` pins the exact version CI uses, which Astro's minimum sets:

   ```bash
   brew install node@22
   echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zprofile && source ~/.zprofile
   ```

3. In the project folder, run `npm install`, then `npm run dev`.

The visual check also needs Google Chrome installed.

### Claude Code cloud sessions

The cloud image already has Node 22 and a Chromium that `npm run visual` finds without configuration. These go in the cloud environment's settings (the environment menu in the session's title bar, then Edit), not in the repo:

- Setup script, so dependencies are installed before the session starts (it runs one folder above the repo):

  ```bash
  cd portfolio && npm ci --no-audit --no-fund
  ```

- Environment variables, which keep command output short: `ASTRO_TELEMETRY_DISABLED=1` and `NPM_CONFIG_UPDATE_NOTIFIER=false`.
- Network access: the default level is enough (npm, GitHub, and Google Fonts, which the visual check loads). On a stricter level, allow `fonts.googleapis.com` and `fonts.gstatic.com`, plus `www.pmcf.xyz` if you want sessions to check the live site.

No secrets are needed: the locked project's ciphertext is committed, and the visual check uses the demo passphrase.

## How it's made

- [Astro](https://astro.build) 7 builds a fully static site. Pages are `.astro` files, and case studies are MDX. There's no React or Tailwind, just Astro components, TypeScript and plain CSS.
- GitHub Pages serves the site at the root of `www.pmcf.xyz`; the custom domain is set in this repo's Settings → Pages. Internal links go through `withBase()` (`src/lib/base.ts`), so the base path is set in one place. The site used to sit under `/portfolio/`, and its old addresses still forward to the new ones.
- The home map takes its markers and card text from `src/diagram.config.ts`. A physics simulation in `src/scripts/nav-diagram.ts` positions the markers, so the layout varies a little on every load.
- The footer of About and every case study opens with a mini-map instead of a rule: the map's pages in the same order, pulled into one straight line, with no physics and no script. In a row, each label takes the room it needs and the gaps between labels are equal, from one edge of the text to the other. Each marker links to its page, and the page you're on is filled in. The name at the centre isn't on it, because the page nav stays pinned to the top and always links back to the map. Contact isn't either, because its links are in the footer just below.
- The About page, which doubles as the printable CV, renders `src/content/cv.md`, a list of fields in the same order as the page: location and languages (one small line under your name), headline, summary (Markdown), jobs, earlier work, education. You edit it by hand; the build rejects missing or misspelled fields.
- To lock a project, you write its full text in a git-ignored file, and the build encrypts it into `public/locked/<slug>.json`. Visitors decrypt it in their browser with the passphrase (PBKDF2 + AES-GCM), and `marked` renders the Markdown. The plaintext is never published.
- A strict Content Security Policy in `src/layouts/Base.astro` blocks inline and third-party scripts.
- Deploy: `.github/workflows/deploy.yml` lints the CSS, checks types and builds on every pull request and every push to `main`. Only a push to `main` publishes to Pages.

## Where things live

Each page owns its markup and its styling, so changing how a page looks means opening that page. Values you're likely to tune sit at the top of the file that uses them, as named knobs: shared ones in `tokens.css`, a page's own ones at the top of its `<style>` block.

| To change… | Open |
| --- | --- |
| Colours, type scale, spacing, motion | `src/styles/tokens.css` |
| How plain elements look everywhere (links, buttons, headings, lists, Markdown), shared print | `src/styles/global.css` |
| Name, role, social links, OG image, theme colour, extra contact lines printed only on the PDF CV (`printContacts`) | `src/site.config.ts` |
| The favicon and app icons: the SVG they're drawn from, and the list of files made from it | `public/favicon.svg`, `src/lib/icons.mjs` |
| Site URL, base path, redirects from the old `/portfolio/` addresses | `astro.config.mjs` |
| `<head>`, metadata, CSP, JSON-LD, page shell | `src/layouts/Base.astro` |
| Home page: markup and look | `src/pages/index.astro` |
| Home page: texture, marker size, connector weight, card width, ring speed, size of the drawings on the texture | the knobs at the top of the `<style>` in `src/pages/index.astro` |
| Home page: markers, card copy, what connects to what (the mini-map follows it) | `src/diagram.config.ts` |
| Home page: spacing between markers, connector wiggle, where cards open, the drawings' clearance, entrance timing, physics | `KNOBS` and `SIM` at the top of `src/scripts/nav-diagram.ts` |
| Home page: how the layout is solved | the rest of `src/scripts/nav-diagram.ts` |
| About page: markup, look, its print rules | `src/pages/about.astro` |
| About page: vertical rhythm (gaps between sections, titles, entries) | the `--cv-*` knobs at the top of the `<style>` in `src/pages/about.astro` |
| About page / CV: content | `src/content/cv.md` |
| About page / CV: which fields exist | `src/content.config.ts` (`cv`) |
| Case study: markup and look | `src/pages/projects/[...slug].astro` |
| About and case studies: the mini-map that opens the footer, and its knobs | `src/components/MiniMap.astro` |
| About and case studies: the pinned page nav, and the size and weight of the flag in it | `src/components/PageNav.astro` |
| The drawings on the map's texture, the flag among them (the nav imports it as a component; it takes the text colour around it) | `src/assets/decor/` |
| The colour of those drawings, and of the ruler | `--ink-decor` in `src/styles/tokens.css` |
| The map's scale in the bottom right corner | `src/assets/ruler.svg`; its height is `--ruler-height` at the top of the `<style>` in `src/pages/index.astro` |
| Case study: content | `src/content/projects/<slug>.mdx` |
| Case study: screenshots, their thumbnail size and the enlarged view | `src/components/Gallery.astro` and the knobs at the top of its `<style>` |
| Case study: images and videos | `src/assets/projects/<slug>/` |
| Case study frontmatter fields | `src/content.config.ts` |
| Passphrase gate | `src/components/PasswordGate.astro` |
| Page nav, footer | `src/components/PageNav.astro`, `src/components/Footer.astro` |
| Print button, email decoding, reveal-on-print | `src/scripts/site.ts` |
| 404, `/llms.txt`, `/robots.txt`, manifest | `src/pages/` |
| Build scripts (encrypt, email, icons, visual check) | `scripts/` |
| CI and deploy | `.github/workflows/deploy.yml` |

## Common tasks

### Add a case study

1. Create `src/content/projects/<slug>.mdx`. The file name becomes the URL, `/projects/<slug>/`.

   ```mdx
   ---
   title: Project name
   description: One sentence, used on the page and in search results.
   date: 2024-06-01    # shows as 2024; or write text to show as is, such as 2022–2026
   order: 1            # lower comes first; optional
   role: Lead Product Designer
   client: Company
   tags: ['Design Systems', 'Growth']
   draft: true         # hides it from the live site, still shows in dev
   ---

   The write-up, in Markdown.
   ```

2. To put it on the home map, add a node with `kind: 'project'` to `src/diagram.config.ts`, using the file name as its `id`, and add that `id` to `diagramChain` so it gets connected. The node holds the card copy and placement; the label, tags and link come from the project's frontmatter. The build stops with a message if a node links to a page that doesn't exist, if a project node has no published project (a wrong `id`, or still a draft), or if `diagramChain` names an id no node has. Once it's on the map, it's also a stop on the mini-map at the foot of About and every case study.
3. When it's ready, remove `draft: true`.

### Add screenshots or a video to a case study

Put the files in `src/assets/projects/<slug>/` and import them at the top of the MDX, under the frontmatter.

Screenshots go in a `Gallery`. Each one shows as a thumbnail at the same scale as the others, so their text matches: side by side, wider than the text when the window has room, stacked when it doesn't, and as wide as the text on a phone. A click or tap opens it as large as fits the window, never past the size it was on screen. There a click or tap zooms in where it lands, up to that size and no further (`--lightbox-max-zoom`), and the next zooms back out; a pinch, Ctrl or ⌘ with the wheel, or the Zoom in and Zoom out buttons zoom by degrees. Zoomed, it pans by scrolling or dragging, and the buttons stay at the top. Export every screenshot in a gallery at the same zoom, and tell the gallery which: `density={2}` for 2× exports (the default is 1). Large screenshots can take a smaller thumbnail scale with `scale={0.17}`, so a few still fit side by side. The text between the tags is the caption.

```mdx
import Gallery from '../../components/Gallery.astro';
import results from '../../assets/projects/<slug>/results.png';

<Gallery images={[{ src: results, alt: 'What the screenshot shows, numbers included' }]}>
  The caption.
</Gallery>
```

A video is a plain `<video>` in a `<figure>`, with a poster frame so it doesn't print blank. `percona-case-1.mdx` has one under "Lost the debate, kept the work". Export it at the size it was recorded at (a 2× screen recording stays 2×, so it's sharp full screen), then encode it for a fixed quality rather than a fixed bitrate: a screen recording barely changes from frame to frame, so it stays small without starving the text. A low bitrate is what blurs UI text, at any resolution. Every version committed stays in the repo, and GitHub refuses a file over 100 MB, so keep each one well under that:

```bash
ffmpeg -i master.mp4 -vf "scale=out_range=tv:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -tune animation -crf 22 -level:v 5.2 -x264-params aq-mode=3 -an -movflags +faststart out.mp4
```

A lower `-crf` is sharper and bigger: 22 suits a short video, and a long, busy one can go up to about 29 before text softens. `-level:v 5.2` keeps a 4K, 60 fps video within what phones' and laptops' hardware decoders accept. `-an` drops the sound, which these demos don't have. Take the poster from the same master, at the same moment, so it doesn't change when the video starts.

### Add a drawing to the map

1. Drop the SVG in `src/assets/decor/`. Every file there lands on the map, with nothing else to wire up.
2. In the file, replace the drawing's fixed colour with `fill="currentColor"`, so `--ink-decor` colours it, and turn inline `style` attributes into plain ones. Keep its frame as drawn.
3. Give it a width in the knobs at the top of the `<style>` in `src/pages/index.astro`, named after its file: `kraken.svg` takes `--decor-kraken`. One with no knob of its own takes its viewBox width times `--decor-scale`.

Each drawing gets a random spot once the map has come to rest, clear of the markers, rings, connectors and the other drawings, starting with the biggest. It stays there, and only moves if a reshuffle or a resize runs into it. If the map leaves no room, it stays hidden until a later layout has some, which for a big drawing can mean it never shows on a phone.

### Lock a project behind a passphrase

1. In the project's MDX, set `locked: true`. The MDX body becomes the public teaser.
2. Put the full write-up in `src/protected/<slug>.md`. This file is git-ignored.
3. Add `"<slug>": "the-passphrase"` to `src/protected/passwords.json` (copy it from `passwords.example.json`), or set the env var `LOCK_PASSWORD_<SLUG>`.
4. Run `npm run encrypt`, then commit `public/locked/<slug>.json`.
5. Send the passphrase to whoever should read it.

If a checkout has no plaintext files, encrypting leaves the committed files alone. How the encryption works, and what it doesn't protect against: `src/protected/README.md`.

### Update the About page / CV

1. Edit `src/content/cv.md`. A job is a block of `role`, `org`, `period`, an optional one-line `summary` and a list of `points`; newest goes first. `earlierWork` entries take the same fields minus `points`, for older jobs in one line each. The summary sits under `summary: |`, with every line indented by two spaces. It's Markdown, so blank lines make paragraphs and `- ` lines make a bulleted list. Outside the summary, if a value contains `: ` (like `software: observability`), wrap it in double quotes, or the page fails to load.
2. Check it with `npm run dev` at `/about/`. Use the page's Download PDF button to check the printed CV.
3. Commit and push.

The portfolio is the original: change the wording here, then paste it into LinkedIn. `skills` isn't shown on the page; search engines read it. If the build fails, the error names the field in `cv.md` it didn't accept.

### Change the contact email

Run `npm run email -- you@example.com`. It stores an obfuscated token in `src/site.config.ts`, so the address never appears as plain text in the repo or the HTML. Don't edit the token by hand: if it doesn't decode to a valid address, the build fails.

### Change the link-preview image

Every page shares one image when its link is posted (LinkedIn, Slack, X, WhatsApp and so on): `public/og.png`.

1. Export a 1200×630 PNG (or JPEG) with no transparency, and keep the text inside the centre 630×630 square, since some apps crop to it. Keep it small: some apps skip images over a few hundred KB.
2. Replace `public/og.png` with it. If the size or format changed, update `ogImage` in `src/site.config.ts` to match, and rewrite its `alt` whenever the words in the image change.
3. Platforms keep a copy for days. To see the new one sooner, re-scrape a page in [LinkedIn's Post Inspector](https://www.linkedin.com/post-inspector/) and [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/).

### Change the favicon

Every browser tab, bookmark, home screen and installed app shows an icon drawn from `public/favicon.svg`.

1. Export a square SVG, 512×512, with a `viewBox`, so browsers can scale it down. Keep its background inside the drawing: tabs can be light or dark.
2. Replace `public/favicon.svg` with it.
3. Run `npm run icons`. It redraws `favicon.ico`, `apple-touch-icon.png` and the manifest's PNGs in `public/` from the SVG. Commit them with it.
4. If the drawing reaches further from the centre than the old one, check `public/icon-maskable-512.png`: Android may crop it to a circle 80% of its width. `MASKABLE_SCALE` at the top of `scripts/icons.mjs` shrinks the drawing to fit.

Browsers keep icons for a long time. To see the new one, open the site in a private window.

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
- A value you'll want to tune gets a name where it's used: a custom property at the top of the page's `<style>` (like `--cv-section-gap`), or an entry in `KNOBS` for the map's script. Add new ones there rather than as a bare number further down.
- To stagger an entrance, use `data-reveal style="--reveal-step: 2"`. The step number is its place in the queue.

### Old `/portfolio/` links

The site used to be served from `www.pmcf.xyz/portfolio/`, while the old site's repo (`freenandes.github.io`) held the domain, and links to those addresses were shared. GitHub Pages can't send server redirects, so `redirects` in `astro.config.mjs` builds a small page at each old address that forwards to the new one:

| Old | New |
| --- | --- |
| `/portfolio/` | `/` |
| `/portfolio/about/` | `/about/` |
| `/portfolio/projects/<slug>/` | `/projects/<slug>/` |

Each one is an instant meta refresh plus a canonical link, with no script, so the CSP is unaffected. Browsers follow it at once and search engines treat it as a permanent move, though it isn't a true 301. Anything after `?` or `#` in the old link is dropped. The case-study line covers every project, new ones included. If you rename a page or a project's file, add its old address to the list too.

## Website Specification

The site is audited against [The Website Specification](https://specification.website). [`SPEC-COMPLIANCE.md`](./SPEC-COMPLIANCE.md) lists what's done, what GitHub Pages provides and what's pending.

## To do

- [ ] Create the content based on [the list](notes/content-strategy.md) (local-only, `notes/` is git-ignored)
- [ ] Self-host the fonts (currently Google Fonts).

The last one is the Website Specification item that waits on assets; `SPEC-COMPLIANCE.md` → Pending has what it involves.
