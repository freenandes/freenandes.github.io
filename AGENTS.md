# Portfolio website: agent brief

Pedro MC Fernandes's portfolio: a static Astro 7 + MDX site on GitHub Pages, served at https://www.pmcf.xyz/. It used to sit under `/portfolio/`, and those addresses forward to the root (see README → Old `/portfolio/` links). README.md is the human guide, with the commands, a "Where things live" table and step-by-step tasks. Read it before adding or moving a file. This file covers what an agent needs on top of that.

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

CI (`.github/workflows/deploy.yml`) runs lint, check and build on every pull request to `main`, and deploys only from `main`.

To look at the site, use `npm run dev`, at http://localhost:4321/.

## How it fits together

- Every page renders into `src/layouts/Base.astro` (head, CSP, JSON-LD, footer). A page's `footer` slot opens the footer in place of its rule.
- Home (`src/pages/index.astro`) is a map. Its content (markers, card copy, connections) is `src/diagram.config.ts`, and its placement is a randomised force simulation in `src/scripts/nav-diagram.ts` (about 1,300 lines; read before touching). Its tuning values are `KNOBS` and `SIM` at the top; the rest is the solver. A new case study isn't on the map until it has a node there, with the project's slug as its id, and that id is in `diagramChain`. A project node holds only its card copy and placement: `getDiagramNodes()` (`src/lib/diagram.ts`) fills in the label, tags and link from the project, while `description` stays separate from the card. It also fails the build if a node links to a page that isn't published, a project node has no published project, or `diagramChain` names an id no node has.
- About's and every case study's footer opens with a mini-map (`src/components/MiniMap.astro`, through that slot), whose line stands in for the footer's rule: the map's pages pulled into one static, straight line. It's a row when it has 30rem or more and a column below that (a container query). In the row each stop is as wide as its label, and the labels spread from one text edge to the other with equal gaps; the line runs edge to edge, and the end stops cover what lies beyond their markers with paper. It reads `getDiagramNodes()` and `diagramChain`, so it follows the map without its own list. The stops are About and each project on the map. The page it's on stays a link, carries `aria-current="page"` and is filled in ink. The name at the map's centre is left out, because the page nav (`src/components/PageNav.astro`) stays pinned and always links back to the map. The contact card and the floating rings have no page, so they're left out too; the footer carries the contact links.
- The flag (`src/assets/decor/flag.svg`) is imported as a component, so Astro inlines it. It's drawn in `currentColor` and takes the `color` around it, so recolour it with CSS, not by editing the file. Its square 306×306 frame is part of the asset, with the drawing's margins inside it, so size it as a square and don't crop it. The page nav carries it at the far end of the row as a second link to the map, with its size and stroke weight in the knobs at the top of that component's `<style>`.
- Every SVG in `src/assets/decor/` also lands on the map, through an `import.meta.glob` in `index.astro`, so a new one needs no wiring. Each must be drawn in `currentColor`. They render as `.decor`, on the texture's layer, under the connectors and rings, in `--ink-decor`. Each has its own width knob at the top of that page's `<style>`, named after its file (`--decor-kraken`); one without takes its viewBox width times `--decor-scale`. `settleDecor()` in `nav-diagram.ts` runs when a new layout comes to rest and gives each a random spot with its drawing, not its frame, clear of every marker, ring, connector and other decoration. They belong to the texture, not the simulation: one stays exactly where it is until a reshuffle or resize runs into it, and one with no room stays hidden.
- The ruler (`src/assets/ruler.svg`, `.ruler` in `index.astro`) is the map's scale, so it lives outside `src/assets/decor/` and never gets a random spot. It keeps to the bottom right corner on the drawings' layer, in `--ink-decor`, at `--ruler-height`. `inset()` widens the map's bottom margin to hold the markers clear of it, `relaxFloatingFromEdges()` keeps rings above it, and `settleDecor()` treats it as one more thing for the drawings to avoid.
- The simulation stops once nothing is really moving: `frame()` measures distance travelled, not forces, because a ring can rest in balance away from its anchor while feeling both its anchor's pull and a marker's push. Settling therefore leaves rings' anchors and velocities alone. Markers left too close glide apart to new anchors rather than jump.
- Case studies are the `projects` content collection: `src/content/projects/<slug>.mdx`, with the schema in `src/content.config.ts`. The file name is the URL slug. List them only through `getProjects()` (`src/lib/projects.ts`), which drops `draft: true` in production and sorts by `order`, then newest. The same list feeds `/projects/<slug>/`, `/llms.txt` and the sitemap. `date` is a real date, shown as its year, or text with a year in it, shown as written ("2022–2026"). Either way the schema turns it into `date.label` for display and `date.iso` for sorting and metadata.
- About (`src/pages/about.astro`) is also the printable CV, with its own print stylesheet. It renders the single-entry `cv` collection: `src/content/cv.md`, hand-edited, all frontmatter in page order (location and languages, shown as one `.meta` line under the name; headline; summary; experience; earlierWork; education; then skills, used only in JSON-LD). `summary` is a Markdown block scalar rendered with `marked` at build time; the file has no body. The schema in `src/content.config.ts` is `.strict()`, so a new field must be added there before it's used. The summary's Markdown isn't scoped to the page, so its styles use `.summary :global(...)`. There is no LinkedIn sync any more; the portfolio is the source and LinkedIn is updated by hand from it.
- Locked projects: the MDX body is the public teaser. `scripts/encrypt-projects.mjs` encrypts `src/protected/<slug>.md` into `public/locked/<slug>.json`, and `src/components/PasswordGate.astro` decrypts it client-side and renders it with `marked`. Without plaintext sources, encrypt leaves existing ciphertext alone. No project is locked right now, but the feature stays for later, so don't remove it as unused.
- Site-wide facts (name, role, availability, socials, OG image) are in `src/site.config.ts`. `src/scripts/site.ts` runs on every page: print buttons, email decoding, reveal-on-print.

