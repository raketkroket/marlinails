import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentFiles } from '../../scripts/content.mjs';
import { HttpError } from './http.js';

// Where saved content and photos live.
// Production: the GitHub repository, written server-side with a token that never reaches
// the browser. Each save is one commit; Vercel redeploys the site from it. Only the
// content JSON and processed WebP photos can be written.
// Local development (no token, not on Vercel): files in this checkout.
export const gitSha = buffer => createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
export const serialize = data => `${JSON.stringify(data, null, 2)}\n`;
export const contentPath = name => `public/content/${name}.json`;
export const uploadPath = (id, size) => `public/assets/uploads/${id}-${size}.webp`;
const WRITABLE = /^public\/(content\/(home|prijzen|producten|over|contact)\.json|assets\/uploads\/[a-z0-9-]+-(640|1440)\.webp)$/;
const sitePath = publicUrl => `public${decodeURIComponent(publicUrl)}`;

export const conflict = () => new HttpError(409, 'conflict', 'De website is intussen ergens anders aangepast. Ververs de pagina en probeer het opnieuw.');

export function getStorage() {
  if (process.env.GITHUB_CONTENT_TOKEN) {
    return githubStorage({
      token: process.env.GITHUB_CONTENT_TOKEN,
      repo: process.env.GITHUB_REPO || 'raketkroket/marlinails',
      branch: process.env.GITHUB_BRANCH || 'main',
      api: (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '')
    });
  }
  if (!process.env.VERCEL) return localStorage(process.env.ADMIN_LOCAL_ROOT || fileURLToPath(new URL('../../', import.meta.url)));
  return null;
}

function githubStorage({ token, repo, branch, api }) {
  async function gh(method, url, body, { raw = false, allow404 = false } = {}) {
    const response = await fetch(`${api}/repos/${repo}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'marli-nails-admin',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      const error = new Error(`GitHub ${method} ${url.split('?')[0]}: HTTP ${response.status}`);
      error.status = response.status;
      error.github = true;
      throw error;
    }
    return raw ? Buffer.from(await response.arrayBuffer()) : response.json();
  }
  async function head() {
    const ref = await gh('GET', `/git/ref/heads/${encodeURIComponent(branch)}`);
    const commit = await gh('GET', `/git/commits/${ref.object.sha}`);
    const tree = await gh('GET', `/git/trees/${commit.tree.sha}?recursive=1`);
    const shas = new Map(tree.tree.filter(item => item.type === 'blob').map(item => [item.path, item.sha]));
    return { sha: ref.object.sha, tree: commit.tree.sha, shas };
  }
  return {
    kind: 'github',
    // Health check: can the token read the branch, and may it write? Creating this tiny
    // blob does not change the repository (no commit), and it is the same blob every time.
    async check() {
      const result = { read: 'ok', write: 'ok' };
      try { await gh('GET', `/git/ref/heads/${encodeURIComponent(branch)}`); } catch (error) { result.read = `fout ${error.status || 'netwerk'}`; }
      try { await gh('POST', '/git/blobs', { content: 'marli-health', encoding: 'utf-8' }); } catch (error) { result.write = `fout ${error.status || 'netwerk'}`; }
      return result;
    },
    async snapshot() {
      const current = await head();
      const files = {};
      await Promise.all(contentFiles.map(async name => {
        const sha = current.shas.get(contentPath(name));
        const blob = await gh('GET', `/git/blobs/${sha}`);
        files[name] = { data: JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8')), sha };
      }));
      return { files, has: publicUrl => current.shas.has(sitePath(publicUrl)) };
    },
    async stage(buffer) {
      const blob = await gh('POST', '/git/blobs', { content: buffer.toString('base64'), encoding: 'base64' });
      return blob.sha;
    },
    async commit({ files, blobs, expected, message }) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const current = await head();
        for (const [name, sha] of Object.entries(expected)) {
          if (current.shas.get(contentPath(name)) !== sha) throw conflict();
        }
        const entries = [
          ...Object.entries(files).map(([name, text]) => ({ path: contentPath(name), mode: '100644', type: 'blob', content: text })),
          ...blobs.map(({ path: file, sha }) => ({ path: file, mode: '100644', type: 'blob', sha }))
        ];
        if (entries.some(entry => !WRITABLE.test(entry.path))) throw new HttpError(400, 'invalid', 'Ongeldig bestand.');
        const tree = await gh('POST', '/git/trees', { base_tree: current.tree, tree: entries });
        const commit = await gh('POST', '/git/commits', { message, tree: tree.sha, parents: [current.sha] });
        try {
          await gh('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha, force: false });
          return { commit: commit.sha };
        } catch (error) {
          if (error.status !== 422 || attempt === 1) throw error; // 422: someone else committed in between
        }
      }
      throw conflict();
    },
    async media(publicUrl) {
      return gh('GET', `/contents/${sitePath(publicUrl).split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`, null, { raw: true, allow404: true });
    }
  };
}

// Uploaded photos waiting for "Opslaan" (local development only; kept per server process).
const staged = new Map();

function localStorage(root) {
  const file = relative => path.join(root, ...relative.split('/'));
  return {
    kind: 'local',
    async check() { return { read: 'ok', write: 'ok' }; },
    async snapshot() {
      const files = {};
      for (const name of contentFiles) {
        const buffer = await readFile(file(contentPath(name)));
        files[name] = { data: JSON.parse(buffer.toString('utf8')), sha: gitSha(buffer) };
      }
      return { files, has: publicUrl => existsSync(file(sitePath(publicUrl))) };
    },
    async stage(buffer) {
      const sha = gitSha(buffer);
      staged.set(sha, buffer);
      return sha;
    },
    async commit({ files, blobs, expected }) {
      for (const [name, sha] of Object.entries(expected)) {
        if (gitSha(await readFile(file(contentPath(name)))) !== sha) throw conflict();
      }
      for (const { path: target, sha } of blobs) {
        if (!WRITABLE.test(target) || !staged.has(sha)) throw new HttpError(400, 'invalid', 'Ongeldig bestand.');
        await mkdir(path.dirname(file(target)), { recursive: true });
        await writeFile(file(target), staged.get(sha));
      }
      for (const [name, text] of Object.entries(files)) await writeFile(file(contentPath(name)), text);
      return { commit: 'local' };
    },
    async media(publicUrl) {
      const target = file(sitePath(publicUrl));
      return existsSync(target) ? readFile(target) : null;
    }
  };
}
