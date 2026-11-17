/** The map's markers as the pages draw them: each case study's label, tags and
    link filled in from its project, and the set checked against what's
    published. The home map (`src/pages/index.astro`) and the mini-map that ends
    About and every case study (`src/components/MiniMap.astro`) both render from
    here. */

import {
  diagramChain,
  diagramNodes,
  projectLinkLabel,
  type DiagramNode,
  type NodeShape,
} from '../diagram.config';
import { bare } from './base';
import { getProjects } from './projects';

/**
 * Every marker, ready to render. A typo in diagram.config.ts would otherwise
 * ship as a card linking to a 404, or a marker that quietly drops out of the
 * chain, so the build stops instead.
 */
export async function getDiagramNodes(): Promise<DiagramNode[]> {
  const projects = await getProjects();
  const nodes: DiagramNode[] = diagramNodes.map((node) => {
    if (node.kind !== 'project') return node;
    const project = projects.find((p) => p.id === node.id);
    if (!project) {
      throw new Error(
        `diagram.config.ts: "${node.id}" has no published project ` +
          '(a typo, a renamed file, or a project still marked draft).'
      );
    }
    const { title, tags } = project.data;
    const link = { label: projectLinkLabel, href: `/${node.id}/` };
    return { ...node, label: title, tags, link };
  });

  const pages = new Set(['/', '/about', ...projects.map((p) => `/${p.id}`)]);
  for (const node of nodes) {
    if (node.link && !node.link.external && !pages.has(bare(node.link.href))) {
      throw new Error(
        `diagram.config.ts: "${node.id}" links to ${node.link.href}, which isn't a published page ` +
          '(a typo, a renamed file, or a project still marked draft).'
      );
    }
  }
  for (const id of diagramChain) {
    if (!diagramNodes.some((node) => node.id === id)) {
      throw new Error(`diagram.config.ts: diagramChain lists "${id}", but no node has that id.`);
    }
  }
  return nodes;
}

/** Marker outline in a 20×20 box, point up (square: flat): a regular polygon
 *  with this many corners, or for the star, this many points. */
const CORNERS: Record<NodeShape, number> = { triangle: 3, square: 4, pentagon: 5, star: 5 };
/** How far in a star's inner corners sit, as a share of its points' reach.
 *  Lower is spikier. */
const STAR_INNER = 0.52;

export function polygon(shape: NodeShape = 'pentagon'): string {
  const star = shape === 'star';
  const count = star ? 2 * CORNERS[shape] : CORNERS[shape];
  const start = shape === 'square' ? -45 : -90;
  return Array.from({ length: count }, (_, i) => {
    const angle = ((start + (i * 360) / count) * Math.PI) / 180;
    const r = star && i % 2 ? 8.4 * STAR_INNER : 8.4;
    return `${(10 + r * Math.cos(angle)).toFixed(2)},${(10 + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}
