import { createHmac } from 'node:crypto';
import { contentFiles, contentVersion } from '../scripts/content.mjs';
import { adminConfig, clearSessionCookie, createSession, readSession, requireWrite, sameText, sessionCookie, verifyPassword } from './_lib/auth.js';
import { HttpError, clientIp, readJson, sendJson } from './_lib/http.js';
import { processPhoto, uploadId } from './_lib/images.js';
import { attempts, clearAttempts, rateLimitReady, recordFailure } from './_lib/ratelimit.js';
import { getStorage, gitSha, serialize, uploadPath } from './_lib/storage.js';
import { IMAGE_PATH, imagePaths, validateFile } from './_lib/validate.js';

// Admin API for Marjon's website editor: /api/admin?action=...
// Every action except status/login requires a valid session; every write also requires
// the session's CSRF token. Content is validated server-side before it is stored.
const IP_LIMIT = 5;          // failed logins per IP per 15 minutes
const USER_LIMIT = 20;       // failed logins for the account per hour (all IPs together)
const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

const signUpload = (config, id, shas) =>
  createHmac('sha256', config.secret).update(`upload:${id}:${shas[640]}:${shas[1440]}`).digest('base64url');

function ready() {
  const config = adminConfig();
  const storage = getStorage();
  if (!config.ready || !storage || !rateLimitReady()) {
    throw new HttpError(503, 'not_configured', 'Het beheer is nog niet volledig ingesteld. Neem contact op met uw websitebouwer.');
  }
  return { config, storage };
}

function authenticated(req, res, config) {
  const session = readSession(req, config);
  if (!session) throw new HttpError(401, 'unauthenticated', 'U bent uitgelogd. Log opnieuw in.');
  session.seen = Math.floor(Date.now() / 1000);
  res.setHeader('Set-Cookie', sessionCookie(req, config, session)); // rolling idle timeout
  return session;
}

