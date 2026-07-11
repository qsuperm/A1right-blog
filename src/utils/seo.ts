import { SITE, type Locale } from '../config';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function toAbsoluteUrl(path: string) {
  return new URL(path, SITE.provisionalUrl).toString();
}

export function getSchemaLanguage(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'zh-CN';
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: toAbsoluteUrl(item.href),
    })),
  };
}

export function buildCollectionPageJsonLd({
  title,
  description,
  path,
  locale,
}: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
}) {
  const siteName = locale === 'en' ? SITE.englishName : SITE.name;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: toAbsoluteUrl(path),
    inLanguage: getSchemaLanguage(locale),
    author: {
      '@type': 'Person',
      name: SITE.author,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: SITE.provisionalUrl,
    },
  };
}
