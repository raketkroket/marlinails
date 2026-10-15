import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createSiteServer } from '../server.mjs';
import { createSession, hashPassword, readSession, sessionCookie, verifyPassword } from '../api/_lib/auth.js';
import { resetMemoryStore } from '../api/_lib/ratelimit.js';
import { validateFile } from '../api/_lib/validate.js';
import { choicesOf, describe as describePrice, encode, rollOver } from '../public/admin/prices.js';
import { previewHtml } from '../scripts/preview.mjs';
import { client, makeSite } from './helpers/site.mjs';
import { startMockGitHub, startMockRedis } from './helpers/mocks.mjs';

const PASSWORD = 'Roze-Nagels-2026!';
let site, server, origin, passwordHash;
const env = { ...process.env };

async function startServer() {
  server = await createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}
const stopServer = () => new Promise(resolve => server.close(resolve));

before(async () => {
  passwordHash = await hashPassword(PASSWORD);
  site = await makeSite();
});
beforeEach(async () => {
  process.env = { ...env, ADMIN_PASSWORD_HASH: passwordHash, ADMIN_SESSION_SECRET: 'x'.repeat(48), ADMIN_LOCAL_ROOT: site.root };
  delete process.env.VERCEL;
  delete process.env.GITHUB_CONTENT_TOKEN;
  resetMemoryStore();
  if (server) await stopServer();
  await startServer();
});
after(async () => {
  process.env = env;
  await stopServer();
  await site.remove();
});

const login = async (api, password = PASSWORD) => api.call('login', { method: 'POST', body: { username: 'marjon123', password } });
const read = async name => JSON.parse(await readFile(path.join(site.root, 'public', 'content', `${name}.json`), 'utf8'));

test('passwords are stored as scrypt hashes and checked in constant time', async () => {
  assert.match(passwordHash, /^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.doesNotMatch(passwordHash, /Roze-Nagels/);
  assert.equal(await verifyPassword(PASSWORD, passwordHash), true);
  assert.equal(await verifyPassword('roze-nagels-2026!', passwordHash), false);
  assert.equal(await verifyPassword(PASSWORD, 'plaintext'), false);
  assert.notEqual(await hashPassword(PASSWORD), passwordHash, 'salted');
});

test('sessions are signed, expire when idle or old, and end when the password changes', () => {
  const config = { username: 'marjon123', passwordHash, secret: 's'.repeat(40), ready: true };
  const req = { headers: {} };
  const now = Date.parse('2026-10-15T12:00:00Z');
  const cookie = sessionCookie(req, config, createSession(config, now)).split(';')[0];
  const withCookie = value => ({ headers: { cookie: value } });
  assert.ok(readSession(withCookie(cookie), config, now + 1000));
  assert.equal(readSession(withCookie(cookie), config, now + 25 * 3600 * 1000), null, 'idle timeout');
  assert.equal(readSession(withCookie(cookie.replace(/.$/, c => (c === 'A' ? 'B' : 'A'))), config, now), null, 'tampered');
  assert.equal(readSession(withCookie(cookie), { ...config, passwordHash: 'scrypt$other' }, now), null, 'new password');
  const old = createSession(config, now);
  old.seen = Math.floor((now + 8 * 24 * 3600 * 1000) / 1000) - 10;
  assert.equal(readSession(withCookie(sessionCookie(req, config, old).split(';')[0]), config, now + 8 * 24 * 3600 * 1000), null, 'absolute limit');
});

test('login: clear Dutch errors, secure cookie, CSRF token, logout', async () => {
  const api = client(origin);
  assert.deepEqual((await api.call('session')).data, { authenticated: false });
  const wrong = await login(api, 'fout');
  assert.equal(wrong.status, 401);
  assert.equal(wrong.data.message, 'Gebruikersnaam of wachtwoord klopt niet.');
  const ok = await login(api);
  assert.equal(ok.status, 200);
  const cookie = ok.headers.getSetCookie()[0];
  assert.match(cookie, /^marli_admin=[^;]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=86400$/);
  assert.match(ok.data.csrf, /^[A-Za-z0-9_-]{32}$/);
  assert.doesNotMatch(JSON.stringify(ok.data), /scrypt|secret/i);
  assert.equal((await api.call('session')).data.username, 'marjon123');
  assert.equal((await api.call('logout', { method: 'POST' })).status, 200);
  assert.deepEqual((await api.call('session')).data, { authenticated: false });
  assert.equal((await api.call('content')).status, 401);
});

test('login is rate limited per address, even with the right password', async () => {
  const api = client(origin);
  for (let i = 0; i < 5; i++) assert.equal((await login(api, `fout-${i}`)).status, 401);
  const blocked = await login(api);
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.message, /^Te veel inlogpogingen\. Probeer het over 15 minuten opnieuw\.$/);
});

