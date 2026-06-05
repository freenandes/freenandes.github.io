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

## Locking a project behind a password

For confidential pages share a passphrase instead of publishing it.

1. In the project's MDX frontmatter set `locked: true`. The MDX body becomes the public teaser shown before unlock.
2. Put the full, confidential write-up in `src/protected/<slug>.md` (plain Markdown). This file is **git-ignored**.
3. Set the password — either:

   1. add `"<slug>": "your-pass"` to `src/protected/passwords.json` (copy `passwords.example.json`)
   2. or set an env var `LOCK_PASSWORD_<SLUG>`
   
4. Run `npm run encrypt` (also runs automatically on `npm run build`). This writes ciphertext to `public/locked/<slug>.json`.
5. Hand the passphrase to your client. They enter it on the project page; the content is decrypted in their browser with the Web Crypto API.

## To do

- [ ] Review `<noscript>` at `src/components/NavDiagram.astro`