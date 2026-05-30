# Portfolio

A minimal, design-engineer-friendly portfolio built with **Astro**. Plain HTML
that looks like HTML, plain CSS driven by **design tokens**, and content written
in **Markdown / MDX**. No framework opinions to fight.

Aesthetic: sober *form-follows-function* layout with a **Gen X Soft Club**
softness (muted pastel washes, gentle depth) and a nod to **The Designers
Republic** (technical mono labels, registration marks, grids, numbering).

## Features

- **Home** — a short, editable intro and a grid of project cards.
- **Project detail** — Markdown/MDX case studies with generative gradient covers.
- **Password-locked projects** — gate confidential case studies behind a
  passphrase. Content is **encrypted at build time** (AES-GCM via PBKDF2) and
  only decrypted client-side, so secrets never ship in the HTML.
- **About / CV** — a structured résumé that downloads as a clean PDF (via the
  browser print pipeline + a dedicated print stylesheet).

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to ./dist (runs encryption first)
npm run preview    # preview the production build
```

## Where to edit things

| What | File |
| --- | --- |
| Name, role, nav, socials, SEO | `src/site.config.ts` |
| Design tokens (colors, type, spacing, motion) | `src/styles/tokens.css` |
| Base styles / utilities | `src/styles/global.css` |
| Projects (content) | `src/content/projects/*.mdx` |
| Project schema | `src/content.config.ts` |
| CV / résumé content | `src/cv.config.ts` |
| Layout & components | `src/layouts/`, `src/components/` |

## Adding a project

Create `src/content/projects/<slug>.mdx`:

```mdx
---
title: My Project
description: One line that sells it.
date: 2025-05-01
order: 1            # optional manual sort (lower = first)
accent: lilac      # lilac | mint | peach | sky | butter
role: Design Engineer
client: Acme
tags: ['Product', 'Motion']
cover: /covers/my-project.jpg   # optional; omit for a generated cover
featured: true
links:
  - label: Live
    href: https://example.com
---

Write the case study here in Markdown/MDX.
```

## Locking a project behind a password

For confidential client work you can share a passphrase instead of publishing
the case study openly.

1. In the project's MDX frontmatter set `locked: true`. The MDX body becomes the
   **public teaser** shown before unlock.
2. Put the full, confidential write-up in `src/protected/<slug>.md` (plain
   Markdown). This file is **git-ignored**.
3. Set the password — either add `"<slug>": "your-pass"` to
   `src/protected/passwords.json` (copy `passwords.example.json`) or set an env
   var `LOCK_PASSWORD_<SLUG>`.
4. Run `npm run encrypt` (also runs automatically on `npm run build`). This
   writes ciphertext to `public/locked/<slug>.json`.
5. Hand the passphrase to your client. They enter it on the project page; the
   content is decrypted in their browser with the Web Crypto API.

**Demo:** the included `Project Halcyon` is locked with the passphrase
`soft-club`.

> Security note: only the ciphertext is deployed, so the protected text can't be
> scraped from the static HTML. Anyone with the password can decrypt — this is
> client gating, not server-side auth for highly sensitive data. See
> `src/protected/README.md` for details.

## Deploying to GitHub Pages

This repo ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds the site and publishes it to **GitHub Pages** on every push to
`main`.

One-time setup in the GitHub UI: **Settings → Pages → Build and deployment →
Source = GitHub Actions**. After the first successful run the site is live at:

```
https://freenandes.github.io/portfolio/
```

Because it's served from the `/portfolio/` sub-path, `astro.config.mjs` sets
both `site` and `base`. All internal links go through the `withBase()` helper
(`src/lib/base.ts`) so they resolve correctly under that sub-path — including
the client-side fetch for password-locked projects.

**Custom domain or user/org page?** Set the deployment URL and sub-path via env
vars (the workflow passes these to the build):

| Scenario | `SITE` | `BASE_PATH` |
| --- | --- | --- |
| Project page (default) | `https://freenandes.github.io` | `/portfolio` |
| User/org page (`<user>.github.io` repo) | `https://freenandes.github.io` | `/` |
| Custom domain | `https://your-domain.com` | `/` |

For a custom domain, also add a `public/CNAME` file containing the domain and
configure it under **Settings → Pages → Custom domain**.

## Tech

- [Astro](https://astro.build) + MDX, sitemap
- Self-hosted fonts via `@fontsource` (Space Grotesk + Space Mono)
- `marked` for client-side rendering of decrypted Markdown
- Web Crypto (PBKDF2 + AES-GCM) for the lock feature
