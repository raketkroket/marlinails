import { readFile } from 'node:fs/promises';

// Editable content (public/content/*.json, edited via /admin) is delivered as one
// same-origin script, so the strict CSP needs no fetch/connect permissions.
export const contentFiles = ['home', 'prijzen', 'producten', 'over', 'contact'];

export async function readContent(publicRoot) {
  const entries = await Promise.all(contentFiles.map(async name =>
    [name, JSON.parse(await readFile(new URL(`content/${name}.json`, publicRoot), 'utf8'))]));
  return Object.fromEntries(entries);
}

export function contentScript(content) {
  return `window.MARLI_CONTENT=${JSON.stringify(content)};\n`;
}
