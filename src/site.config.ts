/** Everything about the site that isn't a page: name, links, metadata, assets. */

import { decodeEmail } from './lib/email';

export interface SiteConfig {
  name: string;
  role: string;
  description: string;
  /** What work is wanted. Opens the contact card and the footer. */
  availability: string;
  /** Shown in link rows, the footer, the contact card and /llms.txt. A link
   *  has an `href`; the email has an obfuscated `token` instead
   *  (`src/lib/email.ts`): change it with `npm run email -- you@example.com`. */
  socials: { label: string; href?: string; token?: string }[];
  /** Extra contacts printed before the socials on the PDF CV only, as
   *  written; the web page never shows them. */
  printContacts: string[];
  /** BCP 47 language tag for the document (matches <html lang>). */
  locale: string;
  /** Open Graph locale (underscore form, e.g. en_US). */
  ogLocale: string;
  /** The link preview (Open Graph): a 1200×630 PNG under /public, drawn by
   *  `npm run og` from `name` and `role`. `width`, `height` and `type` must
   *  match the file, so platforms can draw the card before fetching it. `alt`
   *  says what the image shows. */
  ogImage: { path: string; width: number; height: number; type: string; alt: string };
  /** Home-screen name, and the tint browsers paint their own UI with. */
  shortName: string;
  themeColor: string;
  /** GoatCounter's count endpoint, loaded by every page as a hidden image (no
   *  script, no cookie). Only deploy builds (COUNT_VISITS=true) include it, so
   *  local builds never count. */
  visitCounter: string;
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
  visitCounter: 'https://freenandes.goatcounter.com/count',
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
