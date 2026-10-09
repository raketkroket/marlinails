import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

export async function securityHeaders({ https = false } = {}) {
  const html = await readFile(path.join(publicRoot, 'index.html'), 'utf8');
  // HTML parsing normalizes CRLF/CR to LF before CSP checks inline scripts.
  const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1].replace(/\r\n?/g, '\n');
  const hash = createHash('sha256').update(structuredData).digest('base64');
  return {
    'Content-Security-Policy': `default-src 'none'; script-src 'self' 'sha256-${hash}'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    ...(https ? { 'Strict-Transport-Security': 'max-age=31536000' } : {})
  };
}

export async function createSiteServer() {
  const headers = await securityHeaders();
  return http.createServer(async (req, res) => {
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    const reply = (status, text) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : text);
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      reply(405, 'Method not allowed');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      reply(400, 'Invalid request path');
      return;
    }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') ||
        pathname.split('/').some(part => part.startsWith('.'))) {
      reply(400, 'Invalid request path');
      return;
    }
    const file = path.resolve(publicRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.relative(publicRoot, file);
    const extension = path.extname(file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !types[extension]) {
      reply(404, 'Not found');
      return;
    }
    try {
      if (!(await stat(file)).isFile()) {
        reply(404, 'Not found');
        return;
      }
      const content = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[extension],
        'Content-Length': content.length,
        'Cache-Control': ['.html', '.js', '.css'].includes(extension) ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        reply(404, 'Not found');
      } else {
        console.error('Unable to serve public file:', error);
        reply(500, 'Unable to load resource');
      }
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = await createSiteServer();
  server.on('error', error => {
    console.error('Site server failed:', error);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(`Marli Nails: http://${host}:${port}`));
}
