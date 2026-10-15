import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { adminHeaders, securityHeaders } from '../server.mjs';
import { contentScript, readContent } from './content.mjs';

const headers = await securityHeaders({ https: true });
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
// vercel.json: [0] = public site, [1] = /admin/ (Decap CMS). Both must match server.mjs.
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
  // Content JSON is bundled into content.js; admin uploads are optimized below.
  filter: source => !/[\\/](2026\d{4}_\d{6}\.jpg|Glossy Pink Marli Nails Logo\.png)$/.test(source) &&
    !/[\\/]public[\\/](content|assets[\\/]uploads)([\\/]|$)/.test(source)
});

// Photos uploaded via /admin: deploy only resized WebP copies (orientation fixed,
// metadata such as GPS location removed), and point the content at them.
const content = await readContent(publicDir);
const uploadPattern = /^\/assets\/uploads\/([^/]+)\.(jpe?g|png|webp|avif|tiff?)$/i;
const uploads = new Map();
const collect = value => {
  if (typeof value === 'string') {
    const match = value.match(uploadPattern);
    if (match && !/-(640|1440)$/.test(match[1])) uploads.set(value, match[1]);
  } else if (value && typeof value === 'object') Object.values(value).forEach(collect);
};
collect(content);
if (uploads.size) {
  const { default: sharp } = await import('sharp');
  await mkdir(new URL('assets/uploads/', output), { recursive: true });
  for (const [source, base] of uploads) {
    const input = fileURLToPath(new URL(`.${decodeURIComponent(source)}`, publicDir));
    for (const width of [640, 1440]) {
      let quality = 80, buffer;
      do {
        buffer = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
        quality -= 10;
      } while (buffer.length > 400_000 && quality >= 50);
      await writeFile(new URL(`assets/uploads/${base}-${width}.webp`, output), buffer);
    }
  }
}
const optimized = value => {
  if (typeof value === 'string') return uploads.has(value) ? `/assets/uploads/${uploads.get(value)}-1440.webp` : value;
  if (Array.isArray(value)) return value.map(optimized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, optimized(v)]));
  return value;
};
await writeFile(new URL('content.js', output), contentScript(optimized(content)));
await writeFile(new URL('_headers', output),
  `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`);
console.log(`Static site ready in dist (${uploads.size} uploaded photo(s) optimized). Security headers generated for compatible HTTPS hosts.`);
