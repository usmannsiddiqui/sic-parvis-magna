import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { essaySchema } from './content/schema';

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    bio: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) => essaySchema({ image, reference }),
});

export const collections = { writing, authors };
