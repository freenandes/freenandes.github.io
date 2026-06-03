/* =========================================================================
   DIAGRAM NAVIGATION CONFIG
   The home page is a kinetic mind-map. Every node and connection below is
   rendered by `src/components/NavDiagram.astro`; the physics simulation lives
   in that component's client script. Edit content here — positions, labels,
   reveal copy, links — without touching the markup or the simulation.

   Coordinates are normalised (0..1) fractions of the diagram canvas. Two
   layouts are provided per node:
     - `portrait`  : narrow / mobile screens (the graph stacks vertically).
     - `landscape` : wide / desktop screens (the graph spreads horizontally).
   The component picks one based on the canvas aspect ratio and animates
   between them on resize.
   ========================================================================= */

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
  /** External links open in a new tab; internal ones use the base path. */
  external?: boolean;
}

export type NodeKind = 'identity' | 'about' | 'contact' | 'project';

/** Polygon used to draw the node "point". No circles. Assigned per node
   (not randomized) so it can be hand-tweaked later. */
export type NodeShape = 'triangle' | 'square' | 'pentagon' | 'hexagon';

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Visual weight of the node dot. */
  size?: 'lg' | 'md' | 'sm';
  /** Polygon drawn as the node point. */
  shape?: NodeShape;
  /** Which way the reveal panel opens, so it stays on-canvas. */
  place?: 'top' | 'bottom' | 'left' | 'right';
  /** Small mono caption shown above the panel title (role · year, etc.). */
  meta?: string;
  /** Lead sentence inside the reveal panel. */
  tagline?: string;
  /** Extra paragraphs (e.g. the About hook headline + subheadline). */
  lines?: string[];
  /** Identity metrics — keep to three, per the design brief. */
  metrics?: DiagramMetric[];
  /** Project tags rendered as chips. */
  tags?: string[];
  /** A mailto address for the contact node. */
  email?: string;
  /** Optional call-to-action link inside the panel. */
  link?: DiagramLink;
  portrait: DiagramPoint;
  landscape: DiagramPoint;
}

export const diagramNodes: DiagramNode[] = [
  {
    id: 'pedro',
    label: 'Pedro MC Fernandes',
    kind: 'identity',
    size: 'lg',
    shape: 'hexagon',
    place: 'bottom',
    tagline:
      'Systems-thinking product designer. I fix the system, not just the screen — at the boundary between strategy and execution, shipping the code too.',
    metrics: [
      { value: '18+ yrs', label: 'building & scaling products' },
      { value: '4×', label: 'organic traffic · 100K+ pages' },
      { value: '~50%', label: 'faster delivery via design systems' },
    ],
    portrait: { x: 0.5, y: 0.28 },
    landscape: { x: 0.26, y: 0.5 },
  },
  {
    id: 'about',
    label: 'About',
    kind: 'about',
    size: 'md',
    shape: 'triangle',
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
    email: 'redacted@example.invalid',
    link: {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/pmcfernandes',
      external: true,
    },
    portrait: { x: 0.76, y: 0.16 },
    landscape: { x: 0.12, y: 0.74 },
  },
  {
    id: 'systems-thinker',
    label: 'Systems-Thinker',
    kind: 'project',
    size: 'md',
    shape: 'pentagon',
    place: 'right',
    meta: 'Percona · 2022—present',
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
    shape: 'hexagon',
    place: 'left',
    meta: 'TUI · 2019—2021',
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
    meta: 'Smartidiom · 2016—2019',
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
];

/** Connections (the "bonds" between nodes). Order is [from, to].
   A single open chain — contact → about → pedro → systems-thinker →
   design-at-scale → visionary — so the diagram reads as one continuous line
   rather than a fork. The home page renders this line in a fresh random shape
   on every load / identity-node click. */
export const diagramEdges: Array<[string, string]> = [
  ['contact', 'about'],
  ['about', 'pedro'],
  ['pedro', 'systems-thinker'],
  ['systems-thinker', 'design-at-scale'],
  ['design-at-scale', 'visionary'],
];
