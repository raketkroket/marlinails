// Shared helpers for the Decap CMS GitHub login (Vercel functions).
// Needs GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET as Vercel
// environment variables. Tokens are never stored; they go straight to /admin.
export const STATE_COOKIE = 'marli_oauth_state';
export const SCOPES = new Set(['public_repo', 'repo']);

export function origin(req) {
  return `https://${req.headers.host}`;
}

export function credentials() {
  const id = process.env.GITHUB_OAUTH_CLIENT_ID;
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(part => part.trim().split('='))
    .filter(([name, value]) => name && value).map(([name, value]) => [name, decodeURIComponent(value)]));
}

export function stateCookie(value, maxAge) {
  return `${STATE_COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

const escapeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');

// The popup page posts the result to the /admin window (see /admin/oauth-callback.js).
export function sendResult(res, status, content, httpStatus = 200) {
  const message = status === 'success'
    ? 'Ingelogd. Dit venster sluit vanzelf.'
    : 'Inloggen is niet gelukt. Sluit dit venster en probeer het opnieuw.';
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="robots" content="noindex">` +
    `<title>Inloggen | Marli Nails</title></head><body><p id="oauth-message">${message}</p>` +
    `<script type="application/json" id="oauth-result">${escapeJson({ status, content })}</script>` +
    `<script src="/admin/oauth-callback.js"></script></body></html>`;
  res.statusCode = httpStatus;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
}

export function sendText(res, httpStatus, text) {
  res.statusCode = httpStatus;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(text);
}
