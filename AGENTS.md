# Portfolio website: agent brief

Pedro MC Fernandes's portfolio: a static Astro 5 + MDX site on GitHub Pages, served at https://www.pmcf.xyz/portfolio/ while in development (the old site keeps www.pmcf.xyz until launch; see README → Launching at www.pmcf.xyz). README.md is the human guide, with the commands, a "Where things live" table and step-by-step tasks. Read it before adding or moving a file. This file covers what an agent needs on top of that.

## Ground rules

- Pushing to `main` deploys the live site (`.github/workflows/deploy.yml`). Don't push or open PRs unless asked.
- Never commit, print or paste anything from `src/protected/*.md`, `src/protected/passwords.json` or `sources/` (local personal files). They're git-ignored on purpose. Only ciphertext in `public/locked/*.json` is committed.
- Don't hand-edit the email token in `src/site.config.ts` (use `npm run email -- <address>`).
- Before rewording, deleting or replacing content in `src/content/projects/` or `src/content/cv.md`, ask. It's the owner's writing.

## Verify before calling something done

There are no unit tests. Run these, using Node 22 (`.nvmrc`):

- `npm run check`: types and templates. Expect 0 errors and 0 warnings. CI doesn't run it, so you must.
- `npm run lint:css`: CI fails the deploy on lint errors.
- `npm run build`: runs `encrypt`, then `astro build`.
- `npm run visual`: run it for any change that shouldn't alter the look, and quote the result. It compares against `origin/main` (`--base <ref>` to change, `--only <name>` to filter) and exits `1` on any difference, with diffs in `.visual/`. A `drift` result on the home page is normal noise from the randomised layout. It needs a local Chrome (`CHROME_PATH` to override).

To look at the site, use `npm run dev`. Pages are at http://localhost:4321/portfolio/, not at the root.

## How it fits together

- Every page renders into `src/layouts/Base.astro` (head, CSP, JSON-LD, footer).
- Home (`src/pages/index.astro`) is a map. Its content (markers, card copy, connections) is `src/diagram.config.ts`, and its placement is a randomised force simulation in `src/scripts/nav-diagram.ts` (about 1,300 lines; read before touching). A new case study isn't on the map until it has a node there and its id is in `diagramChain`.
- Case studies are the `projects` content collection: `src/content/projects/<slug>.mdx`, with the schema in `src/content.config.ts`. The file name is the URL slug. List them only through `getProjects()` (`src/lib/projects.ts`), which drops `draft: true` in production and sorts by `order`, then newest. The same list feeds `/projects/<slug>/`, `/llms.txt` and the sitemap.
- About (`src/pages/about.astro`) is also the printable CV, with its own print stylesheet. It renders the single-entry `cv` collection: `src/content/cv.md`, hand-edited, with experience, education, skills and languages as frontmatter and the summary as the Markdown body. The schema in `src/content.config.ts` is `.strict()`, so a new field must be added there before it's used. The summary's Markdown isn't scoped to the page, so its styles use `.summary :global(...)`. There is no LinkedIn sync any more; the portfolio is the source and LinkedIn is updated by hand from it.
- Locked projects: the MDX body is the public teaser. `scripts/encrypt-projects.mjs` encrypts `src/protected/<slug>.md` into `public/locked/<slug>.json`, and `src/components/PasswordGate.astro` decrypts it client-side and renders it with `marked`. The demo project `halcyon` uses the passphrase `soft-club`. Without plaintext sources, encrypt leaves existing ciphertext alone.
- Site-wide facts (name, role, socials, OG image) are in `src/site.config.ts`. `src/scripts/site.ts` runs on every page: print buttons, email decoding, reveal-on-print.

## Constraints that will bite

- Base path. The site is served from `/portfolio/` until launch, when it moves to `/`. Every internal href goes through `withBase()` from `src/lib/base.ts`, or the link breaks in production. `SITE` and `BASE_PATH` env vars override the defaults in `astro.config.mjs`.
- CSP. `script-src 'self'`: no inline executable scripts, no third-party scripts, no external images beyond `data:`. Plain `<script>` tags in `.astro` files are fine, because Astro bundles them to files (forced by `assetsInlineLimit` in `astro.config.mjs`). The JSON-LD `is:inline` block is data, so it's fine. Changing what's allowed means editing the CSP in `Base.astro` on purpose.
- Inline `style` attributes are only for custom properties, such as `style="--reveal-step: 2"`.
- Astro scopes styles by appending `[data-astro-cid-…]` to every compound in a selector, so element selectors gain class-level specificity. A state rule (`:hover`, `.is-open`) must repeat the base rule's full path, or it loses.

## CSS conventions

- Two stylesheets only. `src/styles/tokens.css` holds every value; use its custom properties, not raw numbers. `src/styles/global.css` holds the reset, element defaults, layout, prose, utilities, motion and shared print. Don't add a third.
- A page owns its look. Page-specific CSS goes in that page's or component's `<style>` block. Only genuinely shared styling goes in `global.css`. About-specific print rules live in `about.astro`.
- Style elements, not classes. `a`, `button`, `input`, `h1`–`h4` and `ul[role="list"]` are styled as themselves. Add a class only when an element must look unlike its own kind (`button.link`) or when no element fits the job (`.prose`, `.meta`, `.meta-row`). Prefer a structural selector inside a scoped block.
- No orphan classes. Every class is styled or queried by script. A hook used only by scripts is a `data-` attribute.
- `role="list"` means a wrapping row without bullets (nav, socials, tags). A plain `<ul>` keeps its bullets.
- Entrance animation: `data-reveal` plus `style="--reveal-step: N"` sets the stagger order.

## Code style

- Most files open with a short comment saying what they own. Keep it accurate when a file's job changes, and match the surrounding comment density.
- TypeScript is strict (`astro/tsconfigs/strict`). The `@/*` alias points at `src/*`, but existing code uses relative imports; follow that.

## Known state

- `atlas-design-system`, `field-notes` and `helio-banking` are placeholder projects (fictional clients, `example.com` links). They aren't on the map, but they still publish as pages, in `/llms.txt` and in the sitemap. The real case studies are `percona`, `design-at-scale`, `visionary`, and the locked demo `halcyon`.
- `notes/` and `sources/` are local-only and may be missing.
- `archive/` holds unused assets that the site doesn't reference.
- Pending work (OG image, raster icons, self-hosted fonts) is tracked in README → To do and `SPEC-COMPLIANCE.md`.
