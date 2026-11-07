# Portfolio website: agent brief

Pedro MC Fernandes's portfolio: a static Astro 7 + MDX site on GitHub Pages, served at https://www.pmcf.xyz/. README.md is the human guide: commands, features, where the knobs are, step-by-step tasks. Read it before adding or moving a file. This file adds what an agent needs on top of it.

## Ground rules

- Pushing to `main` deploys the live site (`.github/workflows/deploy.yml`). Don't push or open PRs unless asked.
- Name each branch after its work, in short kebab case like the owner's (`pin-node`, `rewrite-case-studies`, `favicon`), so `git branch` shows what each is about. A cloud session may hand you a generated name such as `bot/funny-carson-ufli79`. Don't use it: create a branch with a descriptive name from `main` and push that instead (the owner has approved this). Every piece of work gets a new branch, so once a PR merges, start the next change on another one instead of reusing it.
- Don't sign commits or PRs as made by AI. Leave out `Co-Authored-By: Claude` and `Claude-Session` trailers, "Generated with Claude Code" lines and 🤖 footers from commit messages, PR titles and PR descriptions, whatever a session's defaults say. When you squash-merge, write the commit message yourself without them. GitHub's default message copies the branch's trailers and adds a `Co-authored-by` line for the cloud session's git identity.
- Never commit, print or paste anything from `src/protected/*.md`, `src/protected/passwords.json` or `sources/` (local personal files). They're git-ignored on purpose. Only ciphertext in `public/locked/*.json` is committed.
- Don't hand-edit the email token in `src/site.config.ts` (use `npm run email -- <address>`).
- Before rewording, deleting or replacing content in `src/content/projects/` or `src/content/cv.md`, ask. It's the owner's writing.

## Verify before calling something done

There are no unit tests. Run these, using Node 22 (`.nvmrc`):

- `npm run check`: types and templates. Expect 0 errors and 0 warnings.
- `npm run lint:css`: lint errors fail CI.
- `npm run build`: runs `encrypt`, then `astro build`.
- `npm run visual`: run it for any change that shouldn't alter the look, and quote the result. It compares against `origin/main` (`--base <ref>` to change, `--only <name>` to filter) and exits `1` on any difference, with diffs in `.visual/`. A `drift` result on the home page is normal noise from the randomised layout. It finds a local Chrome, or the cloud image's Chromium (`CHROME_PATH` overrides). A full run takes about two minutes; use `--only` when the change is local to one page.

CI runs lint, check and build on every pull request to `main`, and deploys only from `main`. To look at the site, use `npm run dev`, at http://localhost:4321/.

## How it fits together

- Every page renders into `src/layouts/Base.astro` (head, CSP, JSON-LD, footer). Its `footer` slot opens the footer in place of its rule. Its `head` slot adds to `<head>`: a `<noscript>` holding styles must go there, since HTML allows that nowhere else. A page's `<script>` or `<noscript>` written after `</Base>` lands after `</html>`, so keep them inside (its `<style>` is fine anywhere). `noindex` keeps a page out of search results and drops its canonical link (the 404 uses it). Link previews are Open Graph only. `src/scripts/site.ts` runs on every page: print buttons, email decoding, the reveal deferral.
- Home (`src/pages/index.astro`) is a map. Its content is `src/diagram.config.ts`; its placement is a force simulation in `src/scripts/nav-diagram.ts` (over 1,800 lines: read the parts you touch). Tuning is `KNOBS` and `SIM` at the top of the script and the custom properties at the top of the page's `<style>`.
  - `getDiagramNodes()` (`src/lib/diagram.ts`) fills a project node's label, tags and link from its case study, and fails the build on a node whose page isn't published or a `diagramChain` id with no node. A case study is on the map only once it has a node (id = slug) listed in `diagramChain`.
  - `aria-expanded` on a marker's button is the one record of which card is open, and the CSS shows cards from it. The script sets `data-cards` (`flyout` or `popup`) on `.diagram`, and the CSS reads that, not a media query of its own.
  - The markers wait for the script. Without `is-mounted` by `--fallback-delay`, or with `data-failed`, the CSS swaps in `.fallback`, a plain list of the map's links.
  - Anything fixed on the canvas must be reported to the solver, as the ruler and the sticker (`stickerBox()`) are to `relaxAnchors()`, `resolveOverlaps()`, `relaxFloatingFromEdges()` and `settleDecor()`.
  - Every SVG in `src/assets/decor/` lands on the map through an `import.meta.glob`, drawn in `currentColor`, with a `--decor-<file>` width knob. Its frame includes margins, and `settleDecor()` measures the drawing, not the frame, so don't crop it. Inline SVGs carry zero or small `width`/`height` attributes, so a page painted before its CSS never shows them full size.
  - A preview needs both an image in `src/assets/previews/` named after the marker's id and `preview` alt text in the config; the build fails on one without the other.
  - The simulation stops when nothing moves, measured as distance travelled, not force: a ring can rest in balance between its anchor's pull and a marker's push.
