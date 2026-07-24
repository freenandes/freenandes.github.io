/** Global site copy, links, and static asset paths (files live in /public). */

export interface SocialLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  role: string;
  description: string;
  socials: SocialLink[];
  /** BCP 47 language tag for the document (matches <html lang>). */
  locale: string;
  /** Open Graph locale (underscore form, e.g. en_US). */
  ogLocale: string;
  /** Path under /public */
  ogImage: string;
  /** Alt text describing the Open Graph image. */
  ogImageAlt: string;
  favicon: string;
}

export const site: SiteConfig = {
  name: 'Pedro MC Fernandes',
  role: 'Lead Product Designer',
  description:
    'Systems-thinking product designer turning stagnating products into growth engines — fixing ecosystems, not just interfaces, and shipping the code to prove it.',
  socials: [
    { label: 'Email', href: 'mailto:redacted@example.invalid' },
    // { label: 'Website', href: 'https://pmcf.xyz' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pmcfernandes' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
  ],
  locale: 'en',
  ogLocale: 'en_US',
  ogImage: '/og.png',
  ogImageAlt: 'Pedro MC Fernandes — Lead Product Designer',
  favicon: '/favicon.svg',
};
