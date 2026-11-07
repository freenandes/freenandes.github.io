/** Everything about the site that isn't a page: name, links, metadata, assets. */

import { decodeEmail } from './lib/email';

export interface SiteConfig {
  name: string;
  role: string;
  description: string;
  /** What work is wanted. Opens the contact card and the footer. */
  availability: string;
  /** Shown in link rows, the footer, the contact card and /llms.txt. A normal
   *  link carries an `href`; the email carries an obfuscated `token` instead
   *  (see `src/lib/email.ts`) so the address is never written as plaintext into
   *  the served HTML *or* this public repo — the browser turns it back into a
   *  `mailto:` link at runtime. To change the email run
   *  `npm run email -- you@example.com`; never edit the token by hand. */
  socials: { label: string; href?: string; token?: string }[];
  /** Extra contacts printed before the socials on the PDF CV only, as
   *  written; the web page never shows them. */
  printContacts: string[];
  /** BCP 47 language tag for the document (matches <html lang>). */
  locale: string;
  /** Open Graph locale (underscore form, e.g. en_US). */
  ogLocale: string;
  /** The link preview (Open Graph and X cards): a file under /public. Keep it
   *  a 1200×630 PNG or JPEG, small (some apps skip images over a few hundred
   *  KB), with its text inside the centre square, which some apps crop to.
   *  `width`, `height` and `type` must match the file: they let a platform draw
   *  the card the first time a link is shared, before it has fetched the image.
   *  `alt` reads out what the image says. `npm run og` draws the image from
   *  `name` and `role` (see `scripts/og/card.html`), and `alt` is built from
   *  the same two, so the three can't drift apart. */
  ogImage: { path: string; width: number; height: number; type: string; alt: string };
  /** Home-screen name, and the tint browsers paint their own UI with. */
  shortName: string;
  themeColor: string;
  /** GoatCounter's endpoint for this site. `src/scripts/count.ts` sends each
   *  visit there, and the CSP in `Base.astro` allows requests to its host. */
  goatcounter: string;
}

const name = 'Pedro MC Fernandes';
const role = 'Product Designer & Design Engineer';

export const site: SiteConfig = {
  name,
  role,
  description:
    'I build interfaces for complex technical software: observability, databases, and developer tools. From research to design systems and front-end code.',
  availability: 'Open to remote Product Designer and Design Engineer roles in complex technical products.',
  socials: [
    { label: 'Email', token: 'b3c3d6d7c1dcf3c3ded0d59dcbcac9' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pmcfernandes' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
  ],
  printContacts: ['pmcf.xyz'],
  locale: 'en',
  ogLocale: 'en_US',
  ogImage: {
    path: '/og.png',
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: `${name}, ${role}, pmcf.xyz. Set over a topographic map crossed by a route of map markers.`,
  },
  shortName: 'PMCF',
  themeColor: '#ffffff',
  goatcounter: 'https://freenandes.goatcounter.com/count',
};

// This module only loads server-side (build/dev), so a token that no longer
// decodes to an address — hand-edited, or left behind by a codec change —
// fails the build here with instructions, instead of shipping a site whose
// email links silently point nowhere.
for (const social of site.socials) {
  if (social.token && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decodeEmail(social.token))) {
    throw new Error(
      `site.config.ts: the "${social.label}" token does not decode to an email address. ` +
        'Regenerate it with `npm run email -- you@example.com`.'
    );
  }
}
