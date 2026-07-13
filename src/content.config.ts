import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { normalizeMediaPath } from './utils/media';

const articles = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/articles',
  }),
  schema: z.object({
    translationKey: z.string(),
    locale: z.enum(['zh-cn', 'en']),
    routeSlug: z.string(),
    title: z.string(),
    excerpt: z.string(),
    author: z.string().default('A1right'),
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(180).optional(),
    categoryKey: z.enum(['web-security', 'ctf-writeup', 'agent-pentest']),
    category: z.string(),
    tags: z.array(z.string()).min(1).max(6),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    cover: z.string().transform(normalizeMediaPath),
    coverAlt: z.string(),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  articles,
};
