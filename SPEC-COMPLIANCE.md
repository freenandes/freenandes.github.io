# Website Specification — compliance & to-do

Audited against [The Website Specification](https://specification.website) (`required` +
`recommended` tiers). This tracks what the site satisfies and what is still **pending**, grouped
by *why* it can't be done yet so the blockers are explicit. Anything that waits on work or assets
also goes on the checklist in README → To do; tick it off there and move it up here when it lands.

Legend: ✅ done · 🟙 platform-provided · ⏳ pending · ➖ not applicable

---

## ✅ Implemented

| Spec | Category | Notes |
| --- | --- | --- |
| `<meta name="color-scheme">` | foundations | Declared `light` (the site is intentionally light-only) to stop dark-UA form/scrollbar mismatches. |
| Open Graph protocol | foundations | `og:site_name`, `og:locale`, per-page `og:type` (`website`/`profile`/`article`), title, description, URL and image with `og:image:alt`. No `twitter:*` tags: X falls back to Open Graph, though without `twitter:card` it may draw a small summary card rather than a large image. |
| Open Graph image | foundations | `public/og.png`: 1200×630 (1.91:1), opaque, 85 KB, text inside the centre square for apps that crop. Absolute HTTPS URL with `og:image:type`, `og:image:width` and `og:image:height`, so platforms draw the card on the first share. Set in `src/site.config.ts`. |
| Web app manifest | resilience | Generated at `/manifest.webmanifest` (base-aware) and linked from `<head>`. |
| Favicons & app icons | foundations / resilience | `public/favicon.svg` (512×512) plus what `npm run icons` draws from it: `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180×180, opaque), and 192 and 512 PNGs and a 512 **maskable** PNG in the manifest. The `.ico` link claims `sizes="32x32"` so Chrome picks the SVG. One list in `src/lib/icons.mjs` feeds the script, `<head>` and the manifest. |
| Structured data (JSON-LD) | seo / agent-readiness | `@graph` with `WebSite` + `Person` site-wide, `ProfilePage` on About, `CreativeWork` per project, and `BreadcrumbList` on sub-pages. |
| Meta robots | seo | None on indexable pages, since indexing is the default. The 404 says `noindex` and has no canonical link, because it's served at whatever address went missing. |
| robots.txt | seo | Generated: allows every crawler and points to the sitemap, which is how crawlers find it (there's no `<link rel="sitemap">`, which isn't a standard link type). |
| `/llms.txt` | agent-readiness | Curated markdown index of pages + case studies. |
| Content Security Policy | security | Delivered via `<meta http-equiv>`: strict `script-src 'self'` with **no** inline-script allowance (every bundled script is emitted as its own file — see `assetsInlineLimit` in `astro.config.mjs`); `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`, and fonts and stylesheets from the site only. |
| Referrer-Policy | security | `strict-origin-when-cross-origin` via `<meta name="referrer">`. |
| Colour contrast | accessibility | Tertiary text token darkened `#aaa → #6f6f6f` (≈5:1 on paper, WCAG AA). Decorative-only ink kept faint via a separate `--ink-faint`. |
| Custom error page (404) | resilience | `/404.html` with plain-language copy and routes back into the site, kept out of search results. |
| Graceful degradation | resilience | Reveal animations run off CSS alone and always play to completion, so content never depends on JS to appear; a `<noscript>` style block in the `<head>` switches the motion off entirely when scripting is unavailable, and on the home page lays the map out as a list. On the home map, whose markers wait for its script, a plain list of the map's links replaces them if the script fails to load or throws. |
| Scrollbar gutter | performance | `scrollbar-gutter: stable` to remove cross-page horizontal shift. |
| Self-hosted web fonts | performance / security / privacy | Atkinson Hyperlegible Next and Mono, one variable WOFF2 per style holding the Latin set, served from the site (`src/assets/fonts/`, licences beside them). Astro writes the `@font-face` rules with `font-display: swap`, preloads the two upright files, and gives each family a fallback sized to its metrics. No request goes to Google, so visitors' addresses don't either, and the CSP allows fonts and styles from `'self'` only. |
| Landmarks | accessibility | Every page has a `<main>`. About and the case studies label their two `<nav>`s: the pinned page nav ("Main") and the mini-map ("Pages"). The home map is itself a `<nav>`. |
| Text alternatives on the map | accessibility | The floating rings' words are drawn along a path for the eye and given to screen readers as plain text. The name at the centre, which reshuffles the map instead of opening a card, says so in a tooltip (`title`), which screen readers read as its description. |
| Video-only media | accessibility | The case-study videos are silent (encoded without sound), so they need no captions. Each sits in a `<figure>` whose caption says what it shows, with a poster frame. |

---

## 🟙 Provided by the platform (GitHub Pages)

These are satisfied by hosting and need no code, but are **not configurable** from this repo:

- **HTTPS/TLS** (with "Enforce HTTPS" on the custom domain), **HTTP/2**, **compression**
  (gzip/brotli), **Cache-Control**, **ETag / Last-Modified / 304** and
  **`X-Content-Type-Options: nosniff`**.
- Not **HSTS**: the `github.io` entry on the HSTS preload list covers `*.github.io` only, and the
  site is served from the custom domain `www.pmcf.xyz`. See the header-only items below.
- **XML sitemap** is generated by `@astrojs/sitemap` (`/sitemap-index.xml`).
- **Stable URLs / SSR**: the site is fully static-rendered, so all content and metadata ship in
  the initial HTML.

> At launch on `www.pmcf.xyz/`, revisit HSTS (it needs a host or CDN that can send headers) and
> DNS **CAA** records for `pmcf.xyz`.

---

## ⏳ Pending — needs custom HTTP headers

GitHub Pages can't send custom response headers, which blocks the items below until the site sits
behind something that can set headers (Cloudflare, a reverse proxy, etc.).

- **Clickjacking protection** (`Content-Security-Policy: frame-ancestors` / `X-Frame-Options`):
  header-only — `frame-ancestors` is ignored when delivered via `<meta>`.
- **HSTS**, **Permissions-Policy**, **Referrer-Policy (header form)**, **CSP via header** (the
  meta CSP is in place; a header version is strictly stronger): all header-only.
- **Cookie attributes**: no cookies are set today, so there's nothing to harden yet.

---

## ➖ Not applicable (no qualifying content today)

Re-evaluate if the site grows to include these:

- **Captions/transcripts** (the videos have no sound; see Video-only media above), **accessible data tables** (no tables),
  **feed discovery/hygiene** (no RSS/Atom feed), **breadcrumb UI** (single-level depth; JSON-LD
  breadcrumbs are present).
- **Privacy policy / cookie consent / GPC**: the site sets no cookies and stores nothing in the
  browser. Visits are counted by GoatCounter through a hidden image with no script: it sees the
  page, the browser and the country from that one request, and keeps no IP address. Add a
  privacy policy if the site ever collects more.
- **Internationalisation** (hreflang, RTL, language switcher, locale formatting, plural rules):
  the site is single-language (`en`). `<html lang>` and `og:locale` are set.
- **Form labels/errors, mobile input types**: the only form is the passphrase gate, which already
  has an associated `<label>` and an `role="alert"` error region.
- **`/.well-known/security.txt`**: added in the compliance pass, then removed as unneeded
  (commit `feeced0`). Now that the site is at the domain root one would be read; add it back if
  a security contact is wanted.

---

_Last reviewed: 2026-11 against the `required` and `recommended` tiers._
