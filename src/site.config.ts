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
  /** Path under /public */
  ogImage: string;
  favicon: string;
}

export const site: SiteConfig = {
  name: 'Pedro Fernandes',
  role: 'Senior Product Designer',
  description:
    'Systems-thinking product designer turning stagnating products into growth engines — fixing ecosystems, not just interfaces, and shipping the code to prove it.',
  socials: [
    { label: 'Email', href: 'mailto:redacted@example.invalid' },
    { label: 'Website', href: 'https://pmcf.xyz' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pmcfernandes' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
  ],
  ogImage: '/og.png',
  favicon: '/favicon.svg',
};
