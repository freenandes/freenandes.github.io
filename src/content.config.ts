import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Accent names → generative cover palettes in src/styles/tokens.css */
const accents = ['lilac', 'mint', 'peach', 'sky', 'butter'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    order: z.number().optional(),
    tags: z.array(z.string()).default([]),
    role: z.string().optional(),
    client: z.string().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    accent: z.enum(accents).default('lilac'),
    locked: z.boolean().default(false),
    draft: z.boolean().default(false),
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .default([]),
  }),
});

export const collections = { projects };
