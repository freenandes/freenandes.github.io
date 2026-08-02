import type { APIRoute } from 'astro';
import { site } from '../site.config';
import { withBase } from '../lib/base';
import { getProjects, projectYear } from '../lib/projects';

/**
 * /llms.txt — a curated, machine-readable index of the site's most important
 * content for LLMs. Emerging convention (https://llmstxt.org). Like robots.txt
 * it is conventionally read from the domain root; see SPEC-COMPLIANCE.md for the
 * sub-path caveat.
 */
export const GET: APIRoute = async ({ site: astroSite }) => {
  const abs = (path: string) => {
    const withBasePath = withBase(path);
    return astroSite ? new URL(withBasePath, astroSite).toString() : withBasePath;
  };

  const projects = await getProjects();

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.role}. ${site.description}`,
    '',
    '## Pages',
    '',
    `- [Home / site map](${abs('/')}): Interactive map linking the case studies, about and contact.`,
    `- [About / CV](${abs('/about')}): Career history, experience and education.`,
    '',
    '## Case studies',
    '',
    ...projects.map((p) => {
      const locked = p.data.locked ? ' (full write-up password-protected)' : '';
      return `- [${p.data.title} (${projectYear(p)})](${abs(`/projects/${p.id}/`)}): ${p.data.description}${locked}`;
    }),
    '',
    '## Contact',
    '',
    // The email is deliberately kept out of this plain-text file — it is the
    // easiest thing for a spam harvester to lift. Reach it via the site's
    // contact card or the About page; the durable profiles are listed here.
    ...site.socials
      .filter((s) => s.href)
      .map((s) => `- ${s.label}: ${s.href}`),
    `- Email: on the contact card at ${abs('/')} and the About page at ${abs('/about')} (kept out of plain text to deter scrapers).`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
