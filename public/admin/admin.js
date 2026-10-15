// Marli Nails, website editor ("Mijn website"). Dutch, simple, visual.
// Talks only to /api/admin on this site; no credentials or tokens live in the browser
// except the HTTP-only session cookie and a CSRF token for writes.
import { amsterdamToday, changePending, choicesOf, describe, dutchDate, encode, euro, round } from './prices.js';

const FILES = ['home', 'prijzen', 'producten', 'over', 'contact'];
const PAGES = [
  { id: 'home', title: 'Home', route: '#/', text: 'Grote foto, welkomsttekst, behandelingen en fotogalerij' },
  { id: 'prijslijst', file: 'prijzen', title: 'Prijslijst', route: '#/prijslijst', text: 'Alle behandelingen en prijzen' },
  { id: 'producten', title: 'Producten Seduction', route: '#/producten', text: 'Verzorgingsproducten en prijzen' },
  { id: 'over', title: 'Over Marli Nails', route: '#/over', text: 'Uw verhaal, opleiding en werkwijze' },
  { id: 'contact', title: 'Contact', route: '#/contact', text: 'De tekst op de contactpagina' }
];
const LABELS = {
  'home.hero.prelude': 'Korte zin boven de grote titel', 'home.hero.title': 'Grote titel bovenaan', 'home.hero.text': 'Tekst bovenaan',
  'home.welcome.title': 'Welkomsttitel', 'home.welcome.lead': 'Inleiding welkom', 'home.welcome.text': 'Welkomsttekst',
  'home.treatments.title': 'Titel behandelingen', 'home.treatments.intro': 'Tekst behandelingen',
  'home.gallery.title': 'Titel fotogalerij', 'home.gallery.intro': 'Tekst fotogalerij',
  'home.booking.title': 'Titel afspraak maken', 'home.booking.text': 'Tekst afspraak maken',
  'prijzen.intro': 'Tekst bovenaan de prijslijst', 'prijzen.toeNote': 'Uitleg over teennagels',
  'prijzen.lengthNote': 'Opmerking over nagellengte', 'prijzen.cancelNote': 'Annuleringsregel',
  'producten.intro': 'Tekst bovenaan', 'contact.intro': 'Tekst bovenaan',
  'over.title': 'Titel', 'over.lead': 'Inleiding', 'over.text': 'Tekst', 'over.story.title': 'Titel van uw verhaal',
  'over.story.intro': 'Inleiding van uw verhaal', 'over.education.title': 'Titel opleiding', 'over.education.intro': 'Tekst opleiding',
  'over.values.title': 'Titel werkwijze', 'over.values.intro': 'Tekst werkwijze', 'over.register.title': 'Titel NAIL register',
  'over.register.intro': 'Inleiding NAIL register', 'over.register.you': 'Slottekst NAIL register'
};
const KEY_LABELS = { title: 'Titel', text: 'Tekst', name: 'Naam', caption: 'Bijschrift', intro: 'Inleiding', lead: 'Inleiding',
  prelude: 'Korte zin', period: 'Jaar of periode', size: 'Inhoud', desc: 'Toelichting', you: 'Slottekst' };
const SHORT = new Set(['title', 'name', 'caption', 'prelude', 'period', 'size', 'alt']);
const REQUIRED = new Set(['title', 'name', 'alt']);
const FOCUS = { center: [50, 50], top: [50, 25], bottom: [50, 75] };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = value => JSON.parse(JSON.stringify(value));
const keys = path => path.split('.');
const get = (obj, path) => keys(path).reduce((o, k) => (o == null ? undefined : o[k]), obj);
function set(obj, path, value) {
  const parts = keys(path);
  const last = parts.pop();
  parts.reduce((o, k) => o[k], obj)[last] = value;
}
const lastKey = path => keys(path).pop();
const parentPath = path => keys(path).slice(0, -1).join('.');
const fileOf = path => keys(path)[0];
const pageOfFile = file => PAGES.find(p => (p.file || p.id) === file) || PAGES[0];
const icon = name => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const state = {
  csrf: null, content: null, draft: null, versions: null,
  uploads: new Map(), previews: new Map(),
  saving: null, saveAgain: false, status: 'clean', lastError: '',
  deployed: null, pendingVersion: null, watch: null,
  device: 'desktop', route: '#/', restoreScroll: 0, flash: null
};

