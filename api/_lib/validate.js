import { HttpError } from './http.js';
import { amsterdamToday, rollOver } from '../../public/admin/prices.js';

// Server-side checks for a save: the new content must have exactly the same structure
// as the stored content (no added/removed pages, sections or list items), and every
// value must be a safe text, price, photo path or option.
const PRICE_KEYS = new Set(['price', 'medium', 'next', 'nextMedium']);
const NULLABLE = new Set(['medium', 'next', 'nextMedium']);
const IMAGE_KEYS = new Set(['src', 'photo']);
const SHORT_KEYS = new Set(['title', 'name', 'caption', 'prelude', 'period', 'size', 'alt']);
const REQUIRED_KEYS = new Set(['title', 'name', 'src', 'photo', 'alt']);
const FIXED_KEYS = new Set(['since', 'change']); // the price schedule is not editable in the admin
const FOCUS = /^(center|top|bottom|\d{1,3}% \d{1,3}%)$/;
export const IMAGE_PATH = /^\/(?:assets\/(?:uploads\/[a-z0-9-]+-1440\.webp|[A-Za-z0-9._-]+\.(?:webp|jpe?g|png))|pedicure%20marli\.jpg)$/;

const label = path => path.join(' › ');

export function cleanText(value) {
  return String(value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, '')                       // no HTML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fail(path, message) {
  throw new HttpError(400, 'invalid', `${message} (${label(path)})`);
}

function check(next, current, path) {
  const key = path[path.length - 1];
  if (Array.isArray(current)) {
    if (!Array.isArray(next) || next.length !== current.length) fail(path, 'Onderdelen toevoegen of verwijderen is niet mogelijk');
    return current.map((item, i) => check(next[i], item, [...path, String(i)]));
  }
  if (current && typeof current === 'object') {
    if (!next || typeof next !== 'object' || Array.isArray(next)) fail(path, 'Ongeldige inhoud');
    const keys = Object.keys(current);
    if (Object.keys(next).length !== keys.length || keys.some(k => !(k in next))) fail(path, 'Ongeldige inhoud');
    return Object.fromEntries(keys.map(k => [k, FIXED_KEYS.has(k) && path.length === 1 ? current[k] : check(next[k], current[k], [...path, k])]));
  }
  if (PRICE_KEYS.has(key)) {
    if (key === 'medium' && current === null) {
      if (next !== null && next !== '') fail(path, 'Deze behandeling heeft één prijs');
      return null;
    }
    if (NULLABLE.has(key) && key !== 'medium' && (next === null || next === '')) return null;
    const value = typeof next === 'string' ? Number(next.replace(',', '.')) : next;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000) fail(path, 'Vul een prijs in tussen € 0 en € 1000');
    if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) fail(path, 'Een prijs heeft maximaal twee cijfers achter de komma');
    return Math.round(value * 100) / 100;
  }
  if (typeof current === 'boolean') {
    if (typeof next !== 'boolean') fail(path, 'Ongeldige keuze');
    return next;
  }
  if (typeof current === 'string') {
    if (typeof next !== 'string') fail(path, 'Ongeldige tekst');
    if (IMAGE_KEYS.has(key)) {
      if (!IMAGE_PATH.test(next)) fail(path, 'Ongeldige foto');
      return next;
    }
    if (key === 'focus') {
      if (!FOCUS.test(next) || next.split(' ').some(v => parseInt(v, 10) > 100)) fail(path, 'Ongeldige uitsnede');
      return next;
    }
    const text = cleanText(next);
    const max = SHORT_KEYS.has(key) ? 200 : 2000;
    if (text.length > max) fail(path, `Deze tekst is te lang (maximaal ${max} tekens)`);
    if (!text && REQUIRED_KEYS.has(key) && current) fail(path, 'Dit veld mag niet leeg zijn');
    return text;
  }
  fail(path, 'Ongeldige inhoud');
}

export function validateFile(name, next, current, today = amsterdamToday()) {
  const cleaned = check(next, current, [name]);
  return name === 'prijzen' ? rollOver(cleaned, today) : cleaned;
}

export function imagePaths(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach(item => imagePaths(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (IMAGE_KEYS.has(key) && typeof item === 'string') found.add(item);
      else imagePaths(item, found);
    }
  }
  return found;
}
