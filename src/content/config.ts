import { defineCollection, z, reference } from 'astro:content';

const basic = defineCollection({
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});
const webZine = defineCollection({
  schema: ({ image }) => z.object({
    layout: z.string().default("../../layouts/WebzineView.astro"),
    title: z.string(),
    description: z.string(),
    author: z.string().default("Pedro MC Fernandes"),
    pubDate: z.date(),
    cover: image().refine((img) => img.width >= 1024, {
      message: "Cover image must be at least 1024 pixels wide!",
    }),
    coverAlt: z.string(),
    customClasses: z.string().default("dark"),
  })
});
const index = defineCollection({
  schema: z.object({
    title: z.string().optional(),
    relatedPosts: z.array(reference('image')),
  }),
});
const gallery = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().optional(),
    cover: image().refine((img) => img.width >= 1024, {
      message: "Cover image must be at least 1024 pixels wide!",
    }),
    coverAlt: z.string(),
  }),
});

export const collections = {
  // Whiteboard
  'base': basic,
  'who': basic,
  'why': basic,
  'see': basic,
  'extra': basic,
  // WebZines
  'dor-cronica': webZine,
  // PMCF 2
  'pmcf': index,
  'image': gallery,
};