/* ---------- Server ---------- */
const OFFLINE = 'Geen verbinding. Controleer uw internet en probeer het opnieuw.';
async function api(action, { method = 'GET', body, query = '' } = {}) {
  let response;
  try {
    response = await fetch(`/api/admin?action=${action}${query}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: method === 'POST' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf || '' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw Object.assign(new Error(OFFLINE), { status: 0 });
  }
  let data = {};
  try { data = await response.json(); } catch { /* empty */ }
  if (!response.ok) {
    const error = Object.assign(new Error(data.message || 'Er ging iets mis. Probeer het opnieuw.'), { status: response.status, code: data.error });
    if (response.status === 401 && action !== 'login' && state.csrf) sessionExpired();
    throw error;
  }
  return data;
}

function uploadPhoto(base64, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin?action=upload');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-CSRF-Token', state.csrf || '');
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* empty */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      if (xhr.status === 401) sessionExpired();
      reject(new Error(data.message || 'Uploaden is niet gelukt. Probeer het opnieuw.'));
    };
    xhr.onerror = () => reject(new Error(OFFLINE));
    xhr.send(JSON.stringify({ image: base64 }));
  });
}

async function loadContent() {
  const data = await api('content');
  state.content = data.content;
  state.draft = clone(data.content);
  state.versions = data.versions;
  state.pendingVersion = data.contentVersion;
  watchDeploy();
}

/* ---------- Opslaan ---------- */
const dirtyFiles = () => state.draft ? FILES.filter(n => JSON.stringify(state.draft[n]) !== JSON.stringify(state.content[n])) : [];
const STATUS = {
  clean: 'Alles is opgeslagen', dirty: 'Niet-opgeslagen wijzigingen', saving: 'Wijzigingen worden opgeslagen...',
  saved: 'Wijzigingen opgeslagen!', error: 'Opslaan is niet gelukt'
};
function setStatus(next) {
  state.status = next;
  const el = $('#saveStatus');
  el.dataset.state = next;
  el.textContent = STATUS[next];
  $('#saveAll').disabled = next === 'saving' || !dirtyFiles().length;
}
function refreshStatus() {
  if (state.saving) return;
  if (dirtyFiles().length) setStatus(state.status === 'error' ? 'error' : 'dirty');
  else if (state.status !== 'saved') setStatus('clean');
  else setStatus('saved');
}

function referencedUploads(names) {
  const used = new Set();
  const walk = value => {
    if (typeof value === 'string' && state.uploads.has(value)) used.add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  names.forEach(name => walk(state.draft[name]));
  return [...used];
}

async function saveNow() {
  if (state.saving) { state.saveAgain = true; return state.saving; }
  const names = dirtyFiles();
  if (!names.length) { refreshStatus(); return true; }
  setStatus('saving');
  state.saving = (async () => {
    const sent = Object.fromEntries(names.map(n => [n, clone(state.draft[n])]));
    const used = referencedUploads(names);
    try {
      const result = await api('save', { method: 'POST', body: {
        content: sent, versions: state.versions, uploads: used.map(src => state.uploads.get(src))
      } });
      for (const name of names) {
        state.content[name] = result.content[name];
        // Keep anything typed while saving; otherwise take the server's checked version.
        if (JSON.stringify(state.draft[name]) === JSON.stringify(sent[name])) state.draft[name] = clone(result.content[name]);
      }
      state.versions = result.versions;
      used.forEach(src => state.uploads.delete(src));
      state.pendingVersion = result.contentVersion;
      setStatus('saved');
      toast('Wijzigingen opgeslagen! Ze staan binnen ongeveer een minuut op uw website.');
      watchDeploy();
      reloadPreview();
      return true;
    } catch (error) {
      setStatus('error');
      toast(error.message, true);
      return false;
    } finally {
      state.saving = null;
      if (state.saveAgain) { state.saveAgain = false; setTimeout(saveNow, 0); }
      else refreshStatus();
    }
  })();
  return state.saving;
}

// Shows when a saved change is visible on the public website.
function watchDeploy() {
  clearTimeout(state.watch);
  const started = Date.now();
  const check = async () => {
    try {
      const script = await (await fetch(`/content.js?_=${Date.now()}`, { cache: 'no-store' })).text();
      state.deployed = (script.match(/MARLI_CONTENT_VERSION="([0-9a-f]+)"/) || [])[1] || null;
    } catch { /* try again */ }
    const live = state.deployed === state.pendingVersion;
    renderDeployCard();
    if (live) {
      if (state.status === 'saved') toast('Uw website is bijgewerkt.');
      return;
    }
    if (Date.now() - started < 6 * 60 * 1000) state.watch = setTimeout(check, 6000);
  };
  check();
}
function renderDeployCard() {
  const card = $('#deployCard');
  if (!card) return;
  const live = state.deployed && state.deployed === state.pendingVersion;
  card.classList.toggle('is-busy', !live);
  card.innerHTML = live
    ? `${icon('check')}<span>Uw website is helemaal bijgewerkt.</span>`
    : `${icon('calendar')}<span>Uw laatste wijzigingen worden op dit moment op uw website gezet. Dat duurt meestal ongeveer een minuut.</span>`;
}

let toastTimer;
function toast(message, error = false) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('is-error', error);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, error ? 8000 : 4500);
}

/* ---------- Inloggen ---------- */
function showLogin(message = '') {
  $('#app').hidden = true;
  $('#login').hidden = false;
  const error = $('#loginError');
  error.textContent = message;
  error.hidden = !message;
  setTimeout(() => ($('#username').value ? $('#password') : $('#username')).focus(), 0);
}
function showApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  refreshStatus();
  route();
}
function sessionExpired() {
  if ($('#panel').open) $('#panel').close();
  showLogin(dirtyFiles().length
    ? 'U bent automatisch uitgelogd. Log opnieuw in; uw niet-opgeslagen wijzigingen blijven bewaard.'
    : 'U bent automatisch uitgelogd. Log opnieuw in.');
}

$('#togglePassword').addEventListener('click', event => {
  const input = $('#password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  const button = event.currentTarget;
  button.setAttribute('aria-pressed', String(show));
  button.innerHTML = `${icon(show ? 'eye-off' : 'eye')}<span>${show ? 'Verberg' : 'Toon'}</span>`;
  input.focus();
});

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const username = $('#username').value.trim();
  const password = $('#password').value;
  const error = $('#loginError');
  if (!username || !password) {
    error.textContent = !username ? 'Vul uw gebruikersnaam in.' : 'Vul uw wachtwoord in.';
    error.hidden = false;
    (!username ? $('#username') : $('#password')).focus();
    return;
  }
  const button = $('#loginButton');
  button.disabled = true;
  button.textContent = 'Bezig met inloggen...';
  error.hidden = true;
  try {
    const result = await api('login', { method: 'POST', body: { username, password } });
    state.csrf = result.csrf;
    $('#password').value = '';
    if (!state.content) await loadContent();
    showApp();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    $('#password').select();
  } finally {
    button.disabled = false;
    button.textContent = 'Inloggen';
  }
});

$('#logout').addEventListener('click', async () => {
  if (dirtyFiles().length && !confirm('U heeft wijzigingen die nog niet zijn opgeslagen. Toch uitloggen? Deze wijzigingen gaan dan verloren.')) return;
  try { await api('logout', { method: 'POST' }); } catch { /* the cookie is cleared either way */ }
  Object.assign(state, { csrf: null, content: null, draft: null, versions: null });
  state.uploads.clear();
  state.previews.clear();
  location.hash = '#overzicht';
  showLogin();
  toast('U bent uitgelogd.');
});

$('#saveAll').addEventListener('click', () => saveNow());
addEventListener('beforeunload', event => {
  if (dirtyFiles().length || state.saving) { event.preventDefault(); event.returnValue = ''; }
});

/* ---------- Schermen ---------- */
function route() {
  if ($('#app').hidden) return;
  const [view = 'overzicht', page] = location.hash.replace(/^#/, '').split('/');
  const views = { overzicht: viewDashboard, bewerken: viewEditor, fotos: viewPhotos, prijslijst: viewPrices, instellingen: viewSettings };
  const render = views[view] || viewDashboard;
  const active = views[view] ? view : 'overzicht';
  $$('.sidenav [data-nav]').forEach(a => a.dataset.nav === active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const main = $('#view');
  main.classList.toggle('editor-mode', view === 'bewerken' && Boolean(page));
  render(main, page);
  main.focus({ preventScroll: true });
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
// One click handler for the buttons in the Foto's and Prijslijst screens.
$('#view').addEventListener('click', event => {
  const photo = event.target.closest('[data-photo]');
  const price = event.target.closest('[data-price]');
  const schedule = event.target.closest('[data-schedule]');
  if (photo) openImage(photo.dataset.photo);
  else if (price) openPrice(price.dataset.price);
  else if (schedule) openSchedule(schedule.dataset.schedule);
});

function viewDashboard(main) {
  main.innerHTML = `
    <section class="welcome">
      <h1>Welkom terug, <em>Marjon!</em></h1>
      <p>Wat wilt u vandaag aanpassen? Klik op <strong>Mijn website bewerken</strong> en daarna op een tekst, foto of prijs.</p>
      <div class="welcome-actions">
        <a class="btn btn-primary btn-big" href="#bewerken/home">${icon('edit')}Mijn website bewerken</a>
        <a class="btn btn-soft btn-big" href="/" target="_blank" rel="noopener">${icon('external')}Bekijk mijn website<span class="sr"> (opent in een nieuw venster)</span></a>
      </div>
      <div class="status-card" id="deployCard"></div>
    </section>
    <div class="tiles">
      <a class="tile" href="#fotos"><span class="tile-icon">${icon('photo')}</span><h2>Foto's vervangen</h2><p>Kies een nieuwe foto voor de galerij, uw profiel of een behandeling.</p></a>
      <a class="tile" href="#prijslijst"><span class="tile-icon">${icon('euro')}</span><h2>Prijzen aanpassen</h2><p>Pas een prijs direct aan, of plan hem in voor later.</p></a>
      <a class="tile" href="#bewerken"><span class="tile-icon">${icon('edit')}</span><h2>Teksten aanpassen</h2><p>Kies een pagina en klik op de tekst die u wilt veranderen.</p></a>
    </div>`;
  renderDeployCard();
}

function viewEditor(main, pageId) {
  const page = PAGES.find(p => p.id === pageId);
  if (!page) {
    main.innerHTML = `
      <div class="view-head"><div><h1>Website bewerken</h1><p>Kies de pagina die u wilt aanpassen. Daarna klikt u op een tekst, foto of prijs.</p></div></div>
      <div class="pages">${PAGES.map((p, i) => `
        <a class="page-card" href="#bewerken/${p.id}"><span class="num">0${i + 1}</span><h2>${esc(p.title)}</h2><p>${esc(p.text)}</p><span class="go">Bewerken →</span></a>`).join('')}
      </div>`;
    return;
  }
  state.route = page.route;
  main.innerHTML = `
    <section class="editor">
      <div class="editor-bar">
        <a class="btn btn-ghost" href="#bewerken">${icon('back')}Alle pagina's</a>
        <h1 id="editorTitle">${esc(page.title)}</h1>
        <div class="page-tabs" role="group" aria-label="Pagina">${PAGES.map(p => `<button type="button" data-page="${p.id}" aria-pressed="${p.id === page.id}">${esc(p.title)}</button>`).join('')}</div>
        <div class="device" role="group" aria-label="Weergave">
          <button type="button" data-device="desktop" aria-pressed="${state.device === 'desktop'}">${icon('desktop')}Computer</button>
          <button type="button" data-device="phone" aria-pressed="${state.device === 'phone'}">${icon('phone')}Telefoon</button>
        </div>
        <p class="editor-hint">${icon('pointer')}Klik op een tekst, foto of prijs om die aan te passen.</p>
      </div>
      <div class="stage"><div class="frame${state.device === 'phone' ? ' is-phone' : ''}" id="frame">
        <iframe id="preview" title="Voorbeeld van uw website: ${esc(page.title)}" src="/admin/preview.html${page.route}"></iframe>
      </div></div>
    </section>`;
  const frame = $('#frame');
  const fit = () => frame.style.setProperty('--s', String(Math.min(1, frame.clientWidth / 1280)));
  new ResizeObserver(fit).observe(frame);
  fit();
  $('#preview').addEventListener('load', () => {
    const win = $('#preview').contentWindow;
    if (state.restoreScroll) { win.scrollTo(0, state.restoreScroll); state.restoreScroll = 0; }
  });
  main.querySelector('.page-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (button) location.hash = `#bewerken/${button.dataset.page}`;
  });
  main.querySelector('.device').addEventListener('click', event => {
    const button = event.target.closest('[data-device]');
    if (!button) return;
    state.device = button.dataset.device;
    $$('.device [data-device]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('#frame').classList.toggle('is-phone', state.device === 'phone');
  });
}

function reloadPreview() {
  const frame = $('#preview');
  if (!frame) return;
  try {
    state.restoreScroll = frame.contentWindow.scrollY;
    frame.contentWindow.location.reload();
  } catch { /* not loaded yet */ }
}

addEventListener('message', event => {
  const frame = $('#preview');
  if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow) return;
  const data = event.data || {};
  if (data.source !== 'marli-preview') return;
  if (data.type === 'edit' && typeof data.path === 'string' && FILES.includes(fileOf(data.path))) openEditor(data.kind, data.path);
  if (data.type === 'route') {
    const page = PAGES.find(p => p.id === data.page) || PAGES[0];
    $$('.page-tabs [data-page]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.page === page.id)));
    const title = $('#editorTitle');
    if (title) title.textContent = page.title;
    if (location.hash !== `#bewerken/${page.id}`) history.replaceState(null, '', `#bewerken/${page.id}`);
  }
  if (data.type === 'ready' && state.flash) {
    const target = frame.contentDocument.querySelector(`[data-mx-path="${CSS.escape(state.flash)}"]`);
    if (target) { target.scrollIntoView({ block: 'center' }); target.classList.add('mx-flash'); }
    state.flash = null;
  }
});

// What the preview shows: the draft, with photos that are not on the website yet.
function previewSrc(src, small = false) {
  if (state.previews.has(src)) return state.previews.get(src);
  if (/^\/assets\/uploads\/[a-z0-9-]+-1440\.webp$/.test(src)) return `/api/admin?action=media&src=${small ? src.replace(/-1440\.webp$/, '-640.webp') : src}`;
  if (small && /-1440\.webp$/.test(src)) return src.replace(/-1440\.webp$/, '-640.webp');
  return src;
}
window.MarliAdmin = {
  previewContent() {
    const map = value => {
      if (typeof value === 'string') return value.startsWith('/assets/uploads/') ? previewSrc(value) : value;
      if (Array.isArray(value)) return value.map(map);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, map(v)]));
      return value;
    };
    return map(clone(state.draft));
  }
};

