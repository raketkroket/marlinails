import { readdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const publicDir = new URL('../public/', import.meta.url);
await sharp(fileURLToPath(new URL('Glossy Pink Marli Nails Logo.png', publicDir)))
  .resize({ width: 480, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL('assets/marli-logo-glossy.png', publicDir)));
const sources = (await readdir(publicDir)).filter(name => /^2026\d{4}_\d{6}\.jpg$/.test(name));
if (!sources.length) throw new Error('No supplied 2026 salon photographs found.');
for (const name of sources) {
  for (const width of [640, 1440]) {
    const output = name.replace('.jpg', `-${width}.webp`);
    const buffer = await sharp(fileURLToPath(new URL(name, publicDir)))
      .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    if (buffer.length > 400_000) throw new Error(`${output} exceeds the 400 KB image budget.`);
    await writeFile(new URL(`assets/${output}`, publicDir), buffer);
    console.log(`${output}: ${(buffer.length / 1024).toFixed(0)} KB`);
  }
}
