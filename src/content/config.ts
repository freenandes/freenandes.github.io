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
};