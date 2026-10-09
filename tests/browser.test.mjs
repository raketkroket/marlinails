import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createSiteServer } from '../server.mjs';

let server, browser, origin;
before(async () => {
  server = await createSiteServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});
after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

const pages = ['home', 'prijslijst', 'producten', 'over', 'contact'];
async function newPage(options = {}) {
  return (await browser.newContext(options)).newPage();
}
async function navigate(page, name) {
  await page.goto(`${origin}/#/${name === 'home' ? '' : name}`);
  await page.locator(`.view[data-view="${name}"].on`).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.view.on')).opacity === '1');
}

for (const [label, width, height] of [
  ['desktop', 1440, 1000], ['small desktop', 1100, 900], ['tablet', 820, 1180], ['mobile', 390, 844],
  ['small mobile', 320, 740], ['200% desktop zoom equivalent', 720, 500]
]) {
  test(`${label}: all pages reflow and pass automated WCAG AA checks`, async () => {
    const page = await newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const name of pages) {
      await navigate(page, name);
      const overflow = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth, viewport: innerWidth
      }));
      assert.ok(overflow.content <= overflow.viewport, `${name} overflow: ${JSON.stringify(overflow)}`);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(audit.violations.map(v => ({
        rule: v.id, elements: v.nodes.map(n => n.target)
      })), [], `${label}: ${name}`);
      const sizes = await page.locator('.view.on .btn, .ftr a, #menuBtn, .nav a, .actionbar a')
        .evaluateAll(elements => elements.filter(el => el.getClientRects().length && !el.closest('[inert]'))
          .map(el => ({ text: el.textContent.trim() || el.getAttribute('aria-label'),
            width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
      assert.deepEqual(sizes.filter(size => size.width < 44 || size.height < 44), [], `${name}: touch targets`);
      const bookingVisible = await page.locator('.hdr-book').isVisible() || await page.locator('.actionbar .btn-pink').isVisible();
      assert.equal(bookingVisible, true, 'An appointment action stays visible at every breakpoint');
    }
    assert.deepEqual(errors, []);
    await page.close();
  });
}

