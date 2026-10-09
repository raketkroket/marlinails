import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { securityHeaders } from '../server.mjs';

const headers = await securityHeaders({ https: true });
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const deploymentHeaders = Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]));
for (const [name, value] of Object.entries(headers)) {
  if (deploymentHeaders[name] !== value) {
    throw new Error(`Update ${name} in vercel.json to match securityHeaders before deploying.`);
  }
}
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), {
  recursive: true,
  filter: source => !/[\\/]2026\d{4}_\d{6}\.jpg$/.test(source)
});
await writeFile(new URL('../dist/_headers', import.meta.url),
  `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`);
console.log('Static site ready in dist. Security headers generated for compatible HTTPS hosts.');
