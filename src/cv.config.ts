/* =========================================================================
   CV / RÉSUMÉ CONTENT
   Edit this structured data to update the About page and the downloadable
   PDF (the PDF is produced from this same page via the print stylesheet, so
   it always matches what you see). Prose-first fields accept plain strings.
   ========================================================================= */

export interface CVExperience {
  role: string;
  org: string;
  period: string;
  location?: string;
  summary?: string;
  points: string[];
}

export interface CVEntry {
  title: string;
  org: string;
  period: string;
  note?: string;
}

export interface CVSkillGroup {
  label: string;
  items: string[];
}

export interface CVConfig {
  summary: string;
  /** Where to link the PDF, if you prefer a pre-rendered file over print. */
  experience: CVExperience[];
  education: CVEntry[];
  skills: CVSkillGroup[];
  selectedClients: string[];
  recognition: CVEntry[];
}

export const cv: CVConfig = {
  summary:
    'Design engineer with 8+ years bridging product design and front-end engineering. I build design systems, ship polished interfaces, and prototype the things that are easier shown than specced. Equally comfortable in Figma and a text editor.',
  experience: [
    {
      role: 'Lead Design Engineer',
      org: 'Northwind',
      period: '2022 — Present',
      location: 'Remote',
      summary: 'Own the design system and the design–engineering interface.',
      points: [
        'Architected the Atlas token system, now powering 40+ product surfaces.',
        'Built a framework-agnostic component library with scoped styles and automated a11y gates.',
        'Cut average time-to-ship for new screens by ~30%.',
      ],
    },
    {
      role: 'Senior Product Designer (Eng-leaning)',
      org: 'Helio',
      period: '2019 — 2022',
      location: 'Lisbon',
      summary: 'Design + front-end for a consumer banking app.',
      points: [
        'Led the redesign around a single "can I spend this?" home screen.',
        'Defined and prototyped the spring-based motion language.',
        'Shipped a shared design–dev spec that made prototypes the contract.',
      ],
    },
    {
      role: 'Front-end Developer',
      org: 'Studio Meridian',
      period: '2016 — 2019',
      location: 'Porto',
      points: [
        'Built editorial and commerce sites with a heavy focus on typography and performance.',
        'Introduced design tokens and a component-driven workflow to the studio.',
      ],
    },
  ],
  education: [
    {
      title: 'BA, Communication Design',
      org: 'University of the Arts',
      period: '2012 — 2016',
      note: 'Thesis on systematic typography for screens.',
    },
  ],
  skills: [
    {
      label: 'Design',
      items: ['Design systems', 'Typography', 'Interaction', 'Motion', 'Prototyping'],
    },
    {
      label: 'Engineering',
      items: ['HTML / CSS', 'TypeScript', 'Astro', 'Web Components', 'Accessibility'],
    },
    {
      label: 'Tools',
      items: ['Figma', 'Git', 'Storybook', 'Playwright', 'Vite'],
    },
  ],
  selectedClients: ['Northwind', 'Helio', 'Meridian', 'Halcyon', 'Field Notes'],
  recognition: [
    {
      title: 'Awwwards — Site of the Day',
      org: 'Field Notes',
      period: '2024',
    },
    {
      title: 'Speaker',
      org: 'CSS Café — "Tokens all the way down"',
      period: '2023',
    },
  ],
};