test('on Vercel, login limits use Redis and the admin refuses to run without it', async () => {
  const redis = await startMockRedis();
  try {
    process.env.VERCEL = '1';
    process.env.GITHUB_CONTENT_TOKEN = 'unused';
    const api = client(origin);
    const missing = await login(api);
    assert.equal(missing.status, 503);
    assert.match(missing.data.message, /nog niet volledig ingesteld/);
    Object.assign(process.env, { KV_REST_API_URL: redis.url, KV_REST_API_TOKEN: redis.token });
    for (let i = 0; i < 5; i++) assert.equal((await login(api, 'fout')).status, 401);
    assert.equal((await login(api)).status, 429);
    assert.ok(redis.commands.some(([cmd, key]) => cmd === 'INCR' && key.startsWith('marli:login:ip:')));
    assert.ok(redis.commands.some(([cmd, , seconds, mode]) => cmd === 'EXPIRE' && seconds === 900 && mode === 'NX'));
  } finally {
    await redis.close();
  }
});

test('every admin action needs a session; every write also needs the CSRF token and same origin', async () => {
  const anonymous = client(origin);
  for (const [action, method] of [['content', 'GET'], ['media', 'GET'], ['save', 'POST'], ['upload', 'POST']]) {
    const res = await anonymous.call(action, { method, body: method === 'POST' ? {} : undefined, query: action === 'media' ? '&src=/assets/uploads/x-640.webp' : '' });
    assert.equal(res.status, 401, action);
  }
  const api = client(origin);
  await login(api);
  const content = (await api.call('content')).data;
  const body = { content: { contact: { intro: 'Nieuw' } }, versions: content.versions };
  const token = api.csrf;
  api.setCsrf('');
  assert.equal((await api.call('save', { method: 'POST', body })).status, 403, 'missing CSRF token');
  api.setCsrf(token);
  assert.equal((await api.call('save', { method: 'POST', body, headers: { origin: 'https://evil.example' } })).status, 403, 'cross-site');
  assert.equal((await api.call('save', { method: 'GET' })).status, 405);
  assert.equal((await api.call('unknown')).status, 404);
  assert.equal((await read('contact')).intro, content.content.contact.intro, 'nothing was written');
});