/* ---------- Foto's ---------- */
function photoSlots() {
  const home = state.draft.home;
  return [
    { path: 'home.hero.photo', label: 'Grote foto bovenaan de homepage', ratio: '16 / 9', page: 'home' },
    { path: 'over.portrait', label: 'Uw profielfoto (homepage en Over Marli Nails)', ratio: '4 / 5', page: 'over' },
    ...home.treatments.cards.map((card, i) => ({ path: `home.treatments.cards.${i}.photo`, label: `Behandeling: ${card.name.replace(/­/g, '')}`, ratio: '4 / 5', page: 'home' })),
    ...home.gallery.photos.map((photo, i) => ({ path: `home.gallery.photos.${i}`, label: `Fotogalerij ${i + 1}: ${photo.caption}`, ratio: '4 / 5', page: 'home' }))
  ];
}
function imageInfo(path) {
  const value = get(state.draft, path);
  if (typeof value === 'string') { // treatment card: photo + focus next to it
    return { src: value, focus: get(state.draft, `${parentPath(path)}.focus`), alt: null, caption: null };
  }
  return { src: value.src, focus: value.focus, alt: 'alt' in value ? value.alt : null, caption: 'caption' in value ? value.caption : null };
}
function setImage(path, { src, focus, alt, caption }) {
  const value = get(state.draft, path);
  if (typeof value === 'string') {
    set(state.draft, path, src);
    set(state.draft, `${parentPath(path)}.focus`, focus);
    return;
  }
  value.src = src;
  value.focus = focus;
  if (alt !== null && 'alt' in value) value.alt = alt;
  if (caption !== null && 'caption' in value) value.caption = caption;
}
const focusPoint = focus => FOCUS[focus] || (String(focus || '').match(/^(\d{1,3})% (\d{1,3})%$/) || []).slice(1).map(Number).filter(n => n <= 100);

