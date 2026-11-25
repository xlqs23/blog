import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { categoryIds } from './lib/categories';
import { assertEncryptedRecord, validateEnvelope } from './lib/encrypted-post.mjs';

const encryption = z.object({
  version: z.literal(1),
  kdf: z.literal('PBKDF2'),
  hash: z.literal('SHA-256'),
  iterations: z.literal(600000),
  salt: z.string(),
  iv: z.string(),
  ciphertext: z.string(),
}).strict().superRefine((value, context) => {
  try { validateEnvelope(value); }
  catch { context.addIssue({ code: 'custom', message: '加密数据格式无效。' }); }
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}', deferRender: true }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.preprocess((value) => value === '' || value === null ? undefined : value, z.coerce.date().optional()),
    tags: z.array(z.string()).default([]),
    category: z.enum(categoryIds).optional(),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
    encrypted: z.boolean().default(false),
    encryption: encryption.optional(),
  }).passthrough().superRefine((data, context) => {
    try { assertEncryptedRecord(data); }
    catch (error) { context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : '加密文章元数据无效。' }); }
  }),
});
export const collections = { blog };
