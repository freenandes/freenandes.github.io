import { site } from './site.config';

/**
 * The home page: every marker on the map and the order they connect in.
 * Rendered by `src/pages/index.astro`, laid out by `src/scripts/nav-diagram.ts`.
 * The mini-map at the foot of About and every case study
 * (`src/components/MiniMap.astro`) draws the pages among them in the same order,
 * pulled straight.
 */

export type NodeKind = 'identity' | 'about' | 'contact' | 'project' | 'floating';
export type NodeShape = 'triangle' | 'square' | 'pentagon' | 'hexagon';

/** A marker as the page renders it. */
export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Marker outline. Floating rings don't have one. */
  shape?: NodeShape;
  /** Second line under the label — the identity marker's job title. */
  subLabel?: string;
  /** Card contents: a bold opening line, then a paragraph each. */
  tagline?: string;
  lines?: string[];
  tags?: string[];
  link?: { label: string; href: string; external?: boolean };
  /**
   * Alt text for the marker's preview: a screen from the project, in
   * `src/assets/previews/` and named after the marker's id. On a desktop it
   * floats beside the marker while the pointer is on it; on a touch screen it
   * heads the card. The build stops if the image and this text don't come as
   * a pair.
   */
  preview?: string;
  /**
   * Where the marker would like to sit, as a fraction (0..1) of the canvas.
   * The layout starts from a random walk and leans back toward these, so they
   * are a preference, not a position.
   */
  portrait: { x: number; y: number };
  landscape: { x: number; y: number };
  /** Floating rings only — initial rotation in degrees (0–360). */
  ringStart?: number;
}

/**
 * A marker as it's written below. A case study's `id` is its file name, and
 * `getDiagramNodes()` (`src/lib/diagram.ts`) fills in its label, tags and link
 * from that project, so only its card copy and placement live here.
 */
export type DiagramEntry =
  | (DiagramNode & { kind: Exclude<NodeKind, 'project'> })
  | (Omit<DiagramNode, 'label' | 'tags' | 'link'> & { kind: 'project' });

/** The link at the bottom of every case study's card. */
export const projectLinkLabel = 'Open case study';

export const diagramNodes: DiagramEntry[] = [
  {
    id: 'pedro',
    label: site.name,
    // Two lines under the name, breaking before the "&".
    subLabel: site.role.replace(' & ', '\n& '),
    kind: 'identity',
    shape: 'pentagon',
    portrait: { x: 0.5, y: 0.28 },
    landscape: { x: 0.26, y: 0.5 },
  },
  {
    id: 'about',
    label: 'About/CV',
    kind: 'about',
    shape: 'hexagon',
    tagline: 'I specialize in building interfaces for complex technical software.',
    lines: [
      'I cover the whole path, from user research and information architecture to interaction design, prototyping, design systems, and the production front-end code that ships them.',
    ],
    link: { label: 'Read the full story', href: '/about' },
    portrait: { x: 0.24, y: 0.08 },
    landscape: { x: 0.12, y: 0.26 },
  },
  {
    id: 'contact',
    // Two lines, breaking before "Contact".
    label: 'Open to work\nContact me',
    kind: 'contact',
    shape: 'square',
    tagline: site.availability,
    portrait: { x: 0.76, y: 0.16 },
    landscape: { x: 0.12, y: 0.74 },
  },
  {
    id: 'peak-systems-at-percona',
    kind: 'project',
    shape: 'triangle',
    tagline:
      "The systems case. Giving PMM its own interface and a foundation for new apps.",
    lines: [
      "I designed a native interface for Percona’s database monitoring platform and helped build Peak UI design system. Grafana upgrade work fell from weeks to days, and two more teams shipped six preview apps.",
    ],
    preview:
      'PMM’s Updates page once an update has finished: the server is up to date, and every client in the list reads “Up to date”.',
    portrait: { x: 0.44, y: 0.5 },
    landscape: { x: 0.47, y: 0.4 },
  },
  {
    id: 'reading-the-terrain-at-percona',
    kind: 'project',
    shape: 'triangle',
    tagline: 'The fluency case. Redesigning the screen DBAs open when the database is slow.',
    lines: [
      'I reframed Query Analytics around what DBAs can act on and designed its real-time version with enterprise customers. It shipped, leaving customers asking for more.',
    ],
    preview:
      'Query Analytics on its Real-Time tab, watching the mc-global-analytics cluster: the live queries running right now, each with its service, elapsed time and state, such as Sorting result, Running, Waiting or Blocked, beside controls to pause fetching or stop the agents.',
    portrait: { x: 0.56, y: 0.71 },
    landscape: { x: 0.68, y: 0.58 },
  },
  {
    id: '100000-pages-high-at-tui-group',
    kind: 'project',
    shape: 'triangle',
    tagline:
      'The scale case. One template, and the rules behind 100,000 pages.',
    lines: [
      'At TUI’s Lisbon hub, I designed PageBuilder: a destination page template and the rules for a generator that built 100K+ pages, growing organic traffic more than 4× where it launched. Plus Tagus, the design system that kept them coherent across 5 markets.',
    ],
    portrait: { x: 0.5, y: 0.92 },
    landscape: { x: 0.88, y: 0.46 },
  },
  {
    id: 'float-1',
    label: 'Fix problems, not screens',
    kind: 'floating',
    ringStart: 0,
    portrait: { x: 0.16, y: 0.5 },
    landscape: { x: 0.2, y: 0.82 },
  },
  {
    id: 'float-2',
    label: 'I push designs to PROD',
    kind: 'floating',
    ringStart: 120,
    portrait: { x: 0.84, y: 0.62 },
    landscape: { x: 0.78, y: 0.18 },
  },
  {
    id: 'float-3',
    label: 'Systems-thinking since 2007',
    kind: 'floating',
    ringStart: 240,
    portrait: { x: 0.7, y: 0.88 },
    landscape: { x: 0.5, y: 0.85 },
  },
];

/**
 * The line the connectors draw, marker to marker. One open chain: reorder the
 * ids to reroute it, drop one to leave that marker unconnected. The mini-map
 * follows the same order, skipping the markers that have no page.
 */
export const diagramChain = [
  'contact',
  'about',
  'pedro',
  'peak-systems-at-percona',
  'reading-the-terrain-at-percona',
  '100000-pages-high-at-tui-group',
];
