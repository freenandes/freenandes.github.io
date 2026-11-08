# pmcf.xyz

Pedro MC Fernandes's portfolio. The home page is an interactive map that leads to an About page, which doubles as the printable CV, and to the case studies.

- Live at https://www.pmcf.xyz/, built from `main` of this repo. Every push to `main` deploys.
- A static site: Astro 7, MDX, TypeScript and plain CSS, on GitHub Pages.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:4321/, with live reload |
| `npm run build` | Encrypts locked case studies, then builds the site into `dist/` |
| `npm run preview` | Serves the last build |
| `npm run check` | Type and template errors |
| `npm run lint:css` | CSS lint (`npm run lint:css:fix` fixes what it can) |
| `npm run check:docs` | Fails if the docs or code comments name a file, command, knob or heading that no longer exists |
| `npm run visual` | Compares how this working tree looks with `origin/main` ([more](#check-you-havent-changed-the-look)) |
| `npm run encrypt` | Re-encrypts locked case studies (part of `build`) |
| `npm run email -- you@example.com` | Changes the contact email |
| `npm run icons` | Redraws the PNG and `.ico` icons from `public/favicon.svg` |
| `npm run og` | Redraws the link-preview image, `public/og.png` |

CI runs `lint:css`, `check:docs`, `check` and `build` on every pull request, and a push to `main` only deploys if all of them pass. Run them before you push.

## Setup

1. Install Node 22 (`.nvmrc` has the exact version CI uses). With Homebrew: `brew install node@22`, then add `/opt/homebrew/opt/node@22/bin` to your PATH.
2. In the project folder, run `npm install`, then `npm run dev`.

`npm run visual` and `npm run og` also need Google Chrome, or `CHROME_PATH` pointing at a Chrome binary.

### Claude Code cloud sessions

The cloud image has Node 22 and a Chromium the scripts find by themselves. In the cloud environment's settings (not in the repo):

- Setup script, which runs in the folder above the repo: `cd freenandes.github.io && npm ci --no-audit --no-fund`
- Environment variables, for shorter output: `ASTRO_TELEMETRY_DISABLED=1` and `NPM_CONFIG_UPDATE_NOTIFIER=false`
- Network: the default level is enough. Allow `www.pmcf.xyz` if sessions should check the live site.

No secrets are needed.

## How it works

- **Home map.** Markers for About, Contact and each case study, joined in one chain, among spinning rings and drawings on a contour texture. A physics simulation places them, so the layout changes on every load, and clicking the name at the centre reshuffles it. A click opens a marker's card; on a desktop, pointing at a case study also shows a preview of it. Touch screens open cards as popups. If the script fails, a plain list of the links takes the map's place.
- **About and CV.** Rendered from `src/content/cv.md`. "Download PDF" prints it with its own print styles.
- **Case studies.** One MDX file each, served at `/<file name>/`. Screenshots sit in galleries and open in an enlarged view that zooms and steps through every screenshot and video on the page.
- **Mini-map.** About and every case study end with the map's pages in one straight line, the current page filled in.
- **Locked case studies.** A case study can be locked: its text is encrypted at build time and decrypted in the reader's browser with a passphrase. None is locked right now.
- **Fonts.** Atkinson Hyperlegible Next and Mono, served from the site itself, not from Google Fonts.
- **Privacy and security.** A strict Content Security Policy allows no third-party scripts. The email address is obfuscated, so it never appears in the HTML or the repo. GoatCounter counts visits through a hidden image, with no script and no cookie, in deploy builds only.
- **Metadata.** Open Graph link previews (one image for every page), JSON-LD, a sitemap, `/robots.txt` and `/llms.txt`.
- **Old addresses.** Pages that moved still answer at their old addresses ([Old links](#old-links)).
- **Standards.** Audited against [The Website Specification](https://specification.website); `SPEC-COMPLIANCE.md` lists what's done and what's pending.

## Where things live

Each page owns its markup and styles. Values worth tuning are named knobs at the top of the file that uses them: shared ones in `tokens.css`, a page's own at the top of its `<style>`, and the map's layout in `KNOBS` at the top of its script.

| To change… | Open |
| --- | --- |
| Colours, type scale, spacing, motion | `src/styles/tokens.css` |
| How plain elements look everywhere (links, buttons, headings, lists, prose), shared print styles | `src/styles/global.css` |
| Name, role, links, availability, link-preview image, theme colour, extra contacts on the printed CV, visit counter | `src/site.config.ts` |
| `<head>`, metadata, CSP, page shell | `src/layouts/Base.astro` |
| Site URL, base path, fonts, redirects from old addresses | `astro.config.mjs` |
| Home: markers, card copy, preview alt text, the chain they connect in | `src/diagram.config.ts` |
| Home: look, and knobs for the texture, markers, cards, rings, previews, popups, drawings, sticker and ruler | the top of the `<style>` in `src/pages/index.astro` |
| Home: marker spacing, connector shapes, where cards open, entrance timing, physics | `KNOBS` and `SIM` at the top of `src/scripts/nav-diagram.ts` |
| Home: the drawings, the ruler, the portrait sticker, the case-study previews | `src/assets/decor/`, `src/assets/ruler.svg`, `src/assets/sticker.png`, `src/assets/previews/<marker id>.png` |
| About: look, print rules, and the `--cv-*` spacing knobs | `src/pages/about.astro` |
| About: content, and which fields it takes | `src/content/cv.md`, `src/content.config.ts` |
| Case study: text, images and videos | `src/content/projects/<slug>.mdx`, `src/assets/projects/<slug>/` |
| Case study: look, and which frontmatter fields it takes | `src/pages/[slug].astro`, `src/content.config.ts` |
| Galleries, the enlarged view, the passphrase gate (knobs at the top of each `<style>`) | `src/components/Gallery.astro`, `Lightbox.astro`, `PasswordGate.astro` |
| Mini-map, page nav, footer | `src/components/MiniMap.astro`, `PageNav.astro`, `Footer.astro` |
| Fonts | `src/assets/fonts/`, and `fonts` in `astro.config.mjs` |
| Favicon and app icons | `public/favicon.svg`, then `npm run icons` |
| Link-preview image | `scripts/og/card.html`, then `npm run og` |
| 404, `/llms.txt`, `/robots.txt`, manifest | `src/pages/` |
| CI and deploy | `.github/workflows/deploy.yml` |

## Common tasks

### Add a case study

1. Create `src/content/projects/<slug>.mdx`. The file name is the address, `/<slug>/`, so name it after the work. The build stops if it clashes with another page.

   ```mdx
   ---
   title: Project name
   description: One sentence, used on the page and in search results.
   date: 2024-06-01    # shows as 2024; or text shown as written, such as 2022–2026
   order: 1            # lower comes first; optional
   role: Lead Product Designer
   client: Company
   tags: ['Design Systems', 'Growth']
   draft: true         # hidden on the live site, shown in dev
   ---

   The write-up, in Markdown.
   ```

2. To put it on the map, add a node with `kind: 'project'` to `src/diagram.config.ts`, with the file name as its `id`, and add that `id` to `diagramChain`. The node holds the card copy and placement; the label, tags and link come from the frontmatter. Once it's on the map, it's on the mini-map too. The build stops if a node has no published case study or `diagramChain` names a missing node.
3. Remove `draft: true` to publish it.

Renaming the file moves the page: add the old name to `MOVED_PROJECTS` in `astro.config.mjs` so its old address keeps working.

### Add screenshots or a video

Put the files in `src/assets/projects/<slug>/` and import them in the MDX. Screenshots go in a `Gallery`; the text between its tags is the caption:

```mdx
import Gallery from '../../components/Gallery.astro';
import results from '../../assets/projects/<slug>/results.png';

<Gallery images={[{ src: results, alt: 'What the screenshot shows, numbers included' }]}>
  The caption.
</Gallery>
```

- Export every screenshot in a gallery at the same zoom, and pass it: `density={2}` for 2× exports (the default is 1).
- `scale={0.17}` shrinks the thumbnails of large screenshots, so a few still fit side by side.
- `narrow` keeps a gallery to the text's width.
- `fill` lays the images out as one row at the same height, in place of `scale`.

A video is a plain `<video>` in a `<figure>`, with a poster frame taken from the same moment of the master (`peak-systems-at-percona.mdx` has examples). A portrait video goes in `<figure class="inset">`, and one only sharp up to a size also takes `style="--inset-max: 28rem"`. Encode for a fixed quality, not a fixed bitrate, and keep each file well under GitHub's 100 MB limit; every committed version stays in the repo:

```bash
ffmpeg -i master.mp4 -vf "scale=out_range=tv:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -tune animation -crf 22 -level:v 5.2 -x264-params aq-mode=3 -an -movflags +faststart out.mp4
```

A lower `-crf` is sharper and bigger: 22 suits a short video, and a long, busy one can go to about 29 before text softens.

### Add a drawing to the map

1. Drop the SVG in `src/assets/decor/`; nothing else needs wiring. In the file, replace its colour with `fill="currentColor"` and turn `style` attributes into plain ones.
2. Give it a width at the top of the `<style>` in `src/pages/index.astro`, named after the file: `kraken.svg` takes `--decor-kraken`, and `--decor-kraken-wide` from 64rem (add that one to the wide media query below the knobs too). Without one, it takes its viewBox width times `--decor-scale`.

Each drawing gets a random free spot once the map settles. One with no room stays hidden, which for a big drawing can mean never on a phone.

### Lock a case study

1. Set `locked: true` in its MDX. The MDX body becomes the public teaser.
2. Put the full write-up in `src/protected/<slug>.md` (git-ignored).
3. Add `"<slug>": "the-passphrase"` to `src/protected/passwords.json` (copied from `passwords.example.json`), or set `LOCK_PASSWORD_<SLUG>`.
4. Run `npm run encrypt` and commit `public/locked/<slug>.json`.
5. Send the passphrase to whoever should read it.

The build fails if a published locked case study has no encrypted file, so a forgotten step can't ship a gate that never opens. What the encryption does and doesn't protect against: `src/protected/README.md`.

### Update the About page / CV

Edit `src/content/cv.md`, then check `/about/` with `npm run dev` and its Download PDF button.

- Jobs and recommendations go newest first. A job is `role`, `org`, `period`, an optional one-line `summary` and a list of `points`; `earlierWork` takes the same fields minus `points`.
- A recommendation is `name`, `role`, an optional `org`, a `date` shown as written, and the quote under `text: |`, without quotation marks. `print: false` keeps it off the PDF.
- `summary` is Markdown under `summary: |`, every line indented two spaces.
- Elsewhere, wrap a value that contains `: ` in double quotes, or the build fails.
- `skills` isn't shown on the page; search engines read it.

The site is the original: change the wording here, then paste it into LinkedIn.

### Change the contact email

Run `npm run email -- you@example.com`. It stores the address as an obfuscated token in `src/site.config.ts`; don't edit the token by hand.

### Change the link-preview image

Every page shares one image when its link is posted: `public/og.png`, drawn from `scripts/og/card.html` with the name and role from `src/site.config.ts`.

1. Change the words in `src/site.config.ts`, or the look in `scripts/og/card.html` (open it in a browser to see it; its knobs are at the top of its `<style>`).
2. Run `npm run og` and commit the PNG. It refuses to write if the font didn't load or text leaves the centre square, which some apps crop to. If the picture changes beyond the name and role, update `alt` in `ogImage` too.
3. Platforms cache previews for days. To refresh one sooner, re-scrape the page in [LinkedIn's Post Inspector](https://www.linkedin.com/post-inspector/) or [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/).

### Change the favicon

1. Replace `public/favicon.svg` with a square 512×512 SVG with a `viewBox`, its background inside the drawing.
2. Run `npm run icons` and commit what it redraws. If the drawing reaches further out than before, check `public/icon-maskable-512.png`: Android may crop it to a circle, and `MASKABLE_SCALE` in `scripts/icons.mjs` shrinks the drawing to fit.

Browsers cache icons for a long time; check in a private window.

### Update or change the fonts

The files are in `src/assets/fonts/`, one variable WOFF2 per style holding the Latin set, with their licences.

1. To update them, replace the four files under the same names. Google Fonts lists the current ones: open [Next's](https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800) and [Mono's](https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:ital,wght@0,200..800;1,200..800) stylesheets in a desktop browser and download the upright and italic files under `/* latin */`.
2. For a different font, change `name` and the file names under `fonts` in `astro.config.mjs`, and the `@font-face` in `scripts/og/card.html`.
3. Run `npm run visual` to see what moved, and `npm run og` if the preview image should follow.

A character outside the Latin set (such as ł or ș) shows in the fallback font. To cover those, add Google's `/* latin-ext */` files as more variants under `fonts`, each with its `unicodeRange`.

### Check you haven't changed the look

```bash
npm run visual                    # this working tree vs origin/main
npm run visual -- --base HEAD~1   # against another commit
npm run visual -- --only about    # only scenarios with "about" in the name
npm run visual -- --keep          # keep both builds in .visual/
```

It builds both versions, screenshots the same pages and states at desktop and phone sizes, and compares the pixels and the computed styles. Differences are saved as images in `.visual/` and the run exits `1`: something to review, not necessarily broken. The home map always varies a little; small differences there are reported as `drift`. The pages and states are in `scripts/visual/scenarios.mjs`.

## Old links

The site used to live at `www.pmcf.xyz/portfolio/`, and the case studies at `/projects/<old name>/`. GitHub Pages can't send redirects, so the build writes a small page at each old address that forwards to the new one (a meta refresh plus a canonical link, which search engines treat as a permanent move):

| Old | New |
| --- | --- |
| `/portfolio/`, `/portfolio/about/` | `/`, `/about/` |
| `/projects/percona-case-1/`, `/portfolio/projects/percona-case-1/` | `/peak-systems-at-percona/` |
| `/projects/percona-case-2/`, `/portfolio/projects/percona-case-2/` | `/reading-the-terrain-at-percona/` |
| `/projects/tui-case/`, `/portfolio/projects/tui-case/` | `/100000-pages-high-at-tui-group/` |

Renaming a page adds its old address to `redirects` in `astro.config.mjs`; renaming a case study's file adds its old name to `MOVED_PROJECTS` there.