test('saving validates content: same structure only, safe text, valid prices and photos', async () => {
  const api = client(origin);
  await login(api);
  const { content, versions } = (await api.call('content')).data;
  const save = changes => api.call('save', { method: 'POST', body: { content: changes, versions } });
  const home = structuredClone(content.home);
  home.gallery.photos.push(home.gallery.photos[0]);
  assert.match((await save({ home })).data.message, /toevoegen of verwijderen/);
  const extra = structuredClone(content.contact);
  extra.script = 'x';
  assert.equal((await save({ contact: extra })).status, 400);
  const prices = structuredClone(content.prijzen);
  prices.groups[0].rows[0].price = 12.345;
  assert.match((await save({ prijzen: prices })).data.message, /twee cijfers/);
  prices.groups[0].rows[0].price = -1;
  assert.equal((await save({ prijzen: prices })).status, 400);
  const photo = structuredClone(content.home);
  photo.gallery.photos[0].src = 'https://evil.example/x.jpg';
  assert.match((await save({ home: photo })).data.message, /Ongeldige foto/);
  photo.gallery.photos[0].src = '/assets/uploads/20261015-abcdef0123-1440.webp';
  assert.match((await save({ home: photo })).data.message, /foto ontbreekt/);
  assert.equal((await save({ paginas: {} })).status, 400);

  const contact = { intro: '  <script>alert(1)</script>Welkom!  \u0007 ' };
  const ok = await save({ contact });
  assert.equal(ok.status, 200);
  assert.equal((await read('contact')).intro, 'alert(1)Welkom!');
  // The price schedule itself cannot be changed through the admin.
  const schedule = structuredClone(content.prijzen);
  schedule.change.increase = 99;
  schedule.groups[0].rows[0].price = 52;
  assert.equal((await api.call('save', { method: 'POST', body: { content: { prijzen: schedule }, versions: ok.data.versions } })).status, 200);
  const saved = await read('prijzen');
  assert.equal(saved.change.increase, 2.5);
  assert.equal(saved.groups[0].rows[0].price, 52);
});

test('a stale editor cannot overwrite newer content', async () => {
  const api = client(origin);
  await login(api);
  const { content, versions } = (await api.call('content')).data;
  const first = await api.call('save', { method: 'POST', body: { content: { contact: { intro: 'Eerste' } }, versions } });
  assert.equal(first.status, 200);
  const stale = await api.call('save', { method: 'POST', body: { content: { contact: { intro: 'Oud venster' } }, versions } });
  assert.equal(stale.status, 409);
  assert.match(stale.data.message, /Ververs de pagina/);
  assert.equal((await read('contact')).intro, 'Eerste');
  assert.ok(content);
});

test('photo uploads: only real images, resized to WebP without metadata, signed until saved', async () => {
  const api = client(origin);
  await login(api);
  const upload = buffer => api.call('upload', { method: 'POST', body: { image: buffer.toString('base64') } });
  assert.equal((await upload(Buffer.from('<?php echo 1; ?>'))).status, 415);
  assert.equal((await upload(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('not really')]))).status, 415);
  const small = await sharp({ create: { width: 200, height: 200, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  assert.match((await upload(small)).data.message, /te klein/);
  const photo = await sharp({ create: { width: 2400, height: 3000, channels: 3, background: '#d83f85' } })
    .withMetadata({ exif: { IFD0: { Make: 'Telefoon' }, GPS: { GPSLatitudeRef: 'N' } } }).jpeg({ quality: 92 }).toBuffer();
  const res = await upload(photo);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.match(res.data.src, /^\/assets\/uploads\/\d{8}-[0-9a-f]{10}-1440\.webp$/);
  assert.match(res.data.preview, /^data:image\/webp;base64,/);

  const { content, versions } = (await api.call('content')).data;
  const home = structuredClone(content.home);
  home.gallery.photos[2].src = res.data.src;
  const forged = { ...res.data.upload, shas: { ...res.data.upload.shas, 640: '0'.repeat(40) } };
  assert.equal((await api.call('save', { method: 'POST', body: { content: { home }, versions, uploads: [forged] } })).status, 400);
  const saved = await api.call('save', { method: 'POST', body: { content: { home }, versions, uploads: [res.data.upload] } });
  assert.equal(saved.status, 200);
  const uploads = (await readdir(path.join(site.root, 'public', 'assets', 'uploads'))).filter(n => n.startsWith(res.data.upload.id));
  assert.deepEqual(uploads.sort(), [`${res.data.upload.id}-1440.webp`, `${res.data.upload.id}-640.webp`]);
  for (const name of uploads) {
    const meta = await sharp(await readFile(path.join(site.root, 'public', 'assets', 'uploads', name))).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width, Number(name.match(/-(\d+)\.webp$/)[1]));
    assert.equal(meta.exif, undefined, 'no EXIF/GPS');
  }
  assert.equal((await read('home')).gallery.photos[2].src, res.data.src);
  const media = await api.call('media', { query: `&src=${res.data.src}` });
  assert.equal(media.status, 200);
  assert.equal(media.headers.get('content-type'), 'image/webp');
  assert.equal((await api.call('media', { query: '&src=/../../server.mjs' })).status, 400);
});

