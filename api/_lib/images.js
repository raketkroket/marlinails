import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { HttpError } from './http.js';

export const MAX_UPLOAD = 3_200_000; // bytes after decoding; the browser shrinks large photos first

// Only accept what the file really is, not what its name says.
export function sniff(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Returns 640 px and 1440 px WebP versions: orientation fixed, all metadata (EXIF, GPS) removed.
export async function processPhoto(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new HttpError(400, 'invalid_image', 'Er is geen foto ontvangen.');
  if (buffer.length > MAX_UPLOAD) throw new HttpError(413, 'too_large', 'Deze foto is te groot. Kies een kleinere foto.');
  const type = sniff(buffer);
  if (!type) throw new HttpError(415, 'invalid_image', 'Dit bestand is geen JPG-, PNG- of WebP-foto.');
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: 50_000_000, failOn: 'error' }).metadata();
  } catch {
    throw new HttpError(415, 'invalid_image', 'Deze foto kan niet worden gelezen. Probeer een andere foto.');
  }
  if (meta.format !== type) throw new HttpError(415, 'invalid_image', 'Dit bestand is geen geldige foto.');
  const rotated = (meta.orientation || 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (Math.min(width, height) < 400) throw new HttpError(422, 'too_small', 'Deze foto is te klein. Kies een foto van minimaal 400 pixels breed en hoog.');
  const variants = {};
  for (const size of [640, 1440]) {
    let quality = 82;
    let output;
    do {
      output = await sharp(buffer, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer();
      quality -= 8;
    } while (output.length > 450_000 && quality >= 50);
    variants[size] = output;
  }
  return { variants, width, height };
}

export function uploadId(now = new Date()) {
  return `${now.toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(5).toString('hex')}`;
}
