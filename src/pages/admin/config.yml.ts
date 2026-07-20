import type { APIRoute } from 'astro';
import { CMS, SITE } from '../../config';

export const prerender = true;

const siteUrl = new URL(SITE.provisionalUrl);
const oauthBaseUrl = 'https://a1right-blog.3223771807.workers.dev';
const quote = (value: string) => JSON.stringify(value);

type LocaleMode = 'zh-cn' | 'en';

interface OptionItem {
  label: string;
  value: string;
}

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
  categories: OptionItem[];
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

const tagHint = '建议 2~5 个标签，每个标签单独一项。可以直接点击后台推荐标签，或先填一个再点“添加标签 / Add tag”。';
const coverHint = '推荐使用 1200×630 横图，适合首页卡片、Open Graph 和社交分享。支持本地上传，也支持从正文第一张图直接提取。';
const categoryDisplayHint = '这里是前台实际显示的分类名称，请和上面的分类 Key 保持一致。';
const seoTitleHint = '留空时默认复用文章标题，建议控制在 60 字以内。';
const seoDescriptionHint = '留空时默认复用文章摘要，建议 70~120 字。';
const authorHint = '默认写入 A1right；如果以后有 guest post，再改成其他名字即可。';
const visibilityHint = '当前静态博客只公开构建“公开”文章；私密文章会保留在仓库里，但不会生成公开页面。';
const publishModeHint = '立即发布会按 publishedAt 上线；定时发布会等 scheduledAt 到达后才进入公开站点。';
const scheduledHint = '仅在“定时发布”时填写，格式为年月日 + 时间。';
const contentTypeHint = '原创可设置转载协议；转载 / 翻译建议补充原文链接。';
const sourceUrlHint = '如果是转载或翻译，请填写原文地址；原创可留空。';
const allowRepostHint = '原创文章可在这里声明是否允许转载。';
const toSelectOptions = (items: OptionItem[]) =>
  items.map((item) => `          - label: ${quote(item.label)}\n            value: ${quote(item.value)}`).join('\n');

const toSimpleOptions = (items: string[]) => items.map((item) => `          - ${quote(item)}`).join('\n');

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
  const isEnglish = locale === 'en';
  const visibilityOptions = isEnglish
    ? [
        { label: 'Public', value: 'public' },
        { label: 'Private (not built)', value: 'private' },
      ]
    : [
        { label: '公开', value: 'public' },
        { label: '私密（不公开构建）', value: 'private' },
      ];

  const publishOptions = isEnglish
    ? [
        { label: 'Publish now', value: 'now' },
        { label: 'Schedule publish', value: 'scheduled' },
      ]
    : [
        { label: '立即发布', value: 'now' },
        { label: '定时发布', value: 'scheduled' },
      ];

  const contentTypeOptions = isEnglish
    ? [
        { label: 'Original', value: 'original' },
        { label: 'Repost', value: 'repost' },
        { label: 'Translation', value: 'translation' },
      ]
    : [
        { label: '原创', value: 'original' },
        { label: '转载', value: 'repost' },
        { label: '翻译', value: 'translation' },
      ];

  const allowRepostOptions = isEnglish
    ? [
        { label: 'No repost', value: 'forbid' },
        { label: 'Allow with attribution', value: 'allow-with-attribution' },
        { label: 'CC BY-NC', value: 'cc-by-nc' },
      ]
    : [
        { label: '禁止转载', value: 'forbid' },
        { label: '允许转载（需署名）', value: 'allow-with-attribution' },
        { label: 'CC BY-NC', value: 'cc-by-nc' },
      ];

  const localeFieldLabel = '语言代码';
  const translationKeyLabel = '翻译组 Key';
  const translationKeyHint = '同一篇文章的中英文版本要共用同一个 translationKey，这样文章详情页才能互相切换。';
  const routeSlugLabel = isEnglish ? '英文路由 Slug' : '中文路由 Slug';
  const routeSlugHint = isEnglish
    ? '建议使用英文短链，例如 sql-login-bypass，最终会生成 /en/posts/routeSlug。'
    : '建议使用英文短链，例如 sql-login-bypass，最终会生成 /posts/routeSlug。';
  const titleLabel = isEnglish ? '英文标题' : '文章标题';
  const excerptLabel = isEnglish ? '英文摘要（≤ 256 字）' : '文章摘要（≤ 256 字）';
  const authorLabel = '作者 / 网名';
  const seoTitleLabel = 'SEO 标题';
  const seoDescriptionLabel = 'SEO 描述';
  const categoryKeyLabel = '分类 Key';
  const categoryLabel = isEnglish ? '英文分类显示名' : '分类显示名';
  const tagsLabel = isEnglish ? '英文标签' : '标签';
  const tagItemLabel = isEnglish ? 'Tag' : '标签';
  const tagSingularLabel = isEnglish ? 'Tag' : '标签';
  const visibilityLabel = isEnglish ? 'Visibility' : '可见性控制';
  const publishModeLabel = isEnglish ? 'Publish mode' : '发布方式';
  const scheduledAtLabel = isEnglish ? 'Scheduled publish time' : '定时发布时间';
  const publishedLabel = '发布日期';
  const updatedLabel = '更新日期';
  const coverLabel = '封面图';
  const coverAltLabel = isEnglish ? 'English cover description (optional)' : '封面描述（可选）';
  const contentTypeLabel = isEnglish ? 'Content copyright type' : '版权声明';
  const sourceUrlLabel = isEnglish ? 'Original source URL (optional)' : '原文链接（可选）';
  const allowRepostLabel = isEnglish ? 'Repost policy' : '转载协议';
  const pinnedLabel = '是否置顶';
  const draftLabel = '是否草稿';
  const bodyLabel = isEnglish ? '英文正文' : '正文';

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
        pattern: '\\d{4}'
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
${toSelectOptions(categories)}
      - label: ${quote(categoryLabel)}
        name: "category"
        widget: "select"
        hint: ${quote(categoryDisplayHint)}
        options:
${toSimpleOptions(categoryLabels)}
      - label: ${quote(tagsLabel)}
        name: "tags"
        widget: "list"
        label_singular: ${quote(tagSingularLabel)}
        min: 1
        max: 5
        allow_add: true
        allow_remove: true
        allow_reorder: true
        collapsed: false
        hint: ${quote(tagHint)}
        field:
          label: ${quote(tagItemLabel)}
          name: "tag"
          widget: "string"
      - label: ${quote(visibilityLabel)}
        name: "visibility"
        widget: "select"
        default: "public"
        hint: ${quote(visibilityHint)}
        options:
${toSelectOptions(visibilityOptions)}
      - label: ${quote(publishModeLabel)}
        name: "publishMode"
        widget: "select"
        default: "now"
        hint: ${quote(publishModeHint)}
        options:
${toSelectOptions(publishOptions)}
      - label: ${quote(scheduledAtLabel)}
        name: "scheduledAt"
        widget: "datetime"
        required: false
        format: "YYYY-MM-DD HH:mm"
        date_format: "YYYY-MM-DD"
        time_format: "HH:mm"
        hint: ${quote(scheduledHint)}
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
        required: false
        hint: ${quote(coverHint)}
      - label: ${quote(coverAltLabel)}
        name: "coverAlt"
        widget: "string"
        required: false
        default: ""
        hint: ${quote(contentHints.coverAlt)}
      - label: ${quote(contentTypeLabel)}
        name: "contentType"
        widget: "select"
        default: "original"
        hint: ${quote(contentTypeHint)}
        options:
${toSelectOptions(contentTypeOptions)}
      - label: ${quote(sourceUrlLabel)}
        name: "sourceUrl"
        widget: "string"
        required: false
        hint: ${quote(sourceUrlHint)}
      - label: ${quote(allowRepostLabel)}
        name: "allowRepost"
        widget: "select"
        default: "forbid"
        hint: ${quote(allowRepostHint)}
        options:
${toSelectOptions(allowRepostOptions)}
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
        widget: "a1right_wysiwyg"
        hint: ${quote(contentHints.body)}`;
};

const createFriendsConfig = () => `  - name: "friend_links"
    label: "\u53cb\u60c5\u94fe\u63a5"
    label_singular: "\u53cb\u94fe"
    description: "\u96c6\u4e2d\u7ba1\u7406\u53cb\u60c5\u94fe\u63a5\u6570\u636e\uff0c\u4fdd\u5b58\u540e\u4f1a\u540c\u6b65\u5230\u5bfc\u822a\u3001\u9996\u9875\u5165\u53e3\u548c /friends \u9875\u9762\u3002"
    files:
      - label: "\u53cb\u60c5\u94fe\u63a5"
        name: "friend_links"
        file: "src/data/friends.json"
        format: "json"
        editor:
          preview: false
        fields:
          - label: "\u53cb\u94fe\u5217\u8868"
            name: "links"
            widget: "list"
            label_singular: "\u53cb\u94fe"
            summary: "{{fields.name}} / {{fields.owner}}"
            collapsed: false
            allow_add: true
            allow_remove: true
            allow_reorder: true
            hint: "\u6bcf\u4e00\u9879\u5c31\u662f\u4e00\u4e2a\u53cb\u94fe\uff1b\u4fdd\u5b58\u540e\u4f1a\u81ea\u52a8\u540c\u6b65\u5230\u524d\u53f0\u53cb\u94fe\u9875\u3002"
            fields:
              - label: "\u7ad9\u70b9\u540d\u79f0"
                name: "name"
                widget: "string"
              - label: "\u7ad9\u70b9\u5730\u5740"
                name: "url"
                widget: "string"
                hint: "\u586b\u5199\u5b8c\u6574 https:// \u94fe\u63a5\u3002"
              - label: "\u5934\u50cf\u5730\u5740"
                name: "avatar"
                widget: "string"
                hint: "\u53ef\u586b\u5199\u7ad9\u5916\u5934\u50cf URL\uff0c\u6216\u4f60\u81ea\u5df1\u7ad9\u5185\u7684 /images/uploads/... \u8def\u5f84\u3002"
              - label: "\u7ad9\u957f\u6635\u79f0"
                name: "owner"
                widget: "string"
              - label: "\u7b80\u4ecb"
                name: "description"
                widget: "object"
                fields:
                  - label: "\u4e2d\u6587\u7b80\u4ecb"
                    name: "zhCn"
                    widget: "text"
                  - label: "\u82f1\u6587\u7b80\u4ecb"
                    name: "en"
                    widget: "text"
              - label: "\u6807\u7b7e"
                name: "tags"
                widget: "list"
                required: false
                allow_add: true
                allow_remove: true
                allow_reorder: true
                collapsed: false
                hint: "\u53ef\u9009\uff0c\u5efa\u8bae 1~4 \u4e2a\uff0c\u4f8b\u5982 Web / CTF / Blog\u3002"
                field:
                  label: "\u6807\u7b7e"
                  name: "tag"
                  widget: "string"
              - label: "RSS\uff08\u53ef\u9009\uff09"
                name: "rss"
                widget: "string"
                required: false
                hint: "\u5982\u679c\u5bf9\u65b9\u6709 RSS\uff0c\u53ef\u586b\u5b8c\u6574\u94fe\u63a5\u3002"`;

const config = `# Decap CMS config for A1right's blog
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
  base_url: ${quote(oauthBaseUrl)}
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
    title: '建议直接填写最终发布标题：首页卡片、文章详情页和 SEO 标题都会优先复用它。',
    excerpt: '建议 1~2 句话，控制在 256 字以内。首页摘要、搜索结果和 SEO 描述都会优先复用它。',
    body: '支持 Markdown / MDX。代码块、表格、列表、引用、公式、视频 iframe 和图片都可以直接写。',
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
  label: 'English Articles',
  labelSingular: 'English Article',
  description: 'Manage English articles here. Public URLs will be generated under /en/posts/routeSlug.',
  folder: 'src/content/articles/en',
  locale: 'en',
  previewPath: 'en/posts/{{fields.routeSlug}}',
  contentHints: {
    title: 'Use the final English title here. The hero card, detail page, and SEO title will reuse it by default.',
    excerpt: 'Keep it concise and within 256 characters. Search results and SEO description will reuse it by default.',
    body: 'Markdown / MDX is supported here, including code blocks, tables, formulas, iframe videos, and images.',
    coverAlt: 'Optional. Add an English image description here, for example “Anime character in a neon-lit city at dusk”. If left blank, the post title will be used as fallback.',
  },
  categories: [
    { label: 'Web Security', value: 'web-security' },
    { label: 'CTF Writeups', value: 'ctf-writeup' },
    { label: 'Agent Pentest', value: 'agent-pentest' },
  ],
  categoryLabels: ['Web Security', 'CTF Writeups', 'Agent Pentest'],
  filterLabels: {
    drafts: 'Drafts',
    pinned: 'Pinned',
    web: 'Web Security',
    ctf: 'CTF Writeups',
    agent: 'Agent Pentest',
    categoryGroup: 'Group by category',
    yearGroup: 'Group by year',
  },
})}

${createFriendsConfig()}`;

export const GET: APIRoute = async () =>
  new Response(`\uFEFF${config}`, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
