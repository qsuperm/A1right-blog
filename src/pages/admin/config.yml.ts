import type { APIRoute } from 'astro';
import { CMS, SITE } from '../../config';

export const prerender = true;

const siteUrl = new URL(SITE.provisionalUrl);
const quote = (value: string) => JSON.stringify(value);

type LocaleMode = 'zh-cn' | 'en';

interface CollectionMeta {
  name: string;
  label: string;
  labelSingular: string;
  description: string;
  folder: string;
  locale: LocaleMode;
  previewPath: string;
  contentHints: {
    title: string;
    excerpt: string;
    body: string;
    coverAlt: string;
  };
  categories: Array<{ label: string; value: string }>;
  categoryLabels: string[];
  filterLabels: {
    drafts: string;
    pinned: string;
    web: string;
    ctf: string;
    agent: string;
    categoryGroup: string;
    yearGroup: string;
  };
}

const tagHint = '建议 2~5 个标签，每个标签单独一项；先填写一个标签，再点下方“添加标签 / Add tag”。不要写成一个 #misc#CTF#LitCTF2026 这样的长字符串。';
const coverHint = '推荐使用 1200×630 横图，适合首页卡片、Open Graph 和社交分享。';
const categoryDisplayHint = '这里是前台显示文案，请和上面的分类 Key 选项保持一致。';
const seoTitleHint = '留空时默认使用文章标题。建议控制在 60 字以内。';
const seoDescriptionHint = '留空时默认使用文章摘要。建议 70~120 字，便于搜索结果和社交分享复用。';
const authorHint = '默认写入 A1right；如果以后想写 guest post，再改成其他名字即可。';
const defaultCover = '/images/uploads/cover-anime-hero-room.jpg';