function viewPhotos(main) {
  const slots = photoSlots();
  const card = slot => {
    const info = imageInfo(slot.path);
    return `<article class="photo-card"><div class="thumb"><img src="${esc(previewSrc(info.src, true))}" alt="${esc(info.alt || slot.label)}" loading="lazy"></div>
      <div class="meta"><h2>${esc(slot.label)}</h2><button type="button" class="btn btn-soft" data-photo="${slot.path}">${icon('photo')}Foto vervangen</button></div></article>`;
  };
  main.innerHTML = `
    <div class="view-head"><div><h1>Foto's</h1><p>Kies een foto en klik op <strong>Foto vervangen</strong>. Uw nieuwe foto komt op precies dezelfde plek.</p></div></div>
    <h2 class="section-title">Grote foto en profielfoto</h2><div class="photos">${slots.slice(0, 2).map(card).join('')}</div>
    <h2 class="section-title">Behandelingen</h2><div class="photos">${slots.filter(s => s.path.includes('treatments')).map(card).join('')}</div>
    <h2 class="section-title">Fotogalerij</h2><div class="photos">${slots.filter(s => s.path.includes('gallery')).map(card).join('')}</div>`;
  $$('.thumb img', main).forEach((img, i) => {
    const [x, y] = focusPoint(imageInfo(slots[i].path).focus).length ? focusPoint(imageInfo(slots[i].path).focus) : [50, 50];
    img.style.objectPosition = `${x}% ${y}%`;
  });
}

