export function createAuthHtml(status, payload) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Decap CMS OAuth</title>
  </head>
  <body>
    <script>
      const receiveMessage = (message) => {
        window.opener.postMessage(
          'authorization:github:${status}:${JSON.stringify(payload)}',
          message.origin
        );
        window.removeEventListener('message', receiveMessage, false);
        window.close();
      };

      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '*');
    </script>
  </body>
</html>`;
}

export function getCookie(request, key) {
  const raw = request.headers.get('cookie') ?? '';
  const chunks = raw.split(';').map((item) => item.trim());

  for (const chunk of chunks) {
    if (!chunk.startsWith(`${key}=`)) continue;
    return decodeURIComponent(chunk.slice(key.length + 1));
  }

  return '';
}

export function createStateCookie(value, maxAge = 600) {
  return `decap_oauth_state=${encodeURIComponent(value)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearStateCookie() {
  return 'decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}
