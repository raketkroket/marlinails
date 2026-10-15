import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { createSiteServer } from '../server.mjs';
import { hashPassword } from '../api/_lib/auth.js';
import { makeSite } from './helpers/site.mjs';

// Marjon's whole journey in a real browser: log in, click something on her website,
// change it, save, and see it on the public site, also after reloading and logging out.
const PASSWORD = 'Roze-Nagels-2026!';
let site, server, origin, browser;
before(async () => {
  site = await makeSite();
  Object.assign(process.env, { ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD), ADMIN_SESSION_SECRET: 'k'.repeat(48), ADMIN_LOCAL_ROOT: site.root });
  delete process.env.GITHUB_CONTENT_TOKEN;
  server = await createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await site.remove();
});

async function adminPage(viewport = { width: 1280, height: 860 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00+02:00'));
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  return page;
}
async function login(page, password = PASSWORD) {
  await page.goto(`${origin}/admin/`);
  await page.locator('#username').fill('marjon123');
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Inloggen' }).click();
}
const saved = page => page.waitForFunction(() => document.querySelector('#saveStatus').dataset.state === 'saved', null, { timeout: 20000 });
const axe = page => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).exclude('iframe').analyze();

test('login screen: Dutch errors, show/hide password, accessible, then a warm welcome', async () => {
  const page = await adminPage();
  await page.goto(`${origin}/admin/`);
  await page.locator('#loginForm').waitFor();
  assert.deepEqual((await axe(page)).violations.map(v => v.id), []);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  assert.equal(await page.locator('#loginError').innerText(), 'Vul uw gebruikersnaam in.');
  await page.locator('#username').fill('marjon123');
  await page.locator('#password').fill('verkeerd wachtwoord');
  await page.getByRole('button', { name: 'Toon' }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Verberg' }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'password');
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.locator('#loginError').filter({ hasText: 'klopt niet' }).waitFor();
  assert.equal(await page.locator('#loginError').innerText(), 'Gebruikersnaam of wachtwoord klopt niet.');
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.getByRole('heading', { name: 'Welkom terug, Marjon!' }).waitFor();
  assert.ok(await page.getByRole('link', { name: 'Mijn website bewerken' }).isVisible());
  assert.equal(await page.getByRole('link', { name: /Bekijk mijn website/ }).getAttribute('href'), '/');
  for (const item of ['Overzicht', 'Website bewerken', "Foto's", 'Prijslijst', 'Instellingen', 'Uitloggen']) {
    assert.ok(await page.locator('.sidenav').getByText(item, { exact: true }).isVisible(), item);
  }
  assert.deepEqual((await axe(page)).violations.map(v => v.id), []);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('click a headline on the website, change it, save: it stays after reload, logout and on the live site', async () => {
  const page = await adminPage();
  await login(page);
  await page.getByRole('link', { name: 'Mijn website bewerken' }).click();
  const preview = page.frameLocator('#preview');
  await preview.locator('#h-home.mx-edit').click();
  await page.getByRole('heading', { name: 'Tekst aanpassen' }).waitFor();
  assert.equal(await page.locator('#field').innerHTML(), 'Mooi verzorgde<br>nagels. <em>Helemaal u.</em>');
  await page.locator('#field').evaluate(el => { el.textContent = 'Welkom bij Marli'; });
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await saved(page);
  assert.equal(await page.locator('#saveStatus').innerText(), 'Wijzigingen opgeslagen!');
  await preview.locator('#h-home', { hasText: 'Welkom bij Marli' }).waitFor();
  assert.equal(JSON.parse(await readFile(path.join(site.root, 'public/content/home.json'), 'utf8')).hero.title, 'Welkom bij Marli');

  await page.reload();
  await page.getByRole('heading', { name: 'Home' }).waitFor();
  await preview.locator('#h-home', { hasText: 'Welkom bij Marli' }).waitFor();
  await page.locator('#logout').click();
  await page.locator('#loginForm').waitFor();
  await login(page);
  await page.getByRole('heading', { name: 'Welkom terug, Marjon!' }).waitFor();
  await page.goto(`${origin}/admin/#bewerken/home`);
  await page.frameLocator('#preview').locator('#h-home', { hasText: 'Welkom bij Marli' }).waitFor();

  const live = await browser.newPage();
  await live.goto(`${origin}/#/`);
  assert.equal(await live.locator('#h-home').innerText(), 'Welkom bij Marli');
  await live.close();
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('replace a photo: choose a file, see progress and a preview, adjust the crop, save', async () => {
  const page = await adminPage();
  await login(page);
  await page.locator('.sidenav').getByText("Foto's", { exact: true }).click();
  await page.locator('[data-photo="home.gallery.photos.1"]').click();
  await page.getByRole('heading', { name: 'Foto vervangen' }).waitFor();
  await page.locator('#file').setInputFiles({ name: 'notitie.txt', mimeType: 'text/plain', buffer: Buffer.from('geen foto') });
  assert.equal(await page.locator('#panelError').innerText(), 'Kies een foto in JPG-, PNG- of WebP-formaat.');
  const photo = await sharp({ create: { width: 1800, height: 2400, channels: 3, background: '#e6a3c0' } }).jpeg().toBuffer();
  await page.locator('#file').setInputFiles({ name: 'nagels.jpg', mimeType: 'image/jpeg', buffer: photo });
  await page.locator('#progressLabel', { hasText: 'Foto is klaar' }).waitFor({ timeout: 20000 });
  assert.match(await page.locator('#cropImg').getAttribute('src'), /^data:image\/webp;base64,/);
  const box = await page.locator('#crop').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
  await page.locator('#alt').fill('Zachtroze nagels');
  await page.locator('#caption').fill('Zachtroze klassiek');
  // "Voorbeeld bekijken" shows the photo on the page first; nothing is saved yet.
  await page.getByRole('button', { name: 'Voorbeeld bekijken' }).click();
  await page.locator('#preview').waitFor();
  assert.equal(await page.locator('#saveStatus').innerText(), 'Niet-opgeslagen wijzigingen');
  assert.equal(await page.locator('#saveAll').isEnabled(), true);
  await page.frameLocator('#preview').locator('[data-edit="home.gallery.photos.1.caption"]', { hasText: 'Zachtroze klassiek' }).waitFor();
  await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click();
  await saved(page);
  const home = JSON.parse(await readFile(path.join(site.root, 'public/content/home.json'), 'utf8'));
  const savedPhoto = home.gallery.photos[1];
  assert.match(savedPhoto.src, /^\/assets\/uploads\/[a-z0-9-]+-1440\.webp$/);
  assert.equal(savedPhoto.alt, 'Zachtroze nagels');
  assert.equal(savedPhoto.focus, '50% 20%');
  const live = await browser.newPage();
  await live.goto(`${origin}/#/`);
  const image = live.locator('[data-g="1"] img');
  await image.scrollIntoViewIfNeeded();
  await image.evaluate(img => img.decode());
  assert.ok(await image.evaluate(img => img.naturalWidth > 0));
  assert.match(await image.getAttribute('srcset'), /uploads\/[a-z0-9-]+-640\.webp 640w/);
  await live.close();
  await page.context().close();
});

test('prices: a scheduled change waits for 1 January 2027; a direct change is immediate', async () => {
  const page = await adminPage();
  await login(page);
  await page.locator('.sidenav').getByText('Prijslijst', { exact: true }).click();
  await page.locator('[data-price="prijzen.groups.0.rows.0.price"]').click();
  await page.getByRole('heading', { name: 'Natural Nail treatment (BIAB) — Kort' }).waitFor();
  await page.locator('#amount').fill('55,00');
  await page.locator('#panel input[name=when][value=later]').check();
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await saved(page);
  const row = page.locator('.price-row').first();
  assert.match(await row.innerText(), /Nu\s*€\s50,00/i);
  assert.match(await row.innerText(), /Vanaf 1 januari 2027\s*€\s55,00\s*Zelf ingepland/i);

  await page.locator('[data-price="producten.categories.0.items.0.price"]').click();
  await page.locator('#amount').fill('abc');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  assert.equal(await page.locator('#panelError').innerText(), 'Vul een geldig bedrag in, bijvoorbeeld 52,50.');
  await page.locator('#amount').fill('20,95');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await saved(page);

  const live = await browser.newPage();
  await live.clock.setFixedTime(new Date('2026-10-15T12:00:00+02:00'));
  await live.goto(`${origin}/#/prijslijst`);
  assert.equal((await live.locator('#natuurlijk tbody td').first().innerText()).replace(/\s/g, ' '), '€ 50,00');
  await live.locator('[data-period="future"]').click();
  assert.equal((await live.locator('#natuurlijk tbody td').first().innerText()).replace(/\s/g, ' '), '€ 55,00');
  await live.goto(`${origin}/#/producten`);
  assert.match(await live.locator('#prods').innerText(), /€ 20,95/);
  await live.close();
  const next = await browser.newPage();
  await next.clock.setFixedTime(new Date('2027-01-02T12:00:00+01:00'));
  await next.goto(`${origin}/#/prijslijst`);
  assert.equal((await next.locator('#natuurlijk tbody td').first().innerText()).replace(/\s/g, ' '), '€ 55,00');
  await next.close();
  await page.context().close();
});

test('phone: login, dashboard, editor and the edit sheet fit the screen', async () => {
  const page = await adminPage({ width: 375, height: 760 });
  await login(page);
  await page.getByRole('heading', { name: 'Welkom terug, Marjon!' }).waitFor();
  // Nothing may stick out of the screen, except inside a row that scrolls sideways (the page tabs).
  const wide = () => page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter(e => !e.closest('.page-tabs') && e.getBoundingClientRect().right > innerWidth + 1)
    .map(e => `${e.tagName}.${e.className}`).slice(0, 5));
  assert.deepEqual(await wide(), []);
  assert.ok(await page.locator('.sidenav').isVisible());
  await page.getByRole('link', { name: 'Mijn website bewerken' }).click();
  await page.frameLocator('#preview').locator('[data-c="home.hero.text"].mx-edit').click();
  await page.getByRole('heading', { name: 'Tekst aanpassen' }).waitFor();
  const sheet = await page.locator('#panel').boundingBox();
  assert.ok(sheet.x >= 0 && sheet.x + sheet.width <= 375 && sheet.y + sheet.height <= 760);
  assert.ok(await page.getByRole('button', { name: 'Opslaan', exact: true }).isVisible());
  assert.deepEqual(await wide(), []);
  await page.context().close();
});

test('an expired session sends Marjon back to the login, keeping unsaved work', async () => {
  const page = await adminPage();
  await login(page);
  await page.getByRole('link', { name: 'Mijn website bewerken' }).click();
  await page.frameLocator('#preview').locator('[data-c="home.hero.prelude"].mx-edit').click();
  await page.getByRole('heading', { name: 'Tekst aanpassen' }).waitFor();
  await page.locator('#field').fill('Met zorg gemaakt.');
  await page.context().clearCookies();
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
  await page.locator('#loginError', { hasText: 'automatisch uitgelogd' }).waitFor();
  assert.match(await page.locator('#loginError').innerText(), /niet-opgeslagen wijzigingen blijven bewaard/);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click();
  await saved(page);
  assert.equal(JSON.parse(await readFile(path.join(site.root, 'public/content/home.json'), 'utf8')).hero.prelude, 'Met zorg gemaakt.');
  await page.context().close();
});
