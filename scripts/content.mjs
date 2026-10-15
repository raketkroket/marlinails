import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Editable content (public/content/*.json, edited via /admin) is delivered as one
// same-origin script, so the strict CSP needs no fetch/connect permissions.
export const contentFiles = ['home', 'prijzen', 'producten', 'over', 'contact'];

export async function readContent(publicRoot) {
  const entries = await Promise.all(contentFiles.map(async name =>
    [name, JSON.parse(await readFile(new URL(`content/${name}.json`, publicRoot), 'utf8'))]));
  return Object.fromEntries(entries);
}

// Lets the admin see when a saved change is live on the deployed site.
export function contentVersion(content) {
  const ordered = Object.fromEntries(contentFiles.map(name => [name, content[name]]));
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex').slice(0, 16);
}

export function contentScript(content) {
  return `window.MARLI_CONTENT=${JSON.stringify(content)};\nwindow.MARLI_CONTENT_VERSION=${JSON.stringify(contentVersion(content))};\n`;
}