/* ---------- Prijslijst ---------- */
const today = () => amsterdamToday();
function viewPrices(main) {
  const prijzen = state.draft.prijzen;
  const pending = changePending(prijzen, today());
  const change = prijzen.change;
  const label = pending ? dutchDate(change.date) : '';
  const badge = info => info.mode === 'auto' ? `<span class="badge auto">Automatisch +${esc(euro(change.increase))}</span>`
    : info.mode === 'custom' ? '<span class="badge custom">Zelf ingepland</span>' : '<span class="badge">Geen verhoging</span>';
  const rows = prijzen.groups.map((group, g) => `
    <section class="price-group"><h2>${esc(group.title)}</h2>
      ${group.rows.map((row, r) => ['price', 'medium'].filter(key => key === 'price' || row.medium !== null).map(key => {
        const at = `prijzen.groups.${g}.rows.${r}.${key}`;
        const info = describe(row, key, pending ? change : null);
        const size = row.medium !== null ? (key === 'price' ? 'Kort' : 'Medium') : '';
        return `<div class="price-row${pending ? '' : ' no-schedule'}">
          <div class="price-name"><strong>${esc(row.name)}${size ? ` — ${size}` : ''}</strong>${row.desc ? `<span>${esc(row.desc)}</span>` : ''}</div>
          <div class="price-cell"><span class="when">${pending ? 'Nu' : 'Prijs'}</span><span class="amount">${esc(euro(info.current))}</span>
            <button type="button" class="btn btn-soft" data-price="${at}">Prijs aanpassen</button></div>
          ${pending ? `<div class="price-cell"><span class="when">Vanaf ${esc(label)}</span><span class="amount">${esc(euro(info.future))}</span>${badge(info)}
            <button type="button" class="btn btn-soft" data-schedule="${at}">Aanpassen</button></div>` : ''}
        </div>`;
      }).join('')).join('')}
    </section>`).join('');
  const products = state.draft.producten.categories.map((cat, c) => `
    <section class="price-group"><h2>${esc(cat.title.replace(/\*/g, ''))}</h2>
      ${cat.items.map((item, i) => `<div class="price-row no-schedule">
        <div class="price-name"><strong>${esc(item.name)}</strong><span>${esc(item.size)}</span></div>
        <div class="price-cell"><span class="when">Prijs</span><span class="amount">${esc(euro(item.price))}</span>
          <button type="button" class="btn btn-soft" data-price="producten.categories.${c}.items.${i}.price">Prijs aanpassen</button></div>
      </div>`).join('')}
    </section>`).join('');
  main.innerHTML = `
    <div class="view-head"><div><h1>Prijslijst</h1><p>Klik op <strong>Prijs aanpassen</strong> bij de prijs die u wilt veranderen.</p></div></div>
    ${pending ? `<div class="schedule-note">${icon('calendar')}<div><strong>Prijswijziging op ${esc(label)}</strong><br>
      Tot en met ${esc(dutchDate(new Date(Date.parse(`${change.date}T00:00:00Z`) - 864e5).toISOString().slice(0, 10)))} staan de huidige prijzen op uw website.
      Vanaf ${esc(label)} gelden automatisch de prijzen in de rechterkolom.</div></div>` : ''}
    <h2 class="section-title">Behandelingen</h2>${rows}
    <h2 class="section-title">Producten Seduction</h2>${products}`;
}

function viewSettings(main) {
  main.innerHTML = `
    <div class="view-head"><div><h1>Instellingen</h1></div></div>
    <div class="settings">
      <section class="card"><h2>Uw account</h2><dl><dt>Gebruikersnaam</dt><dd id="accountName"></dd><dt>Naam</dt><dd>Marjon van Rossum</dd></dl></section>
      <section class="card"><h2>Wachtwoord</h2>
        <p>Uw wachtwoord is veilig versleuteld opgeslagen. Om veiligheidsredenen stelt uw websitebouwer het in.</p>
        <p>Wilt u uw wachtwoord wijzigen, of bent u het vergeten? Neem dan contact op met uw websitebouwer. U krijgt dan een nieuw wachtwoord.</p></section>
      <section class="card"><h2>Veilig ingelogd</h2>
        <p>U blijft ingelogd op dit apparaat. Na 24 uur zonder gebruik wordt u automatisch uitgelogd, en altijd na 7 dagen.</p>
        <button type="button" class="btn btn-soft" id="logoutSettings">${icon('logout')}Uitloggen</button></section>
      <section class="card"><h2>Hulp</h2>
        <p>1. Klik op <strong>Website bewerken</strong> en kies een pagina.<br>2. Klik op de tekst, foto of prijs die u wilt aanpassen.<br>3. Pas het aan en klik op <strong>Opslaan</strong>. Klaar!</p>
        <p>Na ongeveer een minuut staat uw wijziging op de website.</p></section>
    </div>`;
  api('session').then(data => { const el = $('#accountName'); if (el) el.textContent = data.username; }).catch(() => {});
  $('#logoutSettings').addEventListener('click', () => $('#logout').click());
}