test('GitHub storage: one commit per save, persists across restarts, never exposes the token', async () => {
  const github = await startMockGitHub({ root: site.root });
  try {
    Object.assign(process.env, { GITHUB_CONTENT_TOKEN: 'test-token', GITHUB_API_URL: github.api });
    const api = client(origin);
    await login(api);
    const loaded = await api.call('content');
    assert.equal(loaded.data.storage, 'github');
    assert.doesNotMatch(JSON.stringify(loaded.data), /test-token/);
    const photo = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: '#8e2253' } }).png().toBuffer();
    const upload = (await api.call('upload', { method: 'POST', body: { image: photo.toString('base64') } })).data;
    const home = structuredClone(loaded.data.content.home);
    home.hero.title = 'Nieuwe *titel*';
    home.treatments.cards[0].photo = upload.src;
    const saved = await api.call('save', { method: 'POST', body: { content: { home }, versions: loaded.data.versions, uploads: [upload.upload] } });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(github.commits().length, 1);
    assert.equal(github.commits()[0].message, 'Website bijgewerkt via het beheer');
    assert.equal(JSON.parse(github.file('public/content/home.json')).hero.title, 'Nieuwe *titel*');
    assert.ok(github.file(`public/assets/uploads/${upload.upload.id}-1440.webp`));
    assert.ok(github.file(`public/assets/uploads/${upload.upload.id}-640.webp`));
    const written = github.log.filter(entry => entry.method === 'POST' && entry.path.endsWith('/git/trees')).flatMap(entry => entry.body.tree.map(t => t.path));
    assert.ok(written.every(p => /^public\/(content\/[a-z]+\.json|assets\/uploads\/[a-z0-9-]+\.webp)$/.test(p)), written.join());

    // A redeploy / server restart reads the saved content back from GitHub.
    await stopServer();
    await startServer();
    const again = client(origin);
    await login(again);
    const reloaded = (await again.call('content')).data;
    assert.equal(reloaded.content.home.hero.title, 'Nieuwe *titel*');
    assert.equal(reloaded.content.home.treatments.cards[0].photo, upload.src);
    assert.equal((await again.call('media', { query: `&src=${upload.src}` })).status, 200);

    github.externalCommit('public/content/home.json', JSON.stringify({ ...reloaded.content.home, booking: { ...reloaded.content.home.booking, text: 'Extern' } }, null, 2));
    const conflict = await again.call('save', { method: 'POST', body: { content: { home: reloaded.content.home }, versions: reloaded.versions } });
    assert.equal(conflict.status, 409);
  } finally {
    await github.close();
  }
});