const createCollection = ({
  name,
  label,
  labelSingular,
  description,
  folder,
  locale,
  previewPath,
  contentHints,
  categories,
  categoryLabels,
  filterLabels,
}: CollectionMeta) => {
  const localeFieldLabel = '语言代码';
  const translationKeyLabel = '翻译组 Key';
  const translationKeyHint = '同一篇文章的中英文版本要保持同一个 translationKey，文章详情页才能互相切换。';
  const routeSlugLabel = locale === 'en' ? '英文路由 Slug' : '中文路由 Slug';
  const routeSlugHint =
    locale === 'en'
      ? '建议使用英文短链，例如 sql-login-bypass，最终会生成 /en/posts/routeSlug。'
      : '建议使用英文短链，例如 sql-login-bypass，最终会生成 /posts/routeSlug。';
  const titleLabel = locale === 'en' ? '英文标题' : '文章标题';
  const excerptLabel = locale === 'en' ? '英文摘要' : '文章摘要';
  const authorLabel = '作者 / 网名';
  const seoTitleLabel = 'SEO 标题';
  const seoDescriptionLabel = 'SEO 描述';
  const categoryKeyLabel = '分类 Key';
  const categoryLabel = locale === 'en' ? '英文分类显示名' : '分类显示名';
  const tagsLabel = locale === 'en' ? '英文标签' : '标签';
  const tagItemLabel = locale === 'en' ? 'Tag' : '标签';
  const tagSingularLabel = locale === 'en' ? 'Tag' : '标签';
  const coverLabel = '封面图';
  const coverAltLabel = locale === 'en' ? '英文封面描述（可选）' : '封面描述（可选）';
  const publishedLabel = '发布日期';
  const updatedLabel = '更新日期';
  const pinnedLabel = '是否置顶';
  const draftLabel = '是否草稿';
  const bodyLabel = locale === 'en' ? '英文正文' : '正文';
  const categoryOptions = categories
    .map((item) => `          - label: ${quote(item.label)}\n            value: ${quote(item.value)}`)
    .join('\n');
  const categoryTextOptions = categoryLabels.map((item) => `          - ${quote(item)}`).join('\n');

  return `  - name: ${quote(name)}
    label: ${quote(label)}
    label_singular: ${quote(labelSingular)}
    description: ${quote(description)}
    folder: ${quote(folder)}
    create: true
    extension: "mdx"
    format: "frontmatter"
    identifier_field: "title"
    slug: "{{fields.routeSlug}}"
    summary: "{{title}} · {{publishedAt}} · {{category}}"
    preview_path: ${quote(previewPath)}
    editor:
      preview: false
    sortable_fields:
      - publishedAt
      - updatedAt
      - title
      - commit_date
    view_filters:
      - label: ${quote(filterLabels.drafts)}
        field: draft
        pattern: true
      - label: ${quote(filterLabels.pinned)}
        field: pinned
        pattern: true
      - label: ${quote(filterLabels.web)}
        field: categoryKey
        pattern: "web-security"
      - label: ${quote(filterLabels.ctf)}
        field: categoryKey
        pattern: "ctf-writeup"
      - label: ${quote(filterLabels.agent)}
        field: categoryKey
        pattern: "agent-pentest"
    view_groups:
      - label: ${quote(filterLabels.categoryGroup)}
        field: category
      - label: ${quote(filterLabels.yearGroup)}
        field: publishedAt
        pattern: "\\\\d{4}"
    fields:
      - label: ${quote(translationKeyLabel)}
        name: "translationKey"
        widget: "string"
        hint: ${quote(translationKeyHint)}
      - label: ${quote(localeFieldLabel)}
        name: "locale"
        widget: "hidden"
        default: ${quote(locale)}
      - label: ${quote(routeSlugLabel)}
        name: "routeSlug"
        widget: "string"
        hint: ${quote(routeSlugHint)}
      - label: ${quote(titleLabel)}
        name: "title"
        widget: "string"
        hint: ${quote(contentHints.title)}
      - label: ${quote(excerptLabel)}
        name: "excerpt"
        widget: "text"
        hint: ${quote(contentHints.excerpt)}
      - label: ${quote(authorLabel)}
        name: "author"
        widget: "string"
        default: ${quote(SITE.author)}
        hint: ${quote(authorHint)}
      - label: ${quote(seoTitleLabel)}
        name: "seoTitle"
        widget: "string"
        required: false
        hint: ${quote(seoTitleHint)}
      - label: ${quote(seoDescriptionLabel)}
        name: "seoDescription"
        widget: "text"
        required: false
        hint: ${quote(seoDescriptionHint)}
      - label: ${quote(categoryKeyLabel)}
        name: "categoryKey"
        widget: "select"
        options:
${categoryOptions}
      - label: ${quote(categoryLabel)}
        name: "category"
        widget: "select"
        hint: ${quote(categoryDisplayHint)}
        options:
${categoryTextOptions}
      - label: ${quote(tagsLabel)}
        name: "tags"
        widget: "list"
        label_singular: ${quote(tagSingularLabel)}
        min: 1
        max: 6
        allow_add: true
        allow_remove: true
        allow_reorder: true
        collapsed: false
        hint: ${quote(tagHint)}
        field:
          label: ${quote(tagItemLabel)}
          name: "tag"
          widget: "string"
      - label: ${quote(publishedLabel)}
        name: "publishedAt"
        widget: "datetime"
        format: "YYYY-MM-DD"
        date_format: "YYYY-MM-DD"
        time_format: false
      - label: ${quote(updatedLabel)}
        name: "updatedAt"
        widget: "datetime"
        required: false
        format: "YYYY-MM-DD"
        date_format: "YYYY-MM-DD"
        time_format: false
      - label: ${quote(coverLabel)}
        name: "cover"
        widget: "image"
        default: ${quote(defaultCover)}
        hint: ${quote(coverHint)}
      - label: ${quote(coverAltLabel)}
        name: "coverAlt"
        widget: "string"
        required: false
        default: ""
        hint: ${quote(contentHints.coverAlt)}
      - label: ${quote(pinnedLabel)}
        name: "pinned"
        widget: "boolean"
        default: false
      - label: ${quote(draftLabel)}
        name: "draft"
        widget: "boolean"
        default: false
      - label: ${quote(bodyLabel)}
        name: "body"
        widget: "markdown"
        hint: ${quote(contentHints.body)}`;
};

