import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
    locked: z.boolean().default(false),
    draft: z.boolean().default(false),
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .default([]),
  }),
});

// One entry: src/content/cv.md, all frontmatter, in the order the About page
// shows it. `summary` is Markdown, rendered by the page. `.strict()` turns a
// misspelled field into a build error instead of silently dropping it.
const cv = defineCollection({
  loader: glob({ pattern: 'cv.md', base: './src/content' }),
  schema: z.object({
    headline: z.string(),
    location: z.string().optional(),
    summary: z.string(),
    experience: z.array(
      z.object({
        role: z.string(),
        org: z.string(),
        period: z.string(),
        summary: z.string().optional(),
        points: z.array(z.string()).default([]),
      }).strict()
    ),
    earlierWork: z
      .array(
        z.object({
          role: z.string(),
          org: z.string(),
          period: z.string(),
          summary: z.string().optional(),
        }).strict()
      )
      .default([]),
    education: z.array(
      z.object({
        title: z.string(),
        org: z.string().optional(),
        period: z.string().optional(),
        note: z.string().optional(),
      }).strict()
    ),
    skills: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
  }).strict(),
});

export const collections = { projects, cv };
