import type { Locale } from '../config';
import rawFriends from './friends.json';

export interface FriendLink {
  name: string;
  url: string;
  avatar: string;
  owner: string;
  description: Record<Locale, string>;
  tags?: string[];
  rss?: string;
}

interface FriendLinkSource {
  name: string;
  url: string;
  avatar: string;
  owner: string;
  description: {
    zhCn: string;
    en: string;
  };
  tags?: string[];
  rss?: string;
}

interface FriendLinksStore {
  links?: FriendLinkSource[];
}

const friendLinksStore = rawFriends as FriendLinksStore;

export const FRIEND_LINKS: FriendLink[] = (friendLinksStore.links ?? []).map((item) => ({
  name: item.name,
  url: item.url,
  avatar: item.avatar,
  owner: item.owner,
  description: {
    'zh-cn': item.description.zhCn,
    en: item.description.en,
  },
  tags: item.tags ?? [],
  rss: item.rss,
}));

export const FRIEND_SELF_CARD = {
  name: 'A1right\u7684\u5c0f\u7a9d',
  url: 'https://itsa1right.ink',
  avatar: '/images/a1right-avatar.png',
  owner: 'A1right',
  description: {
    'zh-cn': '\u7f51\u7edc\u5b89\u5168\u3001CTF \u4e0e Agent \u6e17\u900f\u5b66\u4e60\u8bb0\u5f55\u3002',
    en: 'A bilingual notebook for web security, CTF writeups, and agent pentest notes.',
  },
} as const;

export const FRIEND_PAGE_COPY: Record<
  Locale,
  {
    navLabel: string;
    title: string;
    description: string;
    eyebrow: string;
    stats: string[];
    entryTitle: string;
    entryText: string;
    entryAction: string;
    openStatus: string;
    sectionTitle: string;
    sectionHint: string;
    emptyTitle: string;
    emptyText: string;
    exchangeTitle: string;
    exchangeText: string;
    exchangeRules: string[];
    siteInfoTitle: string;
    siteInfoLabels: {
      name: string;
      url: string;
      owner: string;
      avatar: string;
      summary: string;
    };
  }
