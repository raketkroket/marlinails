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
test('rose glass controls preserve readable fallbacks and reduced motion', async () => {
  const page = await newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await navigate(page, 'home');
  const style = await page.locator('.hero .btn-pink').evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    radius: getComputedStyle(el).borderRadius,
    transition: getComputedStyle(el).transitionDuration
  }));
  assert.equal(style.background, 'rgb(173, 45, 103)');
  assert.equal(style.color, 'rgb(255, 255, 255)');
  assert.equal(style.radius, '999px');
  assert.equal(style.transition, '0s');
  assert.equal(await page.locator('.book').evaluate(el =>
    getComputedStyle(el).backgroundColor), 'rgb(222, 208, 194)');
  assert.ok(await page.locator('.hdr').evaluate(el =>
    getComputedStyle(el).backdropFilter.includes('blur')));
  assert.equal(await page.locator('.hdr').evaluate(el =>
    getComputedStyle(el).backgroundColor), 'rgba(248, 244, 238, 0.82)');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-reduced-transparency', value: 'reduce' },
    { name: 'prefers-reduced-motion', value: 'reduce' }
  ] });
  for (const selector of ['.hdr', '.actionbar', '.mmenu']) {
    const fallback = await page.locator(selector).evaluate(el => ({
      background: getComputedStyle(el).backgroundColor,
      filter: getComputedStyle(el).backdropFilter
    }));
    assert.equal(fallback.background, 'rgb(248, 244, 238)');
    assert.equal(fallback.filter, 'none');
  }
  await page.close();
});

test('new glossy logo renders in header and footer without cropping or crowding navigation', async () => {
  for (const width of [320, 390, 820, 1180, 1440]) {
    const page = await newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(`${origin}/#/`);
    for (const selector of ['.hdr [data-logo]', '.ftr [data-logo]']) {
      const image = page.locator(selector);
      await image.evaluate(image => image.decode());
      assert.equal(await image.getAttribute('src'), '/assets/marli-logo-glossy.png');
      assert.equal(await image.getAttribute('alt'), 'Marli Nails');
      const size = await image.boundingBox();
      assert.ok(size.width >= 120 && size.height >= 44, 'Logo remains clearly visible');
      assert.ok(Math.abs(size.width / size.height - 480 / 257) < .02, 'Logo keeps its proportions');
    }
    const logo = await page.locator('.hdr .logo').boundingBox();
    const actions = await page.locator('.hdr-act').boundingBox();
    assert.ok(logo.x + logo.width < actions.x, 'Logo does not collide with header actions');
    assert.ok(await page.locator('.hdr .logo').evaluate(el => el.scrollWidth <= el.clientWidth));
    assert.equal(await page.locator('.hdr').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.locator('.hdr .logo').click();
    assert.equal(await page.locator('[data-view="home"].on').count(), 1);
    await page.close();
  }
});

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
  const page = await newPage({ reducedMotion: 'reduce' });
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
  assert.equal(await page.locator('.gal button').count(), 4);
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

test('mobile sections use full-width layouts and pricing keeps explicit size labels', async () => {
  for (const width of [320, 390, 720, 820]) {
    const page = await newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await navigate(page, 'home');
    for (const [section, content] of [
      ['.welkom-grid', '.welkom-copy'], ['.treat-layout', '.cards'], ['.book-grid', '.book-intro']
    ]) {
      const parent = await page.locator(section).evaluate(el => el.clientWidth -
        parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight));
      const child = await page.locator(content).boundingBox();
      assert.ok(child.width >= parent * .95, `${width}: ${content} must not inherit narrow desktop columns`);
    }
    assert.equal(await page.locator('.hero-text').evaluate(el => parseFloat(getComputedStyle(el).fontSize)), 17);
    await navigate(page, 'prijslijst');
    assert.equal(await page.locator('#natuurlijk tbody tr').first().locator('td[data-label="Kort"]').count(), 1);
    assert.equal(await page.locator('#natuurlijk tbody tr').first().locator('td[data-label="Medium"]').count(), 1);
    for (const cell of await page.locator('.price-table td').all()) {
      assert.ok(await cell.getAttribute('data-label'), 'Each amount has a mobile size/price label');
    }
    await page.close();
  }
});

test('small mobile menu and photo dialog remain usable in a short viewport', async () => {
  const page = await newPage({ viewport: { width: 320, height: 500 }, reducedMotion: 'reduce' });
  await navigate(page, 'home');
  await page.locator('#menuBtn').click();
  await page.locator('.mm-info [data-mail]').focus();
  await page.locator('.mm-info [data-mail]').scrollIntoViewIfNeeded();
  const email = await page.locator('.mm-info [data-mail]').boundingBox();
  assert.ok(email.y >= 80 && email.y + email.height <= 500);
  await page.keyboard.press('Escape');
  await page.locator('.gal button').first().click();
  await page.locator('#lbImg img').evaluate(image => image.decode());
  const dialog = await page.locator('#lb').boundingBox();
  assert.ok(dialog.y >= 0 && dialog.y + dialog.height <= 500);
  for (const control of await page.locator('.lb-ctrl button').all()) {
    const bounds = await control.boundingBox();
    assert.ok(bounds.width >= 44 && bounds.height >= 44);
  }
  await page.locator('#lbClose').click();
  assert.equal(await page.locator('#lb').evaluate(el => el.open), false);
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
  assert.match(await page.locator('#lbCap').innerText(), /2 van 4/);
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
