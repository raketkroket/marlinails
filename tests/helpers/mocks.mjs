// Test doubles for the two external services the admin uses in production:
// the GitHub Git Data/Contents REST API (content storage) and Upstash Redis REST (login limits).
// They speak the same HTTP API, so the real storage and rate-limit code is exercised.
import http from 'node:http';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const gitSha = buffer => createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
const randomSha = () => createHash('sha1').update(String(Math.random())).digest('hex');

async function listFiles(dir, prefix) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await listFiles(full, rel));
    else out.push([rel, full]);
  }
  return out;
}

export async function startMockGitHub({ root, token = 'test-token', repo = 'raketkroket/marlinails', branch = 'main' }) {
  const blobs = new Map();
  const trees = new Map();
  const commits = new Map();
  const files = new Map();
  for (const [rel, full] of await listFiles(path.join(root, 'public'), 'public')) {
    const buffer = await readFile(full);
    const sha = gitSha(buffer);
    blobs.set(sha, buffer);
    files.set(rel, sha);
  }
  const rootTree = randomSha();
  trees.set(rootTree, files);
  let head = randomSha();
  commits.set(head, { tree: rootTree, parents: [] });
  const log = [];
  let readOnly = false;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://mock');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
    log.push({ method: req.method, path: url.pathname, body });
    const send = (status, data, raw) => {
      res.writeHead(status, { 'Content-Type': raw ? 'application/octet-stream' : 'application/json' });
      res.end(raw ? data : JSON.stringify(data));
    };
    if (req.headers.authorization !== `Bearer ${token}`) return send(401, { message: 'Bad credentials' });
    if (readOnly && req.method !== 'GET') return send(403, { message: 'Resource not accessible by personal access token' });
    const base = `/repos/${repo}`;
    if (!url.pathname.startsWith(base)) return send(404, { message: 'Not Found' });
    const route = url.pathname.slice(base.length);
    let match;
    if (req.method === 'GET' && route === `/git/ref/heads/${branch}`) return send(200, { object: { sha: head } });
    if (req.method === 'GET' && (match = route.match(/^\/git\/commits\/([0-9a-f]{40})$/))) {
      const commit = commits.get(match[1]);
      return commit ? send(200, { sha: match[1], tree: { sha: commit.tree } }) : send(404, {});
    }
    if (req.method === 'GET' && (match = route.match(/^\/git\/trees\/([0-9a-f]{40})$/))) {
      const tree = trees.get(match[1]);
      return tree ? send(200, { sha: match[1], truncated: false, tree: [...tree].map(([p, sha]) => ({ path: p, type: 'blob', mode: '100644', sha })) }) : send(404, {});
    }
    if (req.method === 'GET' && (match = route.match(/^\/git\/blobs\/([0-9a-f]{40})$/))) {
      const blob = blobs.get(match[1]);
      return blob ? send(200, { sha: match[1], encoding: 'base64', content: blob.toString('base64') }) : send(404, {});
    }
    if (req.method === 'POST' && route === '/git/blobs') {
      const buffer = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8');
      const sha = gitSha(buffer);
      blobs.set(sha, buffer);
      return send(201, { sha });
    }
    if (req.method === 'POST' && route === '/git/trees') {
      const tree = new Map(trees.get(body.base_tree));
      for (const entry of body.tree) {
        if (entry.content !== undefined) {
          const buffer = Buffer.from(entry.content, 'utf8');
          const sha = gitSha(buffer);
          blobs.set(sha, buffer);
          tree.set(entry.path, sha);
        } else {
          if (!blobs.has(entry.sha)) return send(422, { message: 'GitRPC::BadObjectState' });
          tree.set(entry.path, entry.sha);
        }
      }
      const sha = randomSha();
      trees.set(sha, tree);
      return send(201, { sha });
    }
    if (req.method === 'POST' && route === '/git/commits') {
      const sha = randomSha();
      commits.set(sha, { tree: body.tree, parents: body.parents, message: body.message });
      return send(201, { sha });
    }
    if (req.method === 'PATCH' && route === `/git/refs/heads/${branch}`) {
      const commit = commits.get(body.sha);
      if (!commit || (!body.force && commit.parents[0] !== head)) return send(422, { message: 'Update is not a fast forward' });
      head = body.sha;
      return send(200, { object: { sha: head } });
    }
    if (req.method === 'GET' && (match = route.match(/^\/contents\/(.+)$/))) {
      const file = decodeURIComponent(match[1]);
      const sha = trees.get(commits.get(head).tree).get(file);
      return sha ? send(200, blobs.get(sha), true) : send(404, { message: 'Not Found' });
    }
    send(404, { message: 'Not Found' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const api = `http://127.0.0.1:${server.address().port}`;
  return {
    api, log,
    setReadOnly(value) { readOnly = value; },
    file(p) { const sha = trees.get(commits.get(head).tree).get(p); return sha ? blobs.get(sha) : null; },
    commits: () => [...commits.values()].filter(c => c.message),
    // Simulates someone else changing the repository (for conflict tests).
    externalCommit(p, text) {
      const tree = new Map(trees.get(commits.get(head).tree));
      const buffer = Buffer.from(text);
      const sha = gitSha(buffer);
      blobs.set(sha, buffer);
      tree.set(p, sha);
      const treeSha = randomSha();
      trees.set(treeSha, tree);
      const commitSha = randomSha();
      commits.set(commitSha, { tree: treeSha, parents: [head], message: 'extern' });
      head = commitSha;
    },
    close: () => new Promise(resolve => server.close(resolve))
  };
}

export async function startMockRedis({ token = 'redis-token' } = {}) {
  const store = new Map();
  const commands = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.headers.authorization !== `Bearer ${token}` || req.url !== '/pipeline') {
      res.writeHead(401); res.end('{}'); return;
    }
    const now = Date.now();
    const alive = key => { const item = store.get(key); if (item && item.until && item.until <= now) store.delete(key); return store.get(key); };
    const results = JSON.parse(Buffer.concat(chunks).toString('utf8')).map(([cmd, key, ...args]) => {
      commands.push([cmd, key, ...args]);
      const item = alive(key);
      if (cmd === 'INCR') { const next = { value: (item?.value || 0) + 1, until: item?.until }; store.set(key, next); return { result: next.value }; }
      if (cmd === 'EXPIRE') { if (item && (!item.until || args[1] !== 'NX')) item.until = now + Number(args[0]) * 1000; return { result: item ? 1 : 0 }; }
      if (cmd === 'TTL') return { result: item ? (item.until ? Math.ceil((item.until - now) / 1000) : -1) : -2 };
      if (cmd === 'GET') return { result: item ? String(item.value) : null };
      if (cmd === 'DEL') return { result: store.delete(key) ? 1 : 0 };
      return { error: 'ERR unknown command' };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, token, store, commands, close: () => new Promise(resolve => server.close(resolve)) };
}
