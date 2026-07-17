import { TextEncoder } from 'node:util';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../config';

export type ArticleEntry = CollectionEntry<'articles'>;
export type CategoryKey = keyof typeof CATEGORY_META;
export const POSTS_PER_PAGE = 3;

export const CATEGORY_META = {
  'web-security': {
    'zh-cn': {
      name: 'Web 安全',
      desc: '认证、文件上传、会话状态与浏览器侧行为这几类最常回头复盘的主题。',
    },
    en: {
      name: 'Web Security',
      desc: 'Authentication, upload boundaries, session traces, and browser-side behavior worth revisiting.',
    },
  },
  'ctf-writeup': {
    'zh-cn': {
      name: 'CTF 题解',
      desc: '保留失败尝试、关键分支与回放步骤，而不是只留下最后一条 payload。',
    },
    en: {
      name: 'CTF Writeups',
      desc: 'Writeups that keep failed attempts, decisive branches, and replayable solve steps.',
    },
  },
  'agent-pentest': {
    'zh-cn': {
      name: 'Agent 渗透',
      desc: '围绕工具调用链、浏览器自动化、MCP 接缝与可复现观察点整理实验。',
    },
    en: {
      name: 'Agent Pentest',
      desc: 'Notes around toolchains, browser automation, MCP seams, and reproducible checkpoints.',
    },
  },
} as const;

const encoder = new TextEncoder();

export function sortArticles(entries: ArticleEntry[]) {
  return [...entries].sort((a, b) => {
    const timeA = a.data.publishedAt.getTime();
    const timeB = b.data.publishedAt.getTime();
    if (timeA !== timeB) return timeB - timeA;
    return a.data.title.localeCompare(b.data.title);
  });
}

export function isArticlePublished(entry: ArticleEntry, now = new Date()) {
  if (entry.data.draft) return false;
  if (entry.data.visibility !== 'public') return false;
  if (entry.data.publishMode !== 'scheduled') return true;
  if (!entry.data.scheduledAt) return true;
  return entry.data.scheduledAt.getTime() <= now.getTime();
}

export async function getArticlesByLocale(locale: Locale) {
  const now = new Date();
  const entries = await getCollection('articles', ({ data }) => data.locale === locale);
  return sortArticles(entries.filter((entry) => isArticlePublished(entry, now)));
}

export function getArticleUrl(entry: ArticleEntry) {
  return entry.data.locale === 'en'
    ? `/en/posts/${entry.data.routeSlug}`
    : `/posts/${entry.data.routeSlug}`;
}

export function getLocaleHome(locale: Locale) {
  return locale === 'en' ? '/en' : '/';
}

export function getCategoryUrl(locale: Locale, key: CategoryKey) {
  return locale === 'en' ? `/en/categories/${key}` : `/categories/${key}`;
}

export function getCategoriesIndexUrl(locale: Locale) {
  return locale === 'en' ? '/en/categories' : '/categories';
}

export function getPostsIndexUrl(locale: Locale) {
  return locale === 'en' ? '/en/posts' : '/posts';
}

export function getFriendsUrl(locale: Locale) {
  return locale === 'en' ? '/en/friends' : '/friends';
}

export function getPostsPageUrl(locale: Locale, page: number) {
  const normalized = Math.max(1, Math.floor(page));
  return normalized === 1 ? getPostsIndexUrl(locale) : `${getPostsIndexUrl(locale)}/page/${normalized}`;
}

export function getTagsIndexUrl(locale: Locale) {
  return locale === 'en' ? '/en/tags' : '/tags';
}

export function slugifyTerm(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized) return normalized;

  const bytes = Array.from(encoder.encode(value))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');

  return `term-${bytes}`;
}

export function getTagUrl(locale: Locale, tag: string) {
  const slug = slugifyTerm(tag);
  return locale === 'en' ? `/en/tags/${slug}` : `/tags/${slug}`;
}

export function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getReadingMinutesFromText(text: string) {
  const cjkCount = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinWords = text
    .replace(/[\u3400-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = cjkCount / 320 + latinWords / 220;
  return Math.max(1, Math.ceil(minutes));
}

export function getUniqueTagCount(entries: ArticleEntry[]) {
  return new Set(entries.flatMap((entry) => entry.data.tags)).size;
}

export function padCount(value: number) {
  return String(value).padStart(2, '0');
}

export function collectTags(entries: ArticleEntry[]) {
  const map = new Map<
    string,
    {
      name: string;
      slug: string;
      count: number;
      entries: ArticleEntry[];
    }
  >();

  for (const entry of entries) {
    for (const tag of entry.data.tags) {
      const existing = map.get(tag);
      if (existing) {
        existing.count += 1;
        existing.entries.push(entry);
      } else {
        map.set(tag, {
          name: tag,
          slug: slugifyTerm(tag),
          count: 1,
          entries: [entry],
        });
      }
    }
  }

  return [...map.values()]
    .map((item) => ({ ...item, entries: sortArticles(item.entries) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function stripMarkdown(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/[>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSearchDocuments(entries: ArticleEntry[]) {
  return sortArticles(entries).map((entry) => ({
    title: entry.data.title,
    excerpt: entry.data.excerpt,
    category: entry.data.category,
    tags: entry.data.tags,
    url: getArticleUrl(entry),
    publishedAt: entry.data.publishedAt.toISOString(),
    publishedLabel: entry.data.publishedAt,
    cover: entry.data.cover,
    searchText: [
      entry.data.title,
      entry.data.excerpt,
      entry.data.category,
      ...entry.data.tags,
      stripMarkdown(entry.body ?? ''),
    ]
      .join(' ')
      .toLowerCase(),
  }));
}

export function getPaginatedArticleChunks(entries: ArticleEntry[], perPage = POSTS_PER_PAGE) {
  const sortedEntries = sortArticles(entries);
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / perPage));

  return Array.from({ length: totalPages }, (_, index) => ({
    currentPage: index + 1,
    totalPages,
    items: sortedEntries.slice(index * perPage, (index + 1) * perPage),
  }));
}
