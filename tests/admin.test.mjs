import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { contentFiles } from '../scripts/content.mjs';
import auth from '../api/auth.js';
import callback from '../api/callback.js';

const root = new URL('../', import.meta.url);
const read = async file => readFile(new URL(file, root), 'utf8');
const config = JSON.parse((await read('public/admin/config.yml')).replace(/^#.*\n/gm, ''));

// Every content key must be an admin field and vice versa, or saving via /admin would drop data.
function compare(fields, value, path, problems) {
  const names = fields.map(f => f.name);
  for (const key of Object.keys(value)) if (!names.includes(key)) problems.push(`${path}.${key}: not editable`);
  for (const field of fields) {
    const data = value[field.name];
    if (!(field.name in value)) { problems.push(`${path}.${field.name}: missing in content`); continue; }
    if (field.widget === 'object') compare(field.fields, data, `${path}.${field.name}`, problems);
    if (field.widget === 'list') {
      assert.ok(Array.isArray(data), `${path}.${field.name} is a list`);
      assert.equal(field.allow_add, false, `${path}.${field.name}: no new items`);
      assert.equal(field.allow_remove, false, `${path}.${field.name}: no removed items`);
      data.forEach((item, i) => field.fields
        ? compare(field.fields, item, `${path}.${field.name}[${i}]`, problems)
        : assert.equal(typeof item, 'string'));
    }
  }
}

test('admin fields match the content files exactly and only allow editing existing items', async () => {
  const files = config.collections[0].files;
  assert.deepEqual(files.map(f => f.name), contentFiles);
  assert.equal(config.collections[0].create, undefined, 'no new pages');
  for (const file of files) {
    assert.equal(file.file, `public/content/${file.name}.json`);
    const problems = [];
    compare(file.fields, JSON.parse(await read(file.file)), file.name, problems);
    assert.deepEqual(problems, [], file.name);
  }
  assert.equal(config.media_folder, 'public/assets/uploads');
  assert.equal(config.public_folder, '/assets/uploads');
});

test('admin page pins the CMS bundle with subresource integrity and keeps secrets server-side', async () => {
  const html = await read('public/admin/index.html');
  assert.match(html, /src="https:\/\/unpkg\.com\/decap-cms@\d+\.\d+\.\d+\/dist\/decap-cms\.js" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  for (const file of ['public/admin/index.html', 'public/admin/admin.js', 'public/admin/before.js', 'public/admin/oauth-callback.js', 'public/admin/config.yml']) {
    assert.doesNotMatch(await read(file), /client_secret|CLIENT_SECRET|ghp_|gho_/, file);
  }
});

const env = { ...process.env };
after(() => { process.env = env; });
function call(handler, url, headers = {}) {
  return new Promise(resolve => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(body = '') { resolve({ status: this.statusCode, headers: this.headers, body: String(body) }); } };
    handler({ url, headers: { host: 'marli.example', ...headers } }, res);
  });
}

test('login start refuses to run without OAuth settings and otherwise redirects to GitHub with state', async () => {
  delete process.env.GITHUB_OAUTH_CLIENT_ID; delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
  assert.equal((await call(auth, '/api/auth?provider=github')).status, 503);
  Object.assign(process.env, { GITHUB_OAUTH_CLIENT_ID: 'client-id', GITHUB_OAUTH_CLIENT_SECRET: 'client-secret' });
  assert.equal((await call(auth, '/api/auth?provider=gitlab')).status, 400);
  assert.equal((await call(auth, '/api/auth?provider=github&scope=admin:org')).status, 400);
  const res = await call(auth, '/api/auth?provider=github&scope=public_repo');
  assert.equal(res.status, 302);
  const location = new URL(res.headers.location);
  assert.equal(location.origin + location.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(location.searchParams.get('client_id'), 'client-id');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://marli.example/api/callback');
  assert.equal(location.searchParams.get('scope'), 'public_repo');
  const state = location.searchParams.get('state');
  assert.match(state, /^[0-9a-f]{48}$/);
  assert.equal(res.headers['set-cookie'], `marli_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  assert.doesNotMatch(res.headers.location, /client-secret/);
});

test('login callback checks state, exchanges the code and hands the token only to the same origin', async () => {
  Object.assign(process.env, { GITHUB_OAUTH_CLIENT_ID: 'client-id', GITHUB_OAUTH_CLIENT_SECRET: 'client-secret' });
  const realFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ access_token: 'token-</script><b>' }), { status: 200 });
  };
  try {
    const missing = await call(callback, '/api/callback?code=abc&state=one');
    assert.equal(missing.status, 400);
    const wrong = await call(callback, '/api/callback?code=abc&state=one', { cookie: 'marli_oauth_state=two' });
    assert.equal(wrong.status, 400);
    assert.equal(requests.length, 0, 'no token exchange without a valid state');
    const ok = await call(callback, '/api/callback?code=abc&state=one', { cookie: 'other=1; marli_oauth_state=one' });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['cache-control'], 'no-store');
    assert.match(ok.headers['set-cookie'], /marli_oauth_state=; .*Max-Age=0/);
    assert.deepEqual(requests[0], { url: 'https://github.com/login/oauth/access_token',
      body: { client_id: 'client-id', client_secret: 'client-secret', code: 'abc', redirect_uri: 'https://marli.example/api/callback' } });
    // Only a JSON data block and the same-origin handshake script: no inline code, no HTML injection.
    assert.match(ok.body, /<script type="application\/json" id="oauth-result">.*token-\\u003c\/script>\\u003cb>.*<\/script><script src="\/admin\/oauth-callback.js"><\/script>/);
    assert.doesNotMatch(ok.body, /client-secret/);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 200 });
    const failed = await call(callback, '/api/callback?code=abc&state=one', { cookie: 'marli_oauth_state=one' });
    assert.equal(failed.status, 502);
    assert.match(failed.body, /"status":"error"/);
  } finally {
    globalThis.fetch = realFetch;
  }
  const script = await read('public/admin/oauth-callback.js');
  assert.match(script, /event\.origin !== window\.location\.origin/);
  assert.match(script, /opener\.postMessage\(message, window\.location\.origin\)/);
});

test('photos uploaded via /admin are deployed only as resized WebP without metadata', async () => {
  const dir = new URL('../.test-build/', import.meta.url);
  await rm(dir, { recursive: true, force: true });
  try {
    await mkdir(new URL('scripts/', dir), { recursive: true });
    await mkdir(new URL('public/assets/uploads/', dir), { recursive: true });
    for (const file of ['server.mjs', 'vercel.json', 'scripts/build.mjs', 'scripts/content.mjs']) {
      await writeFile(new URL(file, dir), await read(file));
    }
    await cp(new URL('public/index.html', root), new URL('public/index.html', dir));
    await cp(new URL('public/content/', root), new URL('public/content/', dir), { recursive: true });
    // A large phone photo with location metadata.
    await sharp({ create: { width: 3000, height: 4000, channels: 3, background: '#d83f85' } })
      .withMetadata({ exif: { IFD0: { Make: 'Phone' }, GPS: { GPSLatitudeRef: 'N' } } }).jpeg()
      .toFile(fileURLToPath(new URL('public/assets/uploads/IMG 2041.jpg', dir)));
    const home = JSON.parse(await read('public/content/home.json'));
    home.gallery.photos[0].src = '/assets/uploads/IMG 2041.jpg';
    await writeFile(new URL('public/content/home.json', dir), JSON.stringify(home));
    await promisify(execFile)(process.execPath, [fileURLToPath(new URL('scripts/build.mjs', dir))]);
    const uploads = await readdir(new URL('dist/assets/uploads/', dir));
    assert.deepEqual(uploads.sort(), ['IMG 2041-1440.webp', 'IMG 2041-640.webp']);
    for (const name of uploads) {
      const meta = await sharp(await readFile(new URL(`dist/assets/uploads/${name}`, dir))).metadata();
      assert.equal(meta.width, Number(name.match(/-(\d+)\.webp$/)[1]));
      assert.equal(meta.exif, undefined);
    }
    const script = await readFile(new URL('dist/content.js', dir), 'utf8');
    assert.match(script, /"src":"\/assets\/uploads\/IMG 2041-1440\.webp"/);
    assert.doesNotMatch(script, /IMG 2041\.jpg/);
    assert.deepEqual((await readdir(new URL('dist/', dir))).filter(n => n === 'content'), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
