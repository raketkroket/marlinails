// Runs inside the editor preview (/admin/preview.html). Marks editable parts of the real
// website and tells the editor what was clicked. Nothing on the page itself can be changed
// here; all editing happens in the editor's panel.
(() => {
  if (window.parent === window) return;
  const send = message => window.parent.postMessage({ source: 'marli-preview', ...message }, window.location.origin);
  const kinds = [
    ['[data-edit-img]', 'image', 'editImg'],
    ['[data-edit-price]', 'price', 'editPrice'],
    ['[data-c-rich],[data-edit-rich]', 'rich', null],
    ['[data-c],[data-edit]', 'text', null]
  ];
  const pathOf = (el, key) => key ? el.dataset[key] : (el.dataset.cRich || el.dataset.editRich || el.dataset.c || el.dataset.edit);

  function mark() {
    for (const [selector, kind, key] of kinds) {
      document.querySelectorAll(selector).forEach(el => {
        if (el.dataset.mxKind) return;
        el.dataset.mxKind = kind;
        el.dataset.mxPath = pathOf(el, key);
        el.classList.add('mx-edit');
        if (kind === 'image') el.classList.add('mx-img');
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', kind === 'image' ? 'Foto vervangen' : kind === 'price' ? `Prijs aanpassen: ${el.textContent.trim()}` : `Tekst aanpassen: ${el.textContent.trim().slice(0, 60)}`);
      });
    }
  }

  function pick(el) {
    send({ type: 'edit', kind: el.dataset.mxKind, path: el.dataset.mxPath });
  }

  document.addEventListener('click', event => {
    const el = event.target.closest('.mx-edit');
    if (el) { event.preventDefault(); event.stopPropagation(); pick(el); return; }
    const link = event.target.closest('a[href]');
    // Page links inside the website keep working; anything that would leave the editor does not.
    if (link && !link.getAttribute('href').startsWith('#/')) { event.preventDefault(); event.stopPropagation(); }
    if (event.target.closest('form button[type="submit"]')) event.preventDefault();
  }, true);
  document.addEventListener('keydown', event => {
    const el = event.target.closest && event.target.closest('.mx-edit');
    if (el && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); pick(el); }
  }, true);
  document.addEventListener('submit', event => event.preventDefault(), true);

  const route = () => send({ type: 'route', page: (window.location.hash.split('/')[1] || 'home') });
  window.addEventListener('hashchange', () => { mark(); route(); });
  // The price list re-renders when switching between current and new prices.
  new MutationObserver(mark).observe(document.body, { childList: true, subtree: true });
  mark();
  route();
  send({ type: 'ready' });
})();
