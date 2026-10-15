import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError, isHttps, parseCookies } from './http.js';

const scrypt = promisify(scryptCallback);

// Password hashes look like: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
// Create one with `npm run admin:wachtwoord`; it is stored only as a server-side secret.
export async function hashPassword(password, { N = 32768, r = 8, p = 1 } = {}) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 64, { N, r, p, maxmem: 128 * N * r * 2 });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(Number.isInteger) || N < 16384 || N > 1048576) return false;
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  const actual = await scrypt(String(password).normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: 128 * N * r * 2 });
  return expected.length > 0 && timingSafeEqual(actual, expected);
}

export const SESSION_IDLE = 24 * 60 * 60;          // logged out after a day without activity
export const SESSION_MAX = 7 * 24 * 60 * 60;       // and always after a week

export function adminConfig() {
  const username = process.env.ADMIN_USERNAME || 'marjon123';
  const passwordHash = process.env.ADMIN_PASSWORD_HASH || '';
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  const ready = passwordHash.startsWith('scrypt$') && secret.length >= 32;
  return { username, passwordHash, secret, ready };
}

// Changing the password hash invalidates every existing session.
function signingKey({ secret, passwordHash }) {
  return createHmac('sha256', secret).update(`marli-admin-session:${passwordHash}`).digest();
}

const b64 = buffer => Buffer.from(buffer).toString('base64url');
const sign = (key, payload) => createHmac('sha256', key).update(payload).digest('base64url');

export function cookieName(req) {
  return isHttps(req) ? '__Host-marli_admin' : 'marli_admin';
}

export function createSession(config, now = Date.now()) {
  const seconds = Math.floor(now / 1000);
  return { u: config.username, iat: seconds, seen: seconds, csrf: randomBytes(24).toString('base64url') };
}

export function sessionCookie(req, config, session) {
  const payload = b64(JSON.stringify(session));
  const value = `${payload}.${sign(signingKey(config), payload)}`;
  const secure = isHttps(req) ? '; Secure' : '';
  return `${cookieName(req)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_IDLE}${secure}`;
}

export function clearSessionCookie(req) {
  const secure = isHttps(req) ? '; Secure' : '';
  return `${cookieName(req)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function readSession(req, config, now = Date.now()) {
  if (!config.ready) return null;
  const raw = parseCookies(req)[cookieName(req)];
  if (!raw || raw.length > 2000) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(signingKey(config), payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let session;
  try { session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  const seconds = Math.floor(now / 1000);
  if (session.u !== config.username || typeof session.csrf !== 'string') return null;
  if (seconds - session.seen > SESSION_IDLE || seconds - session.iat > SESSION_MAX || session.iat > seconds + 60) return null;
  return session;
}

export function sameText(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// Every write needs the session's CSRF token in a header and a same-origin request.
export function requireWrite(req, session) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && new URL(origin).host !== host) throw new HttpError(403, 'forbidden', 'Deze actie is niet toegestaan.');
  if (!sameText(req.headers['x-csrf-token'] || '', session.csrf)) throw new HttpError(403, 'forbidden', 'Uw sessie is verlopen. Ververs de pagina.');
}
