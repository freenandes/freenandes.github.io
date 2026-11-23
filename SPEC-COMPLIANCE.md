# Website Specification — compliance & to-do

Audited against [The Website Specification](https://specification.website) (`required` +
`recommended` tiers). This tracks what the site satisfies and what is still **pending**, grouped
by *why* it can't be done yet so the blockers are explicit. When a pending item lands, move it up to
"Implemented".

Legend: ✅ done · 🟙 platform-provided · ⏳ pending · ➖ not applicable

---

## ✅ Implemented

| Spec | Category | Notes |
| --- | --- | --- |
| `<meta name="color-scheme">` | foundations | Declared `light` (the site is intentionally light-only) to stop dark-UA form/scrollbar mismatches. |
| Open Graph protocol | foundations | `og:site_name`, `og:locale`, per-page `og:type` (`website`/`profile`/`article`), title, description, URL and image with `og:image:alt`. No `twitter:*` tags: X falls back to Open Graph, though without `twitter:card` it may draw a small summary card rather than a large image. |
| Open Graph image | foundations | `public/og.png` (and `public/og-ux-audit.png` for the UX audit page): 1200×630 (1.91:1), opaque, small, text inside the centre square for apps that crop. Absolute HTTPS URL with `og:image:type`, `og:image:width` and `og:image:height`, so platforms draw the card on the first share. Set in `src/site.config.ts`. |
| Web app manifest | resilience | Generated at `/manifest.webmanifest` (base-aware) and linked from `<head>`. |
| Favicons & app icons | foundations / resilience | `public/favicon.svg` (512×512) plus what `npm run icons` draws from it: `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180×180, opaque), and 192 and 512 PNGs and a 512 **maskable** PNG in the manifest. The `.ico` link claims `sizes="32x32"` so Chrome picks the SVG. One list in `src/lib/icons.mjs` feeds the script, `<head>` and the manifest. |
| Structured data (JSON-LD) | seo / agent-readiness | `@graph` with `WebSite` + `Person` site-wide, `ProfilePage` on About, `CreativeWork` per project, `WebPage` and `Service` with an `OfferCatalog` of priced `Offer`s on the UX audit page, and `BreadcrumbList` on sub-pages. |
| Meta robots | seo | None on indexable pages, since indexing is the default. The 404 says `noindex` and has no canonical link, because it's served at whatever address went missing. |
| robots.txt | seo | Generated: allows every crawler and points to the sitemap. |
| `/llms.txt` | agent-readiness | Curated markdown index of pages + case studies. |
| Content Security Policy | security | Delivered via `<meta http-equiv>`: strict `script-src 'self'` with **no** inline-script allowance (every bundled script is emitted as its own file — see `assetsInlineLimit` in `astro.config.mjs`); `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`, and fonts and stylesheets from the site only. |
| Referrer-Policy | security | `strict-origin-when-cross-origin` via `<meta name="referrer">`. |
| Colour contrast | accessibility | The lightest text, `--ink-3`, meets WCAG AA (4.5:1) on `--paper` and `--paper-2`. The fainter `--ink-faint` is only for decoration and disabled controls. |
| Custom error page (404) | resilience | `/404.html` with plain-language copy and routes back into the site, kept out of search results. A miss that looks like the UX audit page's address is forwarded there by script, with its own note. |
| Graceful degradation | resilience | Reveal animations run off CSS alone and play to completion without a script. Below the fold, `src/scripts/site.ts` holds them until the reader arrives, and every held block has two ways out: its top passing a line near the bottom of the window, or the end of the page coming into view (the last stretch of a page can't scroll up to that line). `npm run browsers` fails a page that leaves one held. A `<noscript>` style block in the `<head>` switches the motion off entirely when scripting is unavailable, and on the home page lays the map out as a list. On the home map, whose markers wait for its script, a plain list of the map's links replaces them if the script fails to load or throws. |
| Case-study video weight | performance | A case study's videos load nothing with the page (`preload="none"`) and fetch only their length as the reader nears them, and their posters, which a browser fetches with the page, are WebPs no wider than they show (`src/components/Video.astro`). |
| Scrollbar gutter | performance | `scrollbar-gutter: stable` to remove cross-page horizontal shift. |
| Self-hosted web fonts | performance / security / privacy | Atkinson Hyperlegible Next and Mono, one variable WOFF2 per style holding the Latin set, served from the site (`src/assets/fonts/`, licences beside them). Astro writes the `@font-face` rules with `font-display: swap`, preloads the two upright files, and gives each family a fallback sized to its metrics. No request goes to Google, so visitors' addresses don't either, and the CSP allows fonts and styles from `'self'` only. |
| Landmarks | accessibility | Every page has a `<main>`. About and the case studies label their two `<nav>`s: the pinned page nav ("Main") and the mini-map ("Pages"). The home map is itself a `<nav>`. |
| Text alternatives on the map | accessibility | The floating rings' words reach screen readers as plain text. The name at the centre, the portrait sticker and the sketchbook, which open the map's videos, are buttons announced as opening a dialog (`aria-haspopup`, `aria-expanded`); the sticker's and the sketchbook's labels say what they open, and the name's description does. Without scripting, the sticker and the sketchbook are disabled, so no button sits there doing nothing. A video's window closes on Escape wherever focus is, except inside the video's own controls in Chrome, which keep every key (Tab on from there reaches its close button), and before an open card on the map, which the next Escape closes. |
| Video-only media | accessibility | The case-study videos are silent (encoded without sound), so they need no captions. Each sits in a `<figure>` whose caption says what it shows, with a poster frame. The two videos on the home map have sound: see Pending. |
| Media that never plays by itself | accessibility | The videos on the home map wait for a click on their play button, which covers the video, and stop when their window closes or the page is left. One window opens at a time, so two never play together. |

---

## 🟙 Provided by the platform (GitHub Pages)

These are satisfied by hosting and need no code, but are **not configurable** from this repo:

- **HTTPS/TLS** (with "Enforce HTTPS" on the custom domain), **HTTP/2**, **gzip compression**,
  **Cache-Control** (10 minutes for every file), **ETag / Last-Modified / 304** and
  **`X-Content-Type-Options: nosniff`**.
- **XML sitemap** is generated by `@astrojs/sitemap` (`/sitemap-index.xml`), each page dated
  by the last commit that touched its words (`lastModified()` in `astro.config.mjs`).
- **Stable URLs / SSR**: the site is fully static-rendered, so all content and metadata ship in
  the initial HTML.

---

## ⏳ Pending — needs custom HTTP headers or DNS

GitHub Pages can't send custom response headers, which blocks most of these until the site sits
behind something that can set them (Cloudflare, a reverse proxy, etc.).

- **Clickjacking protection** (`Content-Security-Policy: frame-ancestors` / `X-Frame-Options`):
  header-only — `frame-ancestors` is ignored when delivered via `<meta>`.
- **HSTS** (the `github.io` preload entry doesn't cover the custom domain), **Permissions-Policy**,
  **Referrer-Policy (header form)**, **CSP via header** (stronger than the meta one in place), and
  long cache lifetimes for the hashed files in `/_astro/`: all header-only.
- **DNS CAA records** for `pmcf.xyz`, set at the DNS provider.
- **Cookie attributes**: no cookies are set today, so there's nothing to harden yet.

---

## ⏳ Pending — needs the owner's words

- **Captions for the videos on the home map** (`src/assets/intro-video.mp4`,
  `src/assets/sketchbook-video.mp4`): they're speech, so WCAG 1.2.2 (level A) asks for
  captions. They're in place, `src/assets/intro-video.vtt` and `src/assets/sketchbook-video.vtt`
  in a `<track kind="captions">` in `src/components/VideoWindow.astro`, but drafted by a machine
  (whisper.cpp), which can misquote a video: each counts once the owner has checked it.

---

## ➖ Not applicable (no qualifying content today)

Re-evaluate if the site grows to include these:

- **Accessible data tables** (no tables), **feed discovery/hygiene** (no RSS/Atom feed), **breadcrumb UI**
  (single-level depth; JSON-LD breadcrumbs are present).
- **Privacy policy / cookie consent / GPC**: the site sets no cookies and stores nothing in the
  browser. Visits are counted by GoatCounter (`src/scripts/count.ts`): it gets the page, the
  referring site's origin (never the page on it), a source or campaign tag (`ref`,
  `utm_source`, `utm_campaign`; no other query parameter), the screen width, and clicks on the
  email address, outbound links, print, the map's cards and its videos. It sees the browser and the country
  from the request and keeps no IP address. Without scripting, a hidden image sends the page
  alone. None of this identifies a person, so no consent banner is needed.
- **Internationalisation** (hreflang, RTL, language switcher, locale formatting, plural rules):
  the site is single-language (`en`). `<html lang>` and `og:locale` are set.
- **Form labels/errors, mobile input types**: the only form is the passphrase gate, which already
  has an associated `<label>` and an `role="alert"` error region.
- **`/.well-known/security.txt`**: removed as unneeded; add one if a security contact is wanted.

---

_Last reviewed: 2026-11 against the `required` and `recommended` tiers._