> = {
  'zh-cn': {
    navLabel: '\u53cb\u94fe',
    title: '\u53cb\u60c5\u94fe\u63a5',
    description: '\u628a\u957f\u671f\u66f4\u65b0\u3001\u98ce\u683c\u7a33\u5b9a\u7684\u4e2a\u4eba\u7ad9\u6574\u7406\u5728\u4e00\u8d77\uff0c\u4e5f\u9884\u7559\u4e00\u4e2a\u6e05\u6670\u7684\u4f4d\u7f6e\u6765\u4ea4\u6362\u53cb\u94fe\u3002',
    eyebrow: 'Friends',
    stats: ['\u6301\u7eed\u5f00\u653e\u4ea4\u6362', '\u540e\u53f0\u7edf\u4e00\u7ef4\u62a4'],
    entryTitle: '\u53cb\u60c5\u94fe\u63a5',
    entryText: '\u5355\u72ec\u9875\u7edf\u4e00\u5c55\u793a\u53cb\u94fe\uff1b\u4ee5\u540e\u4f60\u53ea\u9700\u8981\u5728\u540e\u53f0\u7ef4\u62a4\uff0c\u5bfc\u822a\u3001\u9996\u9875\u5165\u53e3\u548c\u53cb\u94fe\u9875\u4f1a\u4e00\u8d77\u540c\u6b65\u3002',
    entryAction: '\u67e5\u770b\u53cb\u94fe\u9875',
    openStatus: 'Open for exchange',
    sectionTitle: '\u5df2\u6536\u5f55\u53cb\u94fe',
    sectionHint: '\u540e\u7eed\u53ea\u9700\u8981\u5728\u540e\u53f0\u7ef4\u62a4\u53cb\u60c5\u94fe\u63a5\uff0c\u5e95\u5c42\u6570\u636e\u4f1a\u5199\u5165 `src/data/friends.json`\u3002',
    emptyTitle: '\u53cb\u94fe\u4f4d\u5df2\u9884\u7559',
    emptyText: '\u73b0\u5728\u8fd8\u6ca1\u6709\u6b63\u5f0f\u5f55\u5165\u7684\u53cb\u94fe\u3002\u7b49\u4f60\u5728\u540e\u53f0\u52a0\u4e00\u6761\u4e4b\u540e\uff0c\u8fd9\u91cc\u4f1a\u81ea\u52a8\u663e\u793a\u51fa\u6765\u3002',
    exchangeTitle: '\u4ea4\u6362\u8bf4\u660e',
    exchangeText: '\u5982\u679c\u5bf9\u65b9\u60f3\u548c\u4f60\u4e92\u6302\uff0c\u76f4\u63a5\u628a\u4e0b\u9762\u8fd9\u4efd\u7ad9\u70b9\u4fe1\u606f\u53d1\u8fc7\u53bb\u5373\u53ef\u3002',
    exchangeRules: [
      '\u4f18\u5148\u957f\u671f\u66f4\u65b0\u7684\u4e2a\u4eba\u535a\u5ba2\u3001\u6280\u672f\u7b14\u8bb0\u6216\u4f5c\u54c1\u7ad9\u3002',
      '\u5efa\u8bae\u5168\u7ad9 HTTPS \u53ef\u8bbf\u95ee\uff0c\u5934\u50cf\u548c\u7ad9\u70b9\u63cf\u8ff0\u5c3d\u91cf\u7a33\u5b9a\u3002',
      '\u540e\u7eed\u53ea\u9700\u8981\u5728\u540e\u53f0\u7ef4\u62a4\uff0c\u4e0d\u7528\u53cd\u590d\u6539\u9875\u9762\u4ee3\u7801\u3002',
    ],
    siteInfoTitle: '\u6211\u7684\u7ad9\u70b9\u4fe1\u606f',
    siteInfoLabels: {
      name: '\u7ad9\u70b9\u540d\u79f0',
      url: '\u7ad9\u70b9\u5730\u5740',
      owner: '\u7ad9\u957f\u6635\u79f0',
      avatar: '\u5934\u50cf\u5730\u5740',
      summary: '\u7ad9\u70b9\u7b80\u4ecb',
    },
  },
  en: {
    navLabel: 'Friends',
    title: 'Friend Links',
    description: 'A dedicated page for blogs and personal sites worth revisiting, with one central admin-managed data source.',
    eyebrow: 'Friends',
    stats: ['Open for exchange', 'Managed from admin'],
    entryTitle: 'Friend Links',
    entryText: 'A dedicated page for partner blogs. Later you only need the admin panel, and the nav, homepage entry, and friend page stay in sync.',
    entryAction: 'Open friend links',
    openStatus: 'Open for exchange',
    sectionTitle: 'Listed friends',
    sectionHint: 'Later you can manage everything from the admin panel. The underlying data is stored in `src/data/friends.json`.',
    emptyTitle: 'Friend slots are ready',
    emptyText: 'No external sites are listed yet. Add one item from the admin panel and it will appear here automatically.',
    exchangeTitle: 'Exchange notes',
    exchangeText: 'If someone wants to exchange links with you, send them the site info below.',
    exchangeRules: [
      'Prefer active personal blogs, technical notebooks, or portfolio sites.',
      'HTTPS, stable access, and a persistent avatar/description are recommended.',
      'After this setup, you only manage links from the admin panel instead of editing multiple files.',
    ],
    siteInfoTitle: 'My site info',
    siteInfoLabels: {
      name: 'Site name',
      url: 'Site URL',
      owner: 'Owner',
      avatar: 'Avatar URL',
      summary: 'Summary',
    },
  },
};
