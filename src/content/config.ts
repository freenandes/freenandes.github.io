// Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';

// Define your collection(s)
// const blogCollection = defineCollection({ });

// Export a single `collections` object to register your collection(s). This key should match your collection directory name in "src/content"
export const collections = {
  'base': defineCollection({
    schema: z.object({
      title: z.string(),
    }),
  }),
  'who': defineCollection({
    schema: z.object({
      title: z.string(),
    }),
  }),
  'why': defineCollection({
    schema: z.object({
      title: z.string(),
    }),
  }),
  'see': defineCollection({
    schema: z.object({
      title: z.string(),
    }),
  }),
  'extra': defineCollection({
    schema: z.object({
      title: z.string(),
    }),
  }),
  'dor-cronica': defineCollection ({
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
  }),
};