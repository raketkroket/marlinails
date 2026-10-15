import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { adminHeaders, securityHeaders } from '../server.mjs';
import { contentScript, readContent } from './content.mjs';
import { previewHtml } from './preview.mjs';

const headers = await securityHeaders({ https: true });
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
// vercel.json: [0] = public site, [1] = /admin/ (website editor). Both must match server.mjs.
for (const [index, expected] of [[0, headers], [1, await adminHeaders({ https: true })]]) {
  const deployed = Object.fromEntries((vercel.headers[index]?.headers || []).map(({ key, value }) => [key, value]));
  for (const [name, value] of Object.entries(expected)) {
    if (deployed[name] !== value) {
      throw new Error(`Update ${name} in vercel.json headers[${index}] to match server.mjs before deploying.`);
    }
  }
}
const publicDir = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(publicDir, output, {
  recursive: true,
  // Full-size supplied originals stay in the repository; the site uses optimized copies.
  // Content JSON is bundled into content.js. Admin uploads are already resized WebP.
  filter: source => !/[\\/](2026\d{4}_\d{6}\.jpg|Glossy Pink Marli Nails Logo\.png)$/.test(source) &&
    !/[\\/]public[\\/]content([\\/]|$)/.test(source)
});
await writeFile(new URL('content.js', output), contentScript(await readContent(publicDir)));
await mkdir(new URL('admin/', output), { recursive: true });
await writeFile(new URL('admin/preview.html', output),
  previewHtml(await readFile(new URL('index.html', publicDir), 'utf8')));
await writeFile(new URL('_headers', output),
  `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`);
console.log('Static site ready in dist. Security headers generated for compatible HTTPS hosts.');
