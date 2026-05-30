import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* Accent names map to the soft-club pastels in tokens.css. They drive the
   generative cover gradient + tag chip color for each project. */
const accents = ['lilac', 'mint', 'peach', 'sky', 'butter'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    /** One-line summary shown on cards and meta. */
    description: z.string(),
    /** Used for sorting + the "YEAR" label. */
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Manual override for ordering (lower = earlier). */
    order: z.number().optional(),
    tags: z.array(z.string()).default([]),
    role: z.string().optional(),
    client: z.string().optional(),
    /** Path under /public, or remote URL. Optional — falls back to a
        generated gradient cover when omitted. */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    accent: z.enum(accents).default('lilac'),
    featured: z.boolean().default(false),
    /** When true, the detail page is gated behind a client password and the
        protected body is encrypted at build time (see scripts/). */
    locked: z.boolean().default(false),
    draft: z.boolean().default(false),
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .default([]),
  }),
});

export const collections = { projects };
