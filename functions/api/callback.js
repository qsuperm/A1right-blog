import { clearStateCookie, createAuthHtml, getCookie } from './_utils.js';

export async function onRequest({ request, env }) {
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response('Missing GitHub OAuth environment variables.', { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const storedState = getCookie(request, 'decap_oauth_state');

    if (!code) {
      return new Response(createAuthHtml('error', { error: 'missing_code' }), {
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': clearStateCookie(),
        },
      });
    }

    if (!returnedState || !storedState || returnedState !== storedState) {
      return new Response(createAuthHtml('error', { error: 'state_mismatch' }), {
        status: 401,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': clearStateCookie(),
        },
      });
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': 'a1right-blog-decap-oauth',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const result = await response.json();
    if (result.error) {
      return new Response(createAuthHtml('error', result), {
        status: 401,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': clearStateCookie(),
        },
      });
    }

    return new Response(
      createAuthHtml('success', {
        token: result.access_token,
        provider: 'github',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': clearStateCookie(),
        },
      },
    );
  } catch (error) {
    console.error(error);
    return new Response(createAuthHtml('error', { error: 'unexpected_error' }), {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': clearStateCookie(),
      },
    });
  }
}
