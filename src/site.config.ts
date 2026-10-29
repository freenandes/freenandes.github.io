/** Everything about the site that isn't a page: name, links, metadata, assets. */

import { decodeEmail } from './lib/email';

export interface SiteConfig {
  name: string;
  role: string;
  description: string;
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
  /** Paths under /public */
  ogImage: string;
  ogImageAlt: string;
  favicon: string;
  /** Home-screen name, and the tint browsers paint their own UI with. */
  shortName: string;
  themeColor: string;
}

export const site: SiteConfig = {
  name: 'Pedro MC Fernandes',
  role: 'Lead Product Designer',
  description:
    'Systems-thinking product designer turning stagnating products into growth engines — fixing ecosystems, not just interfaces, and shipping the code to prove it.',
  socials: [
    { label: 'Email', token: 'b3c3d6d7c1dcf3c3ded0d59dcbcac9' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pmcfernandes' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
  ],
  printContacts: ['pmcf.xyz'],
  locale: 'en',
  ogLocale: 'en_US',
  ogImage: '/og.png',
  ogImageAlt: 'Pedro MC Fernandes — Lead Product Designer',
  favicon: '/favicon.svg',
  shortName: 'PMCF',
  themeColor: '#ffffff',
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
