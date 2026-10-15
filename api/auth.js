import { randomBytes } from 'node:crypto';
import { SCOPES, credentials, origin, sendText, stateCookie } from './_oauth.js';

// Step 1: send the editor to GitHub to log in.
export default function handler(req, res) {
  const app = credentials();
  if (!app) {
    sendText(res, 503, 'Het beheer is nog niet ingesteld: de GitHub OAuth-gegevens ontbreken.');
    return;
  }
  const params = new URL(req.url, origin(req)).searchParams;
  const provider = params.get('provider') || 'github';
  const scope = params.get('scope') || 'public_repo';
  if (provider !== 'github' || !SCOPES.has(scope)) {
    sendText(res, 400, 'Ongeldige aanvraag.');
    return;
  }
  const state = randomBytes(24).toString('hex');
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', app.id);
  authorize.searchParams.set('redirect_uri', `${origin(req)}/api/callback`);
  authorize.searchParams.set('scope', scope);
  authorize.searchParams.set('state', state);
  res.statusCode = 302;
  res.setHeader('Set-Cookie', stateCookie(state, 600));
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', authorize.toString());
  res.end();
}
