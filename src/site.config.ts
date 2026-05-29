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
  name: 'Fernando Nandes',
  role: 'Design Engineer',
  mark: 'FN™',
  description:
    'Design engineer working at the seam of form and function — interfaces, systems and the occasional pixel-perfect obsession.',
  nav: [
    { label: 'Work', href: '/' },
    { label: 'About', href: '/about' },
  ],
  socials: [
    { label: 'Email', href: 'mailto:hello@example.com' },
    { label: 'GitHub', href: 'https://github.com/freenandes' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/example' },
    { label: 'Bluesky', href: 'https://bsky.app/profile/example' },
  ],
  ogImage: '/og.png',
};
