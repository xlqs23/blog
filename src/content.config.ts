import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { categoryIds } from './lib/categories';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.preprocess((value) => value === '' || value === null ? undefined : value, z.coerce.date().optional()),
    tags: z.array(z.string()).default([]),
    category: z.enum(categoryIds).optional(),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});
export const collections = { blog };