/* ---------- Bewerkvenster ---------- */
const panel = $('#panel');
let panelSave = null;
function openPanel({ kicker, title, body, actions }) {
  $('#panelKicker').textContent = kicker || '';
  $('#panelTitle').textContent = title;
  $('#panelBody').innerHTML = body;
  $('#panelError').hidden = true;
  $('#panelFoot').innerHTML = actions.map((action, i) =>
    `<button type="button" class="btn ${action.primary ? 'btn-primary' : 'btn-soft'}" data-action="${i}"${action.id ? ` id="${action.id}"` : ''}>${action.label}</button>`).join('');
  $$('#panelFoot [data-action]').forEach(button => button.addEventListener('click', () => actions[+button.dataset.action].run()));
  panelSave = actions.find(action => action.primary)?.run || null;
  panel.showModal();
  const first = $('#panelBody input:not([type=radio]):not([type=file]), #panelBody textarea, #panelBody .rich');
  (first || $('#panelClose')).focus();
}
function panelError(message) {
  const el = $('#panelError');
  el.textContent = message;
  el.hidden = !message;
}
$('#panelClose').addEventListener('click', () => panel.close());
$('#panelForm').addEventListener('submit', event => { event.preventDefault(); if (panelSave) panelSave(); });
const cancel = { label: 'Annuleren', run: () => panel.close() };

function openEditor(kind, path) {
  if (kind === 'image') return openImage(path);
  if (kind === 'price') return openPrice(path);
  return openText(path, kind === 'rich');
}

function richToHtml(text) {
  return esc(text).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
}
function richFromHtml(root) {
  let out = '';
  const walk = (node, accent) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) out += child.textContent.replace(/\*/g, '');
      else if (child.nodeName === 'BR') out += '\n';
      else if (child.nodeName === 'EM' || child.nodeName === 'I') {
        const inner = child.textContent.replace(/\*/g, '');
        out += accent || !inner.trim() ? inner : `*${inner}*`;
      } else {
        if (/^(DIV|P)$/.test(child.nodeName) && out && !out.endsWith('\n')) out += '\n';
        walk(child, accent);
      }
    }
  };
  walk(root, false);
  return out.replace(/ /g, ' ');
}

function openText(path, isRich) {
  const key = lastKey(path);
  const value = get(state.draft, path);
  if (typeof value !== 'string') return;
  const label = LABELS[path] || (path.includes('.points.') ? 'Punt in de opsomming' : KEY_LABELS[key] || 'Tekst');
  const max = SHORT.has(key) ? 200 : 2000;
  const long = !SHORT.has(key) || value.length > 90 || value.includes('\n');
  const body = isRich
    ? `<div class="label" id="richLabel">${esc(label)}</div>
       <div class="rich-tools"><button type="button" id="accent"><em>Aa</em> Roze accent</button></div>
       <div class="rich" id="field" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="richLabel">${richToHtml(value)}</div>
       <p class="hint">Selecteer woorden en klik op <strong>Roze accent</strong> om ze schuin en roze te maken. Met Enter begint u een nieuwe regel.</p>`
    : `<div class="field"><label for="field">${esc(label)}</label>
       ${long ? `<textarea id="field" maxlength="${max}">${esc(value)}</textarea>` : `<input id="field" maxlength="${max}" value="${esc(value)}">`}</div>`;
  openPanel({
    kicker: pageOfFile(fileOf(path)).title, title: 'Tekst aanpassen', body,
    actions: [cancel, { label: 'Opslaan', primary: true, run: () => {
      const field = $('#field');
      const next = (isRich ? richFromHtml(field) : field.value).replace(/[ \t]+\n/g, '\n').trim();
      if (!next && REQUIRED.has(key)) return panelError('Dit veld mag niet leeg zijn.');
      if (next.length > max) return panelError(`Deze tekst is te lang (maximaal ${max} tekens).`);
      set(state.draft, path, next.replace(/­/g, '') === value.replace(/­/g, '') ? value : next);
      panel.close();
      afterChange();
      saveNow();
    } }]
  });
  if (isRich) {
    const field = $('#field');
    // Keep the selected words selected while pressing the button.
    $('#accent').addEventListener('mousedown', event => event.preventDefault());
    $('#accent').addEventListener('click', () => {
      if (!field.contains(document.getSelection().anchorNode)) field.focus();
      document.execCommand('italic');
    });
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!document.execCommand('insertLineBreak')) document.execCommand('insertHTML', false, '<br>');
      }
    });
    field.addEventListener('paste', event => {
      event.preventDefault();
      document.execCommand('insertText', false, (event.clipboardData.getData('text/plain') || '').replace(/\*/g, ''));
    });
  }
}