const config = `# Decap CMS config for A1right's blog
# Repo and branch come from src/config.ts
local_backend: true
locale: ${quote(CMS.locale)}
show_preview_links: true
publish_mode: "simple"
logo:
  src: "/images/a1right-avatar-icon.png?v=20260713-avatar"
  show_in_header: true
backend:
  name: "github"
  repo: ${quote(CMS.repo)}
  branch: ${quote(CMS.branch)}
  site_domain: ${quote(siteUrl.hostname)}
  base_url: ${quote(siteUrl.origin)}
  auth_endpoint: ${quote(CMS.authEndpoint)}
  commit_messages:
    create: "创建 {{collection}}：{{slug}}"
    update: "更新 {{collection}}：{{slug}}"
    delete: "删除 {{collection}}：{{slug}}"
    uploadMedia: "上传媒体：{{path}}"
    deleteMedia: "删除媒体：{{path}}"
    openAuthoring: "{{message}}"
media_folder: ${quote(CMS.mediaFolder)}
public_folder: ${quote(CMS.publicFolder)}
site_url: ${quote(siteUrl.origin)}
display_url: ${quote(siteUrl.origin)}
slug:
  encoding: "ascii"
  clean_accents: true
  sanitize_replacement: "-"
collections:
${createCollection({
  name: 'articles_zh',
  label: '中文文章',
  labelSingular: '中文文章',
  description: '这里管理中文站点的文章，最终访问路径是 /posts/routeSlug。',
  folder: 'src/content/articles/zh-cn',
  locale: 'zh-cn',
  previewPath: 'posts/{{fields.routeSlug}}',
  contentHints: {
    title: '建议直接写发布标题，首页卡片、文章详情页和 SEO 标题都会默认复用它。',
    excerpt: '建议 1~2 句话，首页摘要、搜索结果和 SEO 描述都会优先复用它。',
    body: '支持 Markdown / MDX。代码块、表格、列表、引用和图片都可以直接写。',
    coverAlt: '可选。写给搜索引擎和无障碍设备的图片描述，例如“夜幕城市里的二次元角色插画”。不填时前台会回退到文章标题。',
  },
  categories: [
    { label: 'Web 安全', value: 'web-security' },
    { label: 'CTF 题解', value: 'ctf-writeup' },
    { label: 'Agent 渗透', value: 'agent-pentest' },
  ],
  categoryLabels: ['Web 安全', 'CTF 题解', 'Agent 渗透'],
  filterLabels: {
    drafts: '草稿',
    pinned: '置顶',
    web: 'Web 安全',
    ctf: 'CTF 题解',
    agent: 'Agent 渗透',
    categoryGroup: '按分类分组',
    yearGroup: '按年份分组',
  },
})}
${createCollection({
  name: 'articles_en',
  label: '英文文章',
  labelSingular: '英文文章',
  description: '这里管理英文站点的文章，最终访问路径是 /en/posts/routeSlug。',
  folder: 'src/content/articles/en',
  locale: 'en',
  previewPath: 'en/posts/{{fields.routeSlug}}',
  contentHints: {
    title: '这里填写英文标题；建议和中文版使用同一个 translationKey。',
    excerpt: '这里填写英文摘要，搜索结果和 SEO 描述会优先复用它。',
    body: '这里填写英文正文内容，支持 Markdown / MDX。',
    coverAlt: 'Optional. Add an English image description here, for example “Anime character in a neon-lit city at dusk”. If left blank, the post title will be used as fallback.',
  },
  categories: [
    { label: 'Web Security', value: 'web-security' },
    { label: 'CTF Writeups', value: 'ctf-writeup' },
    { label: 'Agent Pentest', value: 'agent-pentest' },
  ],
  categoryLabels: ['Web Security', 'CTF Writeups', 'Agent Pentest'],
  filterLabels: {
    drafts: '草稿',
    pinned: '置顶',
    web: 'Web Security',
    ctf: 'CTF Writeups',
    agent: 'Agent Pentest',
    categoryGroup: '按分类分组',
    yearGroup: '按年份分组',
  },
})}
`;

export const GET: APIRoute = async () =>
  new Response(`\uFEFF${config}`, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
