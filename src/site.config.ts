/** Everything about the site that isn't a page: name, links, metadata, assets. */

export interface SiteConfig {
  name: string;
  role: string;
  description: string;
  /** Shown in link rows, the footer, the contact card and /llms.txt. */
  socials: { label: string; href: string }[];
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
    { label: 'Email', href: 'mailto:redacted@example.invalid' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pmcfernandes' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
  ],
  locale: 'en',
  ogLocale: 'en_US',
  ogImage: '/og.png',
  ogImageAlt: 'Pedro MC Fernandes — Lead Product Designer',
  favicon: '/favicon.svg',
  shortName: 'PMCF',
  themeColor: '#ffffff',
};
