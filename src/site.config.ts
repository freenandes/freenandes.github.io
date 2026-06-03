/* =========================================================================
   SITE CONFIG
   Edit this file to change the global, non-page content of the site:
   your name, role, navigation, social links and SEO defaults.
   Keeping it here means you rarely have to touch component markup.
   ========================================================================= */

export interface NavItem {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  /** Your name — shown in the masthead and document titles. */
  name: string;
  /** Short role / tagline used in <meta> and the footer. */
  role: string;
  /** A monospace "mark" used as the logo. Keep it short. */
  mark: string;
  /** Default meta description for SEO. */
  description: string;
  /** Primary navigation. */
  nav: NavItem[];
  /** External links shown in the footer. */
  socials: SocialLink[];
  /** Default Open Graph image (place file in /public). */
  ogImage: string;
}

export const site: SiteConfig = {
  name: 'Pedro MC Fernandes',
  role: 'Senior Product Designer',
  mark: 'PF™',
  description:
    'Systems-thinking product designer turning stagnating products into growth engines — fixing ecosystems, not just interfaces, and shipping the code to prove it.',
  nav: [
    { label: 'Map', href: '/' },
    { label: 'About', href: '/about' },
  ],
  socials: [
    { label: 'Email', href: 'mailto:redacted@example.invalid' },
    { label: 'Website', href: 'https://pmcf.xyz' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pmcfernandes' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
  ],
  ogImage: '/og.png',
};
