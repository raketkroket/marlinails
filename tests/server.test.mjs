import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, readdir, stat, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { createSiteServer, securityHeaders } from '../server.mjs';

let server, origin;
before(async () => {
  server = await createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

function request(pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(origin, { path: pathname, method }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves Dutch site with strict security headers', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.body, /<html lang="nl">/);
  assert.match(response.headers['content-security-policy'], /script-src 'self' 'sha256-/);
  assert.doesNotMatch(response.headers['content-security-policy'], /unsafe-inline|unsafe-eval/);
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.equal(response.headers['x-frame-options'], 'DENY');
});

test('serves scripts, fonts and images with correct MIME types; HEAD has no body', async () => {
  for (const [file, mime] of [['/app.js', 'text/javascript'], ['/styles.css', 'text/css'],
    ['/assets/logo.png', 'image/png'], ['/assets/20211111_160344.jpg', 'image/jpeg'],
    ['/assets/20260521_150616-640.webp', 'image/webp'],
    ['/assets/font-0.ttf', 'font/ttf']]) {
    const response = await request(file, 'HEAD');
    assert.equal(response.status, 200, file);
    assert.ok(response.headers['content-type'].startsWith(mime), file);
    assert.ok(Number(response.headers['content-length']) > 0, file);
    assert.equal(response.body, '');
  }
});

test('rejects unsupported methods and never accepts contact data', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await request('/', method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, 'GET, HEAD');
  }
});

test('rejects traversal, hidden files, Windows paths and malformed encodings', async () => {
  for (const pathname of ['/../package.json', '/%2e%2e/package.json', '/.git/config',
    '/assets/../../server.mjs', '/assets%5c..%5c..%5cpackage.json',
    '/%00', '/%E0%A4%A', '//C:/Windows/win.ini']) {
    const response = await request(pathname);
    assert.ok([400, 404].includes(response.status), `${pathname}: ${response.status}`);
    assert.doesNotMatch(response.body, /"devDependencies"|createSiteServer|\[core\]/);
  }
});

test('does not expose source, tests, licenses or directory listings', async () => {
  for (const pathname of ['/server.mjs', '/package.json', '/tests/server.test.mjs',
    '/assets/', '/missing', '/assets/dmsans-OFL.txt']) {
    const response = await request(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(response.body, 'Not found');
  }
});

test('production headers include HSTS but localhost headers do not', async () => {
  assert.equal((await securityHeaders())['Strict-Transport-Security'], undefined);
  assert.equal((await securityHeaders({ https: true }))['Strict-Transport-Security'], 'max-age=31536000');
});

test('Vercel builds only dist and applies current production security headers', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.framework, null);
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.equal(config.installCommand, 'npm ci');
  assert.equal(config.headers[0].source, '/(.*)');
  const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers['Cache-Control'], 'public, max-age=0, must-revalidate');
  for (const [name, value] of Object.entries(await securityHeaders({ https: true }))) {
    assert.equal(headers[name], value, name);
  }
  for (const asset of ['/styles.css?version=deployment', '/editorial.css?version=deployment', '/app.js?version=deployment']) {
    assert.equal((await request(asset)).status, 200, asset);
  }
});

test('production build and browser CSP hashes agree for Linux and Windows line endings', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'marli-vercel-'));
  try {
    for (const [name, newline] of [['linux', '\n'], ['windows', '\r\n']]) {
      const root = path.join(directory, name);
      await mkdir(path.join(root, 'public'), { recursive: true });
      await mkdir(path.join(root, 'scripts'), { recursive: true });
      for (const file of ['server.mjs', 'vercel.json', 'scripts/build.mjs', 'public/index.html']) {
        const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
        await writeFile(path.join(root, file), content.replace(/\r\n?/g, '\n').replace(/\n/g, newline));
      }
      await promisify(execFile)(process.execPath, [path.join(root, 'scripts', 'build.mjs')], { cwd: root });
      const html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
      const script = html.replace(/\r\n?/g, '\n').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
      const browserHash = createHash('sha256').update(script).digest('base64');
      const headers = await readFile(path.join(root, 'dist', '_headers'), 'utf8');
      assert.ok(headers.includes(`'sha256-${browserHash}'`), `${name}: browser-parsed script matches CSP`);
      assert.ok((await securityHeaders({ https: true }))['Content-Security-Policy'].includes(`'sha256-${browserHash}'`));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('responsive photographs meet resolution and payload budgets with no EXIF metadata', async () => {
  const directory = new URL('../public/assets/', import.meta.url);
  const files = (await readdir(directory)).filter(name => name.endsWith('.webp'));
  assert.equal(files.length, 16);
  for (const name of files) {
    const file = new URL(name, directory);
    const metadata = await sharp(await readFile(file)).metadata();
    assert.equal(metadata.width, Number(name.match(/-(\d+)\.webp$/)[1]), name);
    assert.ok((await stat(file)).size <= 400_000, name);
    assert.equal(metadata.exif, undefined, name);
  }
});
