export function normalizeMediaPath(value: string) {
  const source = `${value ?? ''}`.trim();

  if (!source) return source;
  if (/^(?:[a-z]+:)?\/\//i.test(source) || source.startsWith('data:') || source.startsWith('blob:')) {
    return source;
  }

  const normalized = source
    .replace(/^\.\/+/, '')
    .replace(/^public\//, '')
    .replace(/^\/+/, '');

  return `/${normalized}`;
}