function afterChange() {
  refreshStatus();
  reloadPreview();
  const view = location.hash.replace(/^#/, '').split('/')[0];
  if (view === 'prijslijst' || view === 'fotos') route();
}

/* Prijzen */
function parseMoney(text) {
  const clean = String(text).replace(/€|\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
  return round(Number(clean));
}
const moneyInput = (id, value, label) => `<div class="field"><label for="${id}">${label}</label>
  <div class="money"><span aria-hidden="true">€</span><input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(round(value).toFixed(2).replace('.', ','))}"></div></div>`;
function checkMoney(value) {
  if (Number.isNaN(value)) return 'Vul een geldig bedrag in, bijvoorbeeld 52,50.';
  if (value < 0 || value > 1000) return 'Vul een bedrag in tussen € 0 en € 1000.';
  return '';
}

function openPrice(path) {
  if (fileOf(path) === 'producten') {
    const item = get(state.draft, parentPath(path));
    return openPanel({
      kicker: 'Producten Seduction', title: `${item.name} (${item.size})`,
      body: `<div class="facts-list"><p><span>Nu op uw website</span><b>${esc(euro(item.price))}</b></p></div>${moneyInput('amount', item.price, 'Nieuwe prijs')}`,
      actions: [cancel, { label: 'Opslaan', primary: true, run: () => {
        const value = parseMoney($('#amount').value);
        const problem = checkMoney(value);
        if (problem) return panelError(problem);
        set(state.draft, path, value);
        panel.close();
        afterChange();
        saveNow();
      } }]
    });
  }
  const key = lastKey(path);
  const rowPath = parentPath(path);
  const row = get(state.draft, rowPath);
  const prijzen = state.draft.prijzen;
  const pending = changePending(prijzen, today());
  const change = pending ? prijzen.change : null;
  const info = describe(row, key, change);
  const size = row.medium !== null ? (key === 'price' ? ' — Kort' : ' — Medium') : '';
  const label = pending ? dutchDate(change.date) : '';
  const future = info.mode === 'auto' ? `${euro(info.future)} (automatisch +${euro(change.increase)})`
    : info.mode === 'custom' ? `${euro(info.future)} (zelf ingepland)` : `${euro(info.future)} (geen verhoging)`;
  openPanel({
    kicker: 'Prijs aanpassen', title: `${row.name}${size}`,
    body: `<div class="facts-list"><p><span>Nu op uw website</span><b>${esc(euro(info.current))}</b></p>
        ${pending ? `<p><span>Vanaf ${esc(label)}</span><b>${esc(future)}</b></p>` : ''}</div>
      ${moneyInput('amount', info.current, 'Nieuwe prijs')}
      ${pending ? `<fieldset class="field"><legend class="label">Wanneer gaat deze prijs in?</legend>
        <label class="choice"><input type="radio" name="when" value="now" checked><div><strong>Direct</strong><span id="nowNote">De prijs op uw website verandert meteen.</span></div></label>
        <label class="choice"><input type="radio" name="when" value="later"><div><strong>Vanaf ${esc(label)}</strong><span>Tot die datum blijft ${esc(euro(info.current))} op uw website staan.</span></div></label>
      </fieldset>` : ''}`,
    actions: [cancel, { label: 'Opslaan', primary: true, run: () => {
      const value = parseMoney($('#amount').value);
      const problem = checkMoney(value);
      if (problem) return panelError(problem);
      const choices = choicesOf(row, change);
      const later = pending && $('input[name=when]:checked').value === 'later';
      if (later) {
        choices[key].mode = value === choices[key].current ? 'none' : 'custom';
        choices[key].custom = value;
      } else {
        choices[key].current = value;
      }
      set(state.draft, rowPath, change ? encode(row, choices) : { ...row, [key]: value });
      panel.close();
      afterChange();
      saveNow();
    } }]
  });
  if (pending && info.mode === 'auto') {
    const note = () => {
      const value = parseMoney($('#amount').value);
      $('#nowNote').textContent = Number.isNaN(value) ? 'De prijs op uw website verandert meteen.'
        : `De prijs op uw website verandert meteen. Vanaf ${label} wordt dit automatisch ${euro(round(value + change.increase))}.`;
    };
    $('#amount').addEventListener('input', note);
    note();
  }
}

function openSchedule(path) {
  const key = lastKey(path);
  const rowPath = parentPath(path);
  const row = get(state.draft, rowPath);
  const change = state.draft.prijzen.change;
  if (!changePending(state.draft.prijzen, today())) return openPrice(path);
  const info = describe(row, key, change);
  const label = dutchDate(change.date);
  const size = row.medium !== null ? (key === 'price' ? ' — Kort' : ' — Medium') : '';
  const option = (value, title, text) => `<label class="choice"><input type="radio" name="mode" value="${value}"${info.mode === value ? ' checked' : ''}><div><strong>${title}</strong><span>${text}</span></div></label>`;
  openPanel({
    kicker: `Prijs vanaf ${label}`, title: `${row.name}${size}`,
    body: `<div class="facts-list"><p><span>Nu op uw website</span><b>${esc(euro(info.current))}</b></p></div>
      <fieldset class="field"><legend class="label">Welke prijs geldt vanaf ${esc(label)}?</legend>
        ${option('auto', `Automatisch verhogen met ${esc(euro(change.increase))}`, `Wordt ${esc(euro(round(info.current + change.increase)))}`)}
        ${option('none', 'Geen verhoging', `Blijft ${esc(euro(info.current))}`)}
        ${option('custom', 'Een andere prijs', 'Vul hieronder het bedrag in')}
      </fieldset>
      ${moneyInput('amount', info.future, 'Andere prijs')}`,
    actions: [cancel, { label: 'Opslaan', primary: true, run: () => {
      const mode = $('input[name=mode]:checked').value;
      const choices = choicesOf(row, change);
      choices[key].mode = mode;
      if (mode === 'custom') {
        const value = parseMoney($('#amount').value);
        const problem = checkMoney(value);
        if (problem) return panelError(problem);
        choices[key].custom = value;
        if (value === choices[key].current) choices[key].mode = 'none';
      }
      set(state.draft, rowPath, encode(row, choices));
      panel.close();
      afterChange();
      saveNow();
    } }]
  });
  const amount = $('#amount').closest('.field');
  const sync = () => { amount.hidden = $('input[name=mode]:checked').value !== 'custom'; };
  $$('input[name=mode]').forEach(input => input.addEventListener('change', sync));
  sync();
}

/* Foto vervangen */
async function preparePhoto(file) {
  const okType = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw new Error('Kies een foto in JPG-, PNG- of WebP-formaat.');
  if (file.size > 40 * 1024 * 1024) throw new Error('Deze foto is te groot (meer dan 40 MB). Kies een kleinere foto.');
  let bitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error('Deze foto kan niet worden geopend. Probeer een andere foto.'); }
  if (Math.min(bitmap.width, bitmap.height) < 400) throw new Error('Deze foto is te klein. Kies een foto van minimaal 400 pixels breed en hoog.');
  // Shrink in the browser first: faster uploads from a phone, and the location data is dropped.
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let blob;
  for (const quality of [0.9, 0.82, 0.74, 0.66]) {
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= 3_000_000) break;
  }
  if (!blob) throw new Error('Deze foto kan niet worden verwerkt. Probeer een andere foto.');
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Deze foto kan niet worden gelezen.'));
    reader.readAsDataURL(blob);
  });
  return { base64, local: URL.createObjectURL(blob) };
}

