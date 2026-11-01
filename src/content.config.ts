import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // A real date shows as its year. Anything else shows as written ("2022–2026")
    // and must hold a year, the first of which sorts it and dates its JSON-LD.
    date: z.union([z.date(), z.number(), z.string()]).transform((date, ctx) => {
      if (date instanceof Date) {
        return { label: String(date.getUTCFullYear()), iso: date.toISOString() };
      }
      const year = String(date).match(/\d{4}/)?.[0];
      if (!year) {
        ctx.addIssue({ code: 'custom', message: 'Needs a year, such as 2022 or 2022–2026.' });
        return z.NEVER;
      }
      return { label: String(date), iso: year };
    }),
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