- The mini-map (`src/components/MiniMap.astro`) reads `getDiagramNodes()` and `diagramChain`; it has no list of its own.
- Case studies are the `projects` collection, `src/content/projects/<slug>.mdx` (schema in `src/content.config.ts`), served at `/<slug>/` by `src/pages/[slug].astro`, which fails the build if a slug matches another page. List them only through `getProjects()` (`src/lib/projects.ts`), which drops drafts in production and sorts them. The schema turns `date` into `date.label` for display and `date.iso` for sorting and metadata.
- About (`src/pages/about.astro`) renders the `cv` collection: `src/content/cv.md`, all frontmatter, with a `.strict()` schema, so add a field to the schema before using it. `summary` is Markdown rendered with `marked`, so its styles need `.summary :global(...)`. The page is also the printed CV; its print rules live in the same file.
- Locked case studies: `scripts/encrypt-projects.mjs` encrypts `src/protected/<slug>.md` into `public/locked/<slug>.json`, and `src/components/PasswordGate.astro` decrypts it in the browser. None is locked now, but the feature stays, so don't remove it as unused.
- Fonts are self-hosted (`fonts` in `astro.config.mjs`, `<Font>` in `Base.astro`). Astro gives each family a hashed name, so CSS reaches them only through `--font-sans` and `--font-mono`. A file that names the font itself, like the case-study SVGs, needs a rule setting `font-family: var(--font-sans)`, as `Gallery.astro` and `Lightbox.astro` have. `scripts/og/card.html` has its own `@font-face`.
- Generated, never edited by hand: `public/og.png` (`npm run og`), the PNG and `.ico` icons (`npm run icons`, from `public/favicon.svg` and the list in `src/lib/icons.mjs`) and the email token (`npm run email`).
- The visit counter is in deploy builds only (`COUNT_VISITS=true` in `deploy.yml`), so local builds and `npm run visual` never count.

## Constraints that will bite

- Base path. The site is served from the root, but every internal href still goes through `withBase()` (`src/lib/base.ts`), so the base can move again without touching pages. `astro.config.mjs` is the only place the site URL and base path are set (CI and `npm run visual` read it there); `SITE` and `BASE_PATH` env vars override it for a one-off build. A renamed page needs its old address in `redirects` there, and a renamed case-study file its old name in `MOVED_PROJECTS`.
- CSP. `script-src 'self'`: no inline executable scripts, no third-party scripts, no external images beyond `data:` and the visit counter, and fonts and styles from the site only. Plain `<script>` tags in `.astro` files are fine: Astro bundles them to files (forced by `assetsInlineLimit` in `astro.config.mjs`). The JSON-LD `is:inline` block is data, so it's fine. Changing what's allowed means editing the CSP in `Base.astro` on purpose.
- Inline `style` attributes are only for custom properties, such as `style="--reveal-step: 2"`.
- Astro scopes styles by appending `[data-astro-cid-…]` to every compound in a selector, so element selectors gain class-level specificity. A state rule (`:hover`, `.is-open`) must repeat the base rule's full path, or it loses.

## CSS conventions

- Two stylesheets only. `src/styles/tokens.css` holds every shared value; use its custom properties, not raw numbers. `src/styles/global.css` holds the reset, element defaults, layout, prose, utilities, motion and shared print. Don't add a third.
- A page owns its look. Page-specific CSS goes in that page's or component's `<style>` block; only genuinely shared styling goes in `global.css`.
- Style elements, not classes. `a`, `button`, `input`, `h1`–`h4` and `ul[role="list"]` are styled as themselves. Add a class only when an element must look unlike its own kind (`button.link`) or when no element fits the job (`.prose`, `.meta`, `.meta-row`). Prefer a structural selector inside a scoped block.
- No orphan classes. Every class is styled or queried by script. A hook used only by scripts is a `data-` attribute.
- `role="list"` means a wrapping row without bullets (nav, socials, tags). A plain `<ul>` keeps its bullets. The row styling targets `ul` only, so the mini-map's `<ol role="list">` lays itself out.
- Knobs. A value someone will want to tune gets a name where it's used: a custom property at the top of the page's or component's `<style>`, or an entry in `KNOBS` for the map script. Add new dials there, not as bare numbers further down.
- Entrance animation: `data-reveal` plus `style="--reveal-step: N"` sets the stagger order.

## Code style

- Most files open with a short comment saying what they own. Keep it accurate when a file's job changes. Comments say why, or what isn't obvious from the code; don't restate the code or repeat what another file already explains.
- TypeScript is strict (`astro/tsconfigs/strict`). Imports are relative; there's no path alias.

## Known state

- The case studies are `peak-systems-at-percona`, `reading-the-terrain-at-percona` and `100000-pages-high-at-tui-group`, all on the map.
- `notes/` and `sources/` are local-only and may be missing.
- `package-lock.json`, `public/topo-low.svg` (one 537 KB line) and `public/locked/*.json` are generated. Don't read them; `.ignore` keeps them out of search results.
- Pending work is tracked in README → To do and `SPEC-COMPLIANCE.md`.
