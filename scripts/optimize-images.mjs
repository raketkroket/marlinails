import { readdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const publicDir = new URL('../public/', import.meta.url);
const file = name => fileURLToPath(new URL(name, publicDir));
const logo = file('Glossy Pink Marli Nails Logo.png');
await sharp(logo)
  .resize({ width: 480, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(file('assets/marli-logo-glossy.png'));

// Square icons: the full logo, centred on the warm cream page colour.
const cream = { r: 248, g: 244, b: 238, alpha: 1 };
for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
  const inner = Math.round(size * .9);
  const mark = await sharp(logo).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: cream } })
    .composite([{ input: mark, gravity: 'centre' }]).png({ compressionLevel: 9 })
    .toFile(file(`assets/${name}`));
}

// Supplied 2026 originals (public/) and the earlier salon photos (public/assets/).
const sources = [
  ...(await readdir(publicDir)).filter(name => /^2026\d{4}_\d{6}\.jpg$/.test(name)),
  'marjon-portret.jpg', 'assets/20211111_160344.jpg', 'assets/20211010_124909.jpg'
];
if (!sources.some(name => name.startsWith('2026'))) throw new Error('No supplied 2026 salon photographs found.');
for (const name of sources) {
  for (const width of [640, 1440]) {
    const output = name.replace(/^assets\//, '').replace('.jpg', `-${width}.webp`);
    const buffer = await sharp(file(name))
      .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    if (buffer.length > 400_000) throw new Error(`${output} exceeds the 400 KB image budget.`);
    await writeFile(new URL(`assets/${output}`, publicDir), buffer);
    console.log(`${output}: ${(buffer.length / 1024).toFixed(0)} KB`);
  }
}

// Social sharing preview (Open Graph): 1200×630, logo on cream beside a salon photograph.
const sharePhoto = await sharp(file('20260617_215744.jpg')).rotate()
  .resize({ width: 600, height: 630, fit: 'cover', position: 'centre' }).toBuffer();
const shareLogo = await sharp(logo).resize({ width: 440 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: cream } })
  .composite([{ input: shareLogo, left: 80, top: 197 }, { input: sharePhoto, left: 600, top: 0 }])
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(file('assets/og-marli-nails.jpg'));
