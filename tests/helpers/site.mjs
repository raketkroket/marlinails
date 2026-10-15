import { cp, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));

// A throwaway copy of the editable content and the site's photos, so tests never change the repository.
export async function makeSite() {
  const root = await mkdtemp(path.join(tmpdir(), 'marli-admin-'));
  await mkdir(path.join(root, 'public'), { recursive: true });
  for (const item of ['content', 'assets', 'pedicure marli.jpg']) {
    await cp(path.join(repo, 'public', item), path.join(root, 'public', item), { recursive: true });
  }
  return { root, remove: () => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) };
}

// Minimal cookie-aware HTTP client for the admin API.
export function client(origin) {
  const jar = new Map();
  let csrf = '';
  async function call(action, { method = 'GET', body, headers = {}, query = '' } = {}) {
    const response = await fetch(`${origin}/api/admin?action=${action}${query}`, {
      method,
      headers: {
        ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...(method === 'POST' ? { 'content-type': 'application/json', 'x-csrf-token': csrf, origin } : {}),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, ...value] = pair.split('=');
      if (/Max-Age=0/.test(cookie)) jar.delete(name); else jar.set(name, value.join('='));
    }
    const type = response.headers.get('content-type') || '';
    const data = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
    if (data && data.csrf) csrf = data.csrf;
    return { status: response.status, data, headers: response.headers };
  }
  return { call, jar, setCsrf: value => { csrf = value; }, get csrf() { return csrf; } };
}
