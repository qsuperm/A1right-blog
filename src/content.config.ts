import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { normalizeMediaPath } from './utils/media';

const optionalDate = z.preprocess((value) => (value === '' || value == null ? undefined : value), z.coerce.date().optional());
const optionalUrl = z
  .preprocess((value) => (value == null ? '' : `${value}`.trim()), z.union([z.string().url(), z.literal('')]))
  .default('');
const optionalCover = z
  .preprocess(
    (value) => (value == null || `${value}`.trim() === '' ? undefined : value),
    z.string().default('/images/uploads/cover-anime-hero-room.jpg'),
  )
  .transform(normalizeMediaPath);

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
    excerpt: z.string().max(256),
    author: z.string().default('A1right'),
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(180).optional(),
    categoryKey: z.enum(['web-security', 'ctf-writeup', 'agent-pentest']),
    category: z.string(),
    tags: z.array(z.string()).min(1).max(5),
    visibility: z.enum(['public', 'private']).default('public'),
    publishMode: z.enum(['now', 'scheduled']).default('now'),
    scheduledAt: optionalDate,
    publishedAt: z.coerce.date(),
    updatedAt: optionalDate,
    cover: optionalCover,
    coverAlt: z.string().optional().default(''),
    contentType: z.enum(['original', 'repost', 'translation']).default('original'),
    sourceUrl: optionalUrl,
    allowRepost: z.enum(['forbid', 'allow-with-attribution', 'cc-by-nc']).default('forbid'),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  articles,
};