## Constraints that will bite

- Base path. The site is served from the root (`/`), but every internal href still goes through `withBase()` from `src/lib/base.ts`, so the base can move again without touching pages. `astro.config.mjs` is the only place the site URL and base path are set (CI and `npm run visual` read it from there); `SITE` and `BASE_PATH` env vars override it for a one-off build. `redirects` there forwards the old `/portfolio/` addresses to the root; a renamed page or project file needs its old address added too. `npm run visual` serves both builds at the working tree's base, so to compare across a base-path change, run it with `BASE_PATH` set to one value for both.
- CSP. `script-src 'self'`: no inline executable scripts, no third-party scripts, no external images beyond `data:`. Plain `<script>` tags in `.astro` files are fine, because Astro bundles them to files (forced by `assetsInlineLimit` in `astro.config.mjs`). The JSON-LD `is:inline` block is data, so it's fine. Changing what's allowed means editing the CSP in `Base.astro` on purpose.
- Inline `style` attributes are only for custom properties, such as `style="--reveal-step: 2"`.
- Astro scopes styles by appending `[data-astro-cid-…]` to every compound in a selector, so element selectors gain class-level specificity. A state rule (`:hover`, `.is-open`) must repeat the base rule's full path, or it loses.

## CSS conventions

- Two stylesheets only. `src/styles/tokens.css` holds every shared value; use its custom properties, not raw numbers. `src/styles/global.css` holds the reset, element defaults, layout, prose, utilities, motion and shared print. Don't add a third.
- A page owns its look. Page-specific CSS goes in that page's or component's `<style>` block. Only genuinely shared styling goes in `global.css`. About-specific print rules live in `about.astro`.
- Style elements, not classes. `a`, `button`, `input`, `h1`–`h4` and `ul[role="list"]` are styled as themselves. Add a class only when an element must look unlike its own kind (`button.link`) or when no element fits the job (`.prose`, `.meta`, `.meta-row`). Prefer a structural selector inside a scoped block.
- No orphan classes. Every class is styled or queried by script. A hook used only by scripts is a `data-` attribute.
- `role="list"` means a wrapping row without bullets (nav, socials, tags). A plain `<ul>` keeps its bullets. The row styling targets `ul` only, so the mini-map's `<ol role="list">` lays itself out.
- Knobs. A value someone will want to tune gets a name where it's used: a custom property at the top of the page's `<style>` (the map's in `index.astro`, the mini-map's in `MiniMap.astro`, the CV's `--cv-*` in `about.astro`), or an entry in `KNOBS` for the map script. Add new dials there, not as bare numbers further down.
- Entrance animation: `data-reveal` plus `style="--reveal-step: N"` sets the stagger order.

## Code style

- Most files open with a short comment saying what they own. Keep it accurate when a file's job changes, and match the surrounding comment density.
- TypeScript is strict (`astro/tsconfigs/strict`). Imports are relative; there's no path alias.

## Known state

- The case studies are `percona-case-1`, `percona-case-2` and `tui-case`, all on the map.
- `notes/` and `sources/` are local-only and may be missing.
- `package-lock.json`, `public/topo-low.svg` (one 537 KB line) and `public/locked/*.json` are generated. Don't read them; `.ignore` keeps them out of search results.
- Pending work (raster icons, self-hosted fonts) is tracked in README → To do and `SPEC-COMPLIANCE.md`.