test('original images and fonts load locally, with no third-party requests', async () => {
  const page = await newPage();
  const external = [];
  page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
  await navigate(page, 'home');
  for (const image of await page.locator('.view.on img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(image => image.decode());
    assert.ok(await image.evaluate(image => image.naturalWidth > 0));
    const resolution = await image.evaluate(image => ({
      responsive: !!image.srcset, source: image.currentSrc, width: image.naturalWidth
    }));
    if (resolution.responsive) assert.match(resolution.source, /-(640|1440)\.webp$/);
    else assert.ok(resolution.width >= 500);
  }
  assert.equal(await page.locator('.gal button').count(), 6);
  const sources = await page.locator('.view.on img').evaluateAll(images => images.map(image => image.src));
  assert.equal(new Set(sources).size, sources.length, 'Homepage photographs must not repeat');
  assert.equal(await page.evaluate(() => document.fonts.check('18px "DM Sans"')), true);
  assert.equal(await page.evaluate(() => document.fonts.check('48px "DM Serif Display"')), true);
  assert.deepEqual(external, []);
  await page.close();
});

test('mobile menu traps focus, closes on Escape and same-page selection', async () => {
  const page = await newPage({ viewport: { width: 390, height: 844 } });
  await navigate(page, 'home');
  await page.locator('#menuBtn').click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#mmenu')).opacity === '1');
  assert.equal(await page.locator('#menuBtn').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Home');
  assert.equal(await page.locator('#main').evaluate(el => el.inert), true);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(audit.violations.map(v => v.id), []);
  await page.locator('.mm-info [data-mail]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'menuBtn');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), 'mailto:info@marlinails.nl');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'menuBtn');
  assert.equal(await page.locator('#main').evaluate(el => el.inert), false);
  await page.locator('#menuBtn').click();
  await page.locator('#mnav a').first().click();
  assert.equal(await page.locator('#menuBtn').getAttribute('aria-expanded'), 'false');
  await page.locator('#menuBtn').click();
  await page.locator('#mnav a[href="#/contact"]').click();
  await page.locator('[data-view="contact"].on').waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
  await page.close();
});

test('published prices, product details and contact links are preserved', async () => {
  const page = await newPage();
  await navigate(page, 'prijslijst');
  const expectedPrices = [
    ['50,00', '52,50'], ['60,00', '62,50'], ['65,00', '67,50'],
    ['67,50', '70,00'], ['80,00', '82,50'], ['15,00', '17,50'],
    ['3,00'], ['Gratis'], ['10,00', '12,50'], ['17,50'],
    ['35,00'], ['40,00'], ['50,00'], ['35,00'], ['37,50'], ['27,50']
  ];
  const values = await page.locator('.price-table tbody tr').evaluateAll(rows =>
    rows.map(row => [...row.querySelectorAll('td')].map(td => td.innerText.trim().replace(/^Kort en medium:\s*/, '').replace(/^€ /, ''))));
  assert.deepEqual(values, expectedPrices);
  await navigate(page, 'producten');
  assert.equal(await page.locator('#prods .pitems li').count(), 11);
  assert.match(await page.locator('#prods').innerText(), /69,95/);
  await navigate(page, 'contact');
  assert.equal(await page.locator('.direct [data-tel-href]').getAttribute('href'), 'tel:+31622889353');
  assert.equal(await page.locator('.direct [data-mail-href]').getAttribute('href'), 'mailto:info@marlinails.nl');
  assert.match(await page.locator('#addr').innerText(), /Sonatestraat 6\n1312 EH Almere/);
  assert.match(await page.locator('.ct-side [data-hours]').innerText(), /Woensdag/);
  const destination = new URL(await page.locator('.ct-side [data-route]').getAttribute('href'));
  assert.equal(destination.searchParams.get('destination'), 'Sonatestraat 6, 1312 EH Almere');
  await page.close();
});

test('form exposes validation errors and never claims to send a message', async () => {
  const page = await newPage();
  await navigate(page, 'contact');
  await page.locator('#cform button').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'f-name');
  assert.equal(await page.locator('#f-name').getAttribute('aria-invalid'), 'true');
  await page.locator('#f-name').fill('Marjon');
  await page.locator('#f-mail').fill('invalid');
  await page.locator('#cform button').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'f-mail');
  assert.equal(await page.locator('#f-mail').getAttribute('aria-describedby'), 'e-mail');
  assert.equal(await page.locator('#form-status').innerText(), '');
  await page.locator('#f-mail').fill('naam@voorbeeld.nl');
  await page.locator('#f-msg').fill('<script>alert("test")</script>& bericht');
  await page.locator('#cform button').click();
  assert.match(await page.locator('#form-status').innerText(), /nog niet verstuurd/);
  assert.match(await page.locator('#form-note').innerText(), /verstuurt niets en bewaart geen gegevens/);
  await page.close();
});

test('gallery is keyboard accessible and reduced motion leaves content visible', async () => {
  const page = await newPage({ reducedMotion: 'reduce' });
  await navigate(page, 'home');
  await page.locator('.gal button').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#lb').evaluate(el => el.open), true);
  await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('#lbCap').innerText(), /2 van 6/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#lb').evaluate(el => el.open), false);
  assert.equal(await page.locator('.reveal').first().evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await page.locator('.view.on').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.close();
});

test('no-JavaScript fallback exposes real contact information', async () => {
  const page = await newPage({ javaScriptEnabled: false });
  await page.goto(origin);
  assert.match(await page.locator('.no-js').innerText(), /06 22889353/);
  assert.equal(await page.locator('.no-js a').first().getAttribute('href'), 'tel:+31622889353');
  await page.close();
});

test('invalid routes recover to home without script errors', async () => {
  const page = await newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['missing', '__proto__', 'constructor']) {
    await page.goto(`${origin}/#/${route}`);
    await page.locator('[data-view="home"].on').waitFor();
    assert.equal(new URL(page.url()).hash, '#/');
  }
  assert.deepEqual(errors, []);
  await page.close();
});
