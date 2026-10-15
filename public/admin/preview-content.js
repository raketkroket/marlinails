// Editor preview: use the editor's current (possibly unsaved) content instead of /content.js.
(() => {
  try {
    const admin = window.parent !== window && window.parent.MarliAdmin;
    window.MARLI_CONTENT = admin ? admin.previewContent() : null;
  } catch {
    window.MARLI_CONTENT = null;
  }
})();