const actions = {
  async status(req, res) {
    const config = adminConfig();
    sendJson(res, 200, { ready: config.ready && Boolean(getStorage()) && rateLimitReady() });
  },

  async login(req, res) {
    const { config } = ready();
    const body = await readJson(req);
    const username = typeof body.username === 'string' ? body.username.trim().slice(0, 200) : '';
    const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
    const ipKey = `marli:login:ip:${clientIp(req)}`;
    const userKey = 'marli:login:user';
    const [ip, user] = await Promise.all([attempts(ipKey), attempts(userKey)]);
    if (ip.count >= IP_LIMIT || user.count >= USER_LIMIT) {
      const minutes = Math.ceil(Math.max(ip.count >= IP_LIMIT ? ip.retryAfter : 0, user.count >= USER_LIMIT ? user.retryAfter : 0) / 60);
      throw new HttpError(429, 'rate_limited', `Te veel inlogpogingen. Probeer het over ${minutes} ${minutes === 1 ? 'minuut' : 'minuten'} opnieuw.`);
    }
    // Always run the slow password check, so a wrong username takes as long as a wrong password.
    const passwordOk = await verifyPassword(password, config.passwordHash || DUMMY_HASH);
    if (!(sameText(username.toLowerCase(), config.username.toLowerCase()) && passwordOk)) {
      await Promise.all([recordFailure(ipKey, 15 * 60), recordFailure(userKey, 60 * 60)]);
      throw new HttpError(401, 'wrong_credentials', 'Gebruikersnaam of wachtwoord klopt niet.');
    }
    await clearAttempts(ipKey);
    const session = createSession(config);
    sendJson(res, 200, { name: 'Marjon', csrf: session.csrf }, { 'Set-Cookie': sessionCookie(req, config, session) });
  },

  async logout(req, res) {
    const config = adminConfig();
    const session = readSession(req, config);
    if (session) requireWrite(req, session);
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(req) });
  },

  async session(req, res) {
    const { config } = ready();
    if (!readSession(req, config)) { sendJson(res, 200, { authenticated: false }); return; }
    const session = authenticated(req, res, config);
    sendJson(res, 200, { authenticated: true, name: 'Marjon', username: config.username, csrf: session.csrf });
  },

  async content(req, res) {
    const { config, storage } = ready();
    authenticated(req, res, config);
    const snapshot = await storage.snapshot();
    const data = Object.fromEntries(contentFiles.map(name => [name, snapshot.files[name].data]));
    sendJson(res, 200, {
      content: data,
      versions: Object.fromEntries(contentFiles.map(name => [name, snapshot.files[name].sha])),
      contentVersion: contentVersion(data),
      storage: storage.kind
    });
  },

  async upload(req, res) {
    const { config, storage } = ready();
    const session = authenticated(req, res, config);
    requireWrite(req, session);
    const body = await readJson(req);
    if (typeof body.image !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(body.image)) {
      throw new HttpError(400, 'invalid_image', 'Er is geen foto ontvangen.');
    }
    const { variants, width, height } = await processPhoto(Buffer.from(body.image, 'base64'));
    const id = uploadId();
    const shas = { 640: await storage.stage(variants[640]), 1440: await storage.stage(variants[1440]) };
    sendJson(res, 200, {
      src: `/assets/uploads/${id}-1440.webp`,
      preview: `data:image/webp;base64,${variants[640].toString('base64')}`,
      width, height,
      upload: { id, shas, token: signUpload(config, id, shas) }
    });
  },

  async save(req, res) {
    const { config, storage } = ready();
    const session = authenticated(req, res, config);
    requireWrite(req, session);
    const body = await readJson(req);
    const changes = body.content && typeof body.content === 'object' ? body.content : {};
    const names = Object.keys(changes);
    if (!names.length || names.some(name => !contentFiles.includes(name))) throw new HttpError(400, 'invalid', 'Er is niets om op te slaan.');
    const versions = body.versions && typeof body.versions === 'object' ? body.versions : {};

    const snapshot = await storage.snapshot();
    const uploads = new Map();
    for (const item of Array.isArray(body.uploads) ? body.uploads.slice(0, 20) : []) {
      if (!item || typeof item.id !== 'string' || !/^[a-z0-9-]{8,40}$/.test(item.id) || !item.shas ||
          !/^[0-9a-f]{40}$/.test(item.shas[640]) || !/^[0-9a-f]{40}$/.test(item.shas[1440]) ||
          !sameText(item.token || '', signUpload(config, item.id, item.shas))) {
        throw new HttpError(400, 'invalid_image', 'Een geüploade foto is ongeldig. Upload de foto opnieuw.');
      }
      uploads.set(`/assets/uploads/${item.id}-1440.webp`, item);
    }

    const files = {};
    const next = Object.fromEntries(contentFiles.map(name => [name, snapshot.files[name].data]));
    for (const name of names) {
      if (versions[name] !== snapshot.files[name].sha) throw new HttpError(409, 'conflict', 'De website is intussen ergens anders aangepast. Ververs de pagina en probeer het opnieuw.');
      next[name] = validateFile(name, changes[name], snapshot.files[name].data);
      for (const src of imagePaths(next[name])) {
        if (!IMAGE_PATH.test(src) || (!uploads.has(src) && !snapshot.has(src))) throw new HttpError(400, 'invalid_image', 'Een foto ontbreekt. Upload de foto opnieuw.');
      }
      files[name] = serialize(next[name]);
    }
    const used = new Set(names.flatMap(name => [...imagePaths(next[name])]));
    const blobs = [...uploads.entries()].filter(([src]) => used.has(src)).flatMap(([, item]) =>
      [640, 1440].map(size => ({ path: uploadPath(item.id, size), sha: item.shas[size] })));
    const { commit } = await storage.commit({
      files, blobs,
      expected: Object.fromEntries(names.map(name => [name, snapshot.files[name].sha])),
      message: 'Website bijgewerkt via het beheer'
    });
    sendJson(res, 200, {
      ok: true, commit,
      content: Object.fromEntries(names.map(name => [name, next[name]])),
      versions: Object.fromEntries(contentFiles.map(name => [name, files[name] ? gitSha(Buffer.from(files[name])) : snapshot.files[name].sha])),
      contentVersion: contentVersion(next)
    });
  },

  async media(req, res) {
    const { config, storage } = ready();
    authenticated(req, res, config);
    const src = new URL(req.url, 'http://local').searchParams.get('src') || '';
    if (!/^\/assets\/uploads\/[a-z0-9-]+-(640|1440)\.webp$/.test(src)) throw new HttpError(400, 'invalid', 'Ongeldige foto.');
    const buffer = await storage.media(src);
    if (!buffer) throw new HttpError(404, 'not_found', 'Foto niet gevonden.');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(buffer);
  }
};

const WRITE_ACTIONS = new Set(['login', 'logout', 'upload', 'save']);

export default async function handler(req, res) {
  try {
    const action = new URL(req.url, 'http://local').searchParams.get('action') || '';
    if (!Object.hasOwn(actions, action)) throw new HttpError(404, 'not_found', 'Onbekende actie.');
    const method = WRITE_ACTIONS.has(action) ? 'POST' : 'GET';
    if (req.method !== method) {
      res.setHeader('Allow', method);
      throw new HttpError(405, 'method', 'Deze actie is niet toegestaan.');
    }
    await actions[action](req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: error.code, message: error.message });
    } else {
      console.error('Admin API error:', error);
      sendJson(res, 500, { error: 'server', message: 'Er ging iets mis bij het opslaan. Probeer het over een minuut opnieuw.' });
    }
  }
}