test('price rules: immediate and scheduled changes stay separate, and roll over on the date', () => {
  const change = { date: '2027-01-01', increase: 2.5 };
  const row = { name: 'BIAB', desc: '', price: 50, medium: 52.5, hand: true, next: null, nextMedium: null };
  assert.deepEqual(describePrice(row, 'price', change), { current: 50, future: 52.5, mode: 'auto' });
  // Direct change of kort: medium keeps its automatic increase.
  let choices = choicesOf(row, change);
  choices.price.current = 51;
  const direct = encode(row, choices);
  assert.deepEqual([direct.price, direct.medium, direct.hand, direct.next, direct.nextMedium], [51, 52.5, true, null, null]);
  // Scheduled kort price; medium stays automatic.
  choices = choicesOf(row, change);
  choices.price.mode = 'custom';
  choices.price.custom = 55;
  const scheduled = encode(row, choices);
  assert.deepEqual([scheduled.price, scheduled.next, describePrice(scheduled, 'medium', change).future], [50, 55, 55]);
  // No increase for medium only.
  choices = choicesOf(row, change);
  choices.medium.mode = 'none';
  const mixed = encode(row, choices);
  assert.deepEqual([describePrice(mixed, 'price', change).future, describePrice(mixed, 'medium', change).future], [52.5, 52.5]);
  choices = choicesOf(mixed, change);
  choices.medium.current = 54;
  assert.equal(describePrice(encode(mixed, choices), 'medium', change).future, 54, 'a later direct change keeps "no increase"');
  const prijzen = { since: '2025-09-01', change, groups: [{ title: 'x', intro: '', rows: [scheduled, { ...row, hand: false }] }] };
  assert.equal(rollOver(prijzen, '2026-12-31'), prijzen);
  const rolled = rollOver(prijzen, '2027-01-01');
  assert.equal(rolled.change, null);
  assert.equal(rolled.since, '2027-01-01');
  assert.deepEqual(rolled.groups[0].rows.map(r => [r.price, r.medium]), [[55, 55], [50, 52.5]]);
  const validated = validateFile('prijzen', structuredClone(prijzen), structuredClone(prijzen), '2027-01-02');
  assert.equal(validated.change, null, 'saving after the date applies the new prices permanently');
});

test('editor preview is the real homepage with the draft content and edit bridge', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const html = previewHtml(index);
  assert.match(html, /<script src="\/admin\/preview-content\.js" defer><\/script>\n<script src="\/app\.js/);
  assert.match(html, /preview-bridge\.js/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /src="\/content\.js"/);
  const response = await fetch(`${origin}/admin/preview.html`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  const publicPage = await fetch(`${origin}/`);
  assert.match(publicPage.headers.get('content-security-policy'), /connect-src 'none'.*frame-ancestors 'none'/);
  assert.equal(publicPage.headers.get('x-frame-options'), 'DENY');
});

test('no secrets, passwords or tokens in anything sent to the browser', async () => {
  const files = ['public/admin/index.html', 'public/admin/admin.js', 'public/admin/prices.js', 'public/admin/preview-bridge.js', 'public/admin/preview-content.js', 'public/app.js', 'public/index.html'];
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /scrypt\$|ADMIN_SESSION_SECRET|GITHUB_CONTENT_TOKEN|KV_REST_API_TOKEN|ghp_|github_pat_|Roze-Nagels/, file);
  }
});

test('health check and clear errors when the GitHub token may only read', async () => {
  const github = await startMockGitHub({ root: site.root });
  try {
    Object.assign(process.env, { GITHUB_CONTENT_TOKEN: 'test-token', GITHUB_API_URL: github.api });
    const health = await (await fetch(`${origin}/api/admin?action=health`)).json();
    assert.deepEqual(health, { wachtwoord: 'ok', sessie: 'ok', redis: 'ok', opslag: { soort: 'github', read: 'ok', write: 'ok' } });
    assert.doesNotMatch(JSON.stringify(health), /scrypt|test-token|xxxx/);
    github.setReadOnly(true);
    const readOnly = await (await fetch(`${origin}/api/admin?action=health`)).json();
    assert.deepEqual(readOnly.opslag, { soort: 'github', read: 'ok', write: 'fout 403' });
    const api = client(origin);
    await login(api);
    const { content, versions } = (await api.call('content')).data;
    const res = await api.call('save', { method: 'POST', body: { content: { contact: { intro: 'Nieuw' } }, versions } });
    assert.equal(res.status, 502);
    assert.match(res.data.message, /geen toestemming om op te slaan.*\(code GH403\)/);
    Object.assign(process.env, { GITHUB_CONTENT_TOKEN: 'wrong-token' });
    const bad = await (await fetch(`${origin}/api/admin?action=health`)).json();
    assert.deepEqual(bad.opslag, { soort: 'github', read: 'fout 401', write: 'fout 401' });
    assert.ok(content);
  } finally {
    await github.close();
  }
});
