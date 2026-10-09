import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { securityHeaders } from '../server.mjs';

const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), {
  recursive: true,
  filter: source => !/[\\/]2026\d{4}_\d{6}\.jpg$/.test(source)
});
const headers = await securityHeaders({ https: true });
await writeFile(new URL('../dist/_headers', import.meta.url),
  `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`);
console.log('Static site ready in dist. Security headers generated for compatible HTTPS hosts.');