function openImage(path) {
  const slot = photoSlots().find(s => s.path === path) || { label: 'Foto', ratio: '4 / 5', page: pageOfFile(fileOf(path)).id };
  const info = imageInfo(path);
  let src = info.src;
  let [x, y] = focusPoint(info.focus).length === 2 ? focusPoint(info.focus) : [50, 50];
  let busy = false;
  const inEditor = Boolean($('#preview'));
  openPanel({
    kicker: slot.label, title: 'Foto vervangen',
    body: `
      <div class="drop" id="drop">${icon('upload')}<p>Sleep een nieuwe foto hierheen, of</p>
        <button type="button" class="btn btn-soft" id="chooseFile">Bestand kiezen</button>
        <input type="file" id="file" accept="image/jpeg,image/png,image/webp" hidden>
        <p class="hint">JPG, PNG of WebP. Grote foto's worden automatisch verkleind.</p></div>
      <div id="progressBox" hidden><p class="progress-label" id="progressLabel"></p><div class="progress"><span id="progressBar"></span></div></div>
      <div class="label">Voorbeeld</div>
      <p class="crop-hint">Zo ziet de foto eruit op uw website. Tik of klik op het belangrijkste deel van de foto om de uitsnede aan te passen.</p>
      <div class="crop" id="crop"><img id="cropImg" alt=""><span class="dot" id="dot"></span></div>
      ${info.alt !== null ? `<div class="field"><label for="alt">Wat staat er op de foto?</label><input id="alt" maxlength="200" value="${esc(info.alt)}"><p class="hint">Een korte beschrijving voor slechtziende bezoekers en Google.</p></div>` : ''}
      ${info.caption !== null ? `<div class="field"><label for="caption">Bijschrift</label><input id="caption" maxlength="200" value="${esc(info.caption)}"></div>` : ''}`,
    actions: [
      cancel,
      { label: 'Voorbeeld bekijken', id: 'previewPhoto', run: () => apply(false) },
      { label: 'Opslaan', primary: true, id: 'savePhoto', run: () => apply(true) }
    ]
  });
  const crop = $('#crop');
  const img = $('#cropImg');
  crop.style.aspectRatio = slot.ratio;
  const draw = () => {
    img.style.objectPosition = `${x}% ${y}%`;
    $('#dot').style.left = `${x}%`;
    $('#dot').style.top = `${y}%`;
  };
  img.src = previewSrc(src);
  draw();
  const pickFocus = event => {
    const box = crop.getBoundingClientRect();
    x = Math.round(Math.min(100, Math.max(0, (event.clientX - box.left) / box.width * 100)));
    y = Math.round(Math.min(100, Math.max(0, (event.clientY - box.top) / box.height * 100)));
    draw();
  };
  crop.addEventListener('pointerdown', event => { crop.setPointerCapture(event.pointerId); pickFocus(event); });
  crop.addEventListener('pointermove', event => { if (crop.hasPointerCapture(event.pointerId)) pickFocus(event); });

  const setBusy = value => {
    busy = value;
    $('#savePhoto').disabled = value;
    $('#previewPhoto').disabled = value;
    $('#chooseFile').disabled = value;
  };
  const progress = (fraction, text) => {
    $('#progressBox').hidden = fraction === null;
    if (fraction === null) return;
    $('#progressBar').style.width = `${Math.round(fraction * 100)}%`;
    $('#progressLabel').textContent = text;
  };
  async function handle(file) {
    if (!file || busy) return;
    panelError('');
    setBusy(true);
    progress(0.02, 'Foto wordt voorbereid...');
    try {
      const prepared = await preparePhoto(file);
      img.src = prepared.local;
      x = 50; y = 50; draw();
      const result = await uploadPhoto(prepared.base64, fraction => progress(Math.min(0.9, fraction * 0.9), `Foto wordt geüpload... ${Math.round(fraction * 100)}%`));
      progress(1, 'Foto is klaar. Klik op Opslaan om hem op uw website te zetten.');
      state.uploads.set(result.src, result.upload);
      state.previews.set(result.src, result.preview);
      src = result.src;
      img.src = result.preview;
      URL.revokeObjectURL(prepared.local);
    } catch (error) {
      progress(null);
      img.src = previewSrc(src);
      panelError(error.message);
    } finally {
      setBusy(false);
    }
  }
  $('#chooseFile').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', event => handle(event.target.files[0]));
  const drop = $('#drop');
  drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('is-over'); handle(event.dataTransfer.files[0]); });

  function apply(save) {
    if (busy) return;
    const alt = $('#alt') ? $('#alt').value.trim() : null;
    const caption = $('#caption') ? $('#caption').value.trim() : null;
    if (alt !== null && !alt) return panelError('Beschrijf kort wat er op de foto staat.');
    setImage(path, { src, focus: `${x}% ${y}%`, alt, caption });
    panel.close();
    if (!save) {
      state.flash = path;
      if (inEditor) { afterChange(); return; }
      location.hash = `#bewerken/${slot.page}`;
      refreshStatus();
      toast('Bekijk de foto op de pagina. Tevreden? Klik dan op Wijzigingen opslaan.');
      return;
    }
    afterChange();
    saveNow();
  }
}

/* ---------- Start ---------- */
(async () => {
  try {
    const session = await api('session');
    if (!session.authenticated) { showLogin(); return; }
    state.csrf = session.csrf;
    await loadContent();
    if (!location.hash) location.hash = '#overzicht';
    showApp();
  } catch (error) {
    showLogin(error.status === 401 ? '' : error.message);
  }
})();
