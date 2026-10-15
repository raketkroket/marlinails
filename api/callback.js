import { timingSafeEqual } from 'node:crypto';
import { STATE_COOKIE, cookies, credentials, origin, sendResult, stateCookie } from './_oauth.js';

const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Step 2: GitHub returns here; exchange the one-time code for a token.
export default async function handler(req, res) {
  res.setHeader('Set-Cookie', stateCookie('', 0));
  const app = credentials();
  if (!app) {
    sendResult(res, 'error', { message: 'Het beheer is nog niet ingesteld.' }, 503);
    return;
  }
  const params = new URL(req.url, origin(req)).searchParams;
  const code = params.get('code');
  if (!code || !same(params.get('state'), cookies(req)[STATE_COOKIE])) {
    sendResult(res, 'error', { message: 'De inlogpoging is verlopen of ongeldig.' }, 400);
    return;
  }
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: app.id, client_secret: app.secret, code, redirect_uri: `${origin(req)}/api/callback` })
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error(data.error || `HTTP ${response.status}`);
    sendResult(res, 'success', { token: data.access_token, provider: 'github' });
  } catch (error) {
    console.error('GitHub OAuth failed:', error.message);
    sendResult(res, 'error', { message: 'GitHub kon de inlog niet bevestigen.' }, 502);
  }
}
