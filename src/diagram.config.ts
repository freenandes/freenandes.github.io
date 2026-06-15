import { site } from './site.config';

/** Home-page mind-map nodes and edges — rendered by NavDiagram.astro. */

export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramMetric {
  value: string;
  label: string;
}

export interface DiagramLink {
  label: string;
  href: string;
  external?: boolean;
}

export type NodeKind = 'identity' | 'about' | 'contact' | 'project' | 'floating';
export type NodeShape = 'triangle' | 'square' | 'pentagon' | 'hexagon';

export interface DiagramNode {
  id: string;
  label: string;
  subLabel?: string;
  kind: NodeKind;
  size?: 'lg' | 'md' | 'sm';
  shape?: NodeShape;
  place?: 'top' | 'bottom' | 'left' | 'right';
  meta?: string;
  tagline?: string;
  lines?: string[];
  metrics?: DiagramMetric[];
  tags?: string[];
  email?: string;
  link?: DiagramLink;
  /** Hint coords (0..1) when resize adaptation nudges layout toward the authored map. */
  portrait: DiagramPoint;
  landscape: DiagramPoint;
  /** Floating rings only — initial rotation in degrees (0–360). */
  ringStart?: number;
}

export const diagramNodes: DiagramNode[] = [
  {
    id: 'pedro',
    label: site.name,
    subLabel: site.role,
    kind: 'identity',
    size: 'lg',
    shape: 'pentagon',
    place: 'bottom',
    portrait: { x: 0.5, y: 0.28 },
    landscape: { x: 0.26, y: 0.5 },
  },
  {
    id: 'about',
    label: 'About',
    kind: 'about',
    size: 'md',
    shape: 'hexagon',
    place: 'right',
    tagline: 'I design and build — fixing the system, not just the screen.',
    lines: [
      'I react against stagnation and look forward to a sustainable growth path by fixing ecosystems, not just interfaces. At the boundary between strategy and execution, I will be there shipping the code as well.',
    ],
    link: { label: 'Read the full story', href: '/about' },
    portrait: { x: 0.24, y: 0.08 },
    landscape: { x: 0.12, y: 0.26 },
  },
  {
    id: 'contact',
    label: 'Contact',
    kind: 'contact',
    size: 'md',
    shape: 'square',
    place: 'left',
    tagline: 'Open to principal / lead product design and design-engineering work.',
    portrait: { x: 0.76, y: 0.16 },
    landscape: { x: 0.12, y: 0.74 },
  },
  {
    id: 'systems-thinker',
    label: 'Systems-Thinker',
    kind: 'project',
    size: 'md',
    shape: 'triangle',
    place: 'right',
    meta: '',
    tagline:
      'The complexity piece. Untangling messy, highly technical ecosystems into systems that scale.',
    lines: [
      'Built the Peak Design System across 3 products and 10+ engineers, established a PostHog analytics framework, and kicked off Native Navigation to retire Grafana technical debt.',
    ],
    tags: ['Design Systems', 'Developer Tools', 'Architecture'],
    link: { label: 'Open case study', href: '/projects/systems-thinker/' },
    portrait: { x: 0.44, y: 0.5 },
    landscape: { x: 0.47, y: 0.4 },
  },
  {
    id: 'design-at-scale',
    label: 'Design at Scale',
    kind: 'project',
    size: 'md',
    shape: 'triangle',
    place: 'left',
    meta: '',
    tagline:
      'The scale piece. Data-driven systems generating massive global business.',
    lines: [
      'Designed the PageBuilder system that generated 100K+ destination pages and 4× organic traffic, and the Tagus design system unifying experiences across 5 global markets.',
    ],
    tags: ['Scale', 'Design Systems', 'Growth'],
    link: { label: 'Open case study', href: '/projects/design-at-scale/' },
    portrait: { x: 0.56, y: 0.71 },
    landscape: { x: 0.68, y: 0.58 },
  },
  {
    id: 'visionary',
    label: 'Visionary',
    kind: 'project',
    size: 'md',
    shape: 'triangle',
    place: 'top',
    meta: '',
    tagline:
      'The zero-to-one piece. Visionary product definition, rapid prototyping, and creative execution.',
    lines: [
      'Designed and coded 4 interconnected products from scratch, showcased at CES, and secured European Community funding through pure product validation.',
    ],
    tags: ['0→1', 'Prototyping', 'Innovation'],
    link: { label: 'Open case study', href: '/projects/visionary/' },
    portrait: { x: 0.5, y: 0.92 },
    landscape: { x: 0.88, y: 0.46 },
  },
  {
    id: 'float-years',
    label: '18+++ years of design',
    kind: 'floating',
    ringStart: 0,
    portrait: { x: 0.16, y: 0.5 },
    landscape: { x: 0.2, y: 0.82 },
  },
  {
    id: 'float-ai',
    label: '2x faster dev + A.I.',
    kind: 'floating',
    ringStart: 120,
    portrait: { x: 0.84, y: 0.62 },
    landscape: { x: 0.78, y: 0.18 },
  },
  {
    id: 'float-merch',
    label: 'Flushed $4.2B in merch',
    kind: 'floating',
    ringStart: 240,
    portrait: { x: 0.7, y: 0.88 },
    landscape: { x: 0.5, y: 0.85 },
  },
];

/** Open chain: contact → about → pedro → systems-thinker → design-at-scale → visionary */
export const diagramEdges: Array<[string, string]> = [
  ['contact', 'about'],
  ['about', 'pedro'],
  ['pedro', 'systems-thinker'],
  ['systems-thinker', 'design-at-scale'],
  ['design-at-scale', 'visionary'],
];
