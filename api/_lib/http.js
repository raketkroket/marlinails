// Small HTTP helpers shared by the admin API (Vercel functions and the local server).
export const MAX_BODY = 4_400_000; // Vercel's request limit is 4.5 MB.

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function readJson(req) {
  // On Vercel the body may already be parsed; locally we read the stream.
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
  else {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) throw new HttpError(413, 'too_large', 'Het bestand is te groot.');
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (raw.length > MAX_BODY) throw new HttpError(413, 'too_large', 'Het bestand is te groot.');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, 'bad_request', 'Ongeldige aanvraag.');
  }
}

export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(body);
}

export function parseCookies(req) {
  const result = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    try { result[name] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* ignore malformed */ }
  }
  return result;
}

export function isHttps(req) {
  return Boolean(process.env.VERCEL) || req.headers['x-forwarded-proto'] === 'https';
}

export function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (process.env.VERCEL && (req.headers['x-real-ip'] || forwarded)) || req.socket?.remoteAddress || 'unknown';
}
