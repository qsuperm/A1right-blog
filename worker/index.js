import { onRequest as authHandler } from '../functions/api/auth.js';
import { onRequest as callbackHandler } from '../functions/api/callback.js';

function notFound() {
  return new Response('Not Found', { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/auth') {
      return authHandler({ request, env });
    }

    if (url.pathname === '/api/callback') {
      return callbackHandler({ request, env });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return notFound();
  },
};
