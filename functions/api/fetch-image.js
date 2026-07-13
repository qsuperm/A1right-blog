const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const inferFilename = (url, contentType = '') => {
  try {
    const parsed = new URL(url);
    const fromPath = parsed.pathname.split('/').filter(Boolean).pop();
    if (fromPath) return fromPath;
  } catch {
    // ignore malformed path extraction here, validation happens elsewhere
  }

  if (contentType.includes('png')) return 'clipboard-image.png';
  if (contentType.includes('jpeg')) return 'clipboard-image.jpg';
  if (contentType.includes('webp')) return 'clipboard-image.webp';
  if (contentType.includes('gif')) return 'clipboard-image.gif';
  if (contentType.includes('svg')) return 'clipboard-image.svg';
  return 'clipboard-image.png';
};

export async function onRequestPost({ request }) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return new Response('缺少图片 URL。', { status: 400 });
    }

    const target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) {
      return new Response('只支持 http / https 图片地址。', { status: 400 });
    }

    const response = await fetch(target.toString(), {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'a1right-blog-image-fetcher',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(`远程图片拉取失败：${response.status}`, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return new Response('这个链接返回的不是图片。', { status: 415 });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > MAX_IMAGE_SIZE) {
      return new Response('图片太大了，超过 15MB。', { status: 413 });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return new Response('图片太大了，超过 15MB。', { status: 413 });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Source-Filename': inferFilename(target.toString(), contentType),
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(error instanceof Error ? error.message : '抓取图片失败。', { status: 500 });
  }
}
