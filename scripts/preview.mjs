// Builds /admin/preview.html from the real public/index.html: the exact website, but
// fed with the editor's draft content and with the click-to-edit bridge added.
// Served with the admin headers (may be framed by /admin/ only, never indexed).
export function previewHtml(indexHtml) {
  const swaps = [
    ['<script src="/content.js" defer></script>', '<script src="/admin/preview-content.js" defer></script>'],
    ['</head>', '<meta name="robots" content="noindex, nofollow">\n<link rel="stylesheet" href="/admin/preview.css">\n</head>'],
    ['</body>', '<script src="/admin/preview-bridge.js" defer></script>\n</body>']
  ];
  let html = indexHtml;
  for (const [from, to] of swaps) {
    if (!html.includes(from)) throw new Error(`preview: "${from}" not found in index.html`);
    html = html.replace(from, to);
  }
  return html;
}
