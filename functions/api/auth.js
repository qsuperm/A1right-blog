import { createStateCookie } from './_utils.js';

export async function onRequest({ request, env }) {
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response('Missing GITHUB_CLIENT_ID environment variable.', { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const redirectUrl = new URL('https://github.com/login/oauth/authorize');
    const state = crypto.randomUUID().replace(/-/g, '');

    redirectUrl.searchParams.set('client_id', clientId);
    redirectUrl.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
    redirectUrl.searchParams.set('scope', 'repo user');
    redirectUrl.searchParams.set('state', state);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.href,
        'Set-Cookie': createStateCookie(state),
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(error instanceof Error ? error.message : 'Unknown auth error', { status: 500 });
  }
}
