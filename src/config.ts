export const SITE = {
  name: 'A1right的小窝', englishName: "A1right's Corner", author: 'A1right', githubUrl: 'https://github.com/qsuperm',
  provisionalUrl: 'https://a1right-blog.3223771807.workers.dev', avatarText: 'A1', socialImage: '/images/anime-hero-city.jpg',
  subtitles: { 'zh-cn': '记录 Web 安全、CTF 题解与 Agent 渗透实验', en: 'Web security, CTF writeups, and agent pentest experiments' },
  descriptions: {
    'zh-cn': 'A1right 的双语网络安全博客，聚焦 Web 安全、CTF 题解和 Agent 渗透，采用 Firefly 风格首页与轻量静态部署。',
    en: 'A bilingual Astro security blog focused on web security, CTF writeups, and agent pentest notes, with a Firefly-inspired homepage.',
  },
} as const;
export const CMS = { repo: 'qsuperm/A1right-blog', branch: 'master', locale: 'zh_Hans', mediaFolder: 'public/images/uploads', publicFolder: 'images/uploads', authEndpoint: '/api/auth' } as const;
export const locales = ['zh-cn', 'en'] as const;
export type Locale = (typeof locales)[number];
export const UI = {
  'zh-cn': {
    home: '首页', posts: '文章流', categories: '分类', categoriesHub: '分类页', lab: '实验区', tags: '标签', tagsHub: '标签页', latest: '最新文章', sticky: '置顶内容', featured: '推荐分类', github: 'GitHub',
    search: '搜索', searchShort: '搜索', searchPlaceholder: '搜索标题、摘要、标签或正文片段…', searchEmpty: '没有找到匹配内容，试试换一个关键词。', searchRecent: '快速查看',
    searchHint: 'Ctrl/⌘ + K 打开，↑↓ 切换，Enter 直达，Esc 关闭', close: '关闭', switchLanguage: 'English', switchLanguageLabel: '切换到英文', themeLabel: '切换明暗主题',
    footerNote: 'Astro + Pagefind + Cloudflare Workers，把安全笔记做成清爽的 Firefly 风格个人站。',
  },
  en: {
    home: 'Home', posts: 'Stories', categories: 'Categories', categoriesHub: 'Categories', lab: 'Lab', tags: 'Tags', tagsHub: 'Tags', latest: 'Latest Posts', sticky: 'Pinned', featured: 'Featured Categories', github: 'GitHub',
    search: 'Search', searchShort: 'Search', searchPlaceholder: 'Search titles, excerpts, tags, or article text…', searchEmpty: 'No matching content yet. Try another keyword.', searchRecent: 'Quick picks',
    searchHint: 'Ctrl/⌘ + K opens search, ↑↓ switches, Enter opens, Esc closes', close: 'Close', switchLanguage: '中文', switchLanguageLabel: 'Switch to Chinese', themeLabel: 'Toggle color theme',
    footerNote: 'Astro + Pagefind + Cloudflare Workers, shaping this cyber notebook into a cleaner Firefly-style home.',
  },
} as const;
