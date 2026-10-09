# Marli Nails

The current design uses warm beige, muted rose and brown, with an immersive
photographic hero. Dutch content, the five existing hash-routed pages, salon
photography and appointment-by-phone/email flow are preserved.

Mobile and tablet layouts below 860px use readable 16-17px interface/body text,
single-column story, treatment and booking sections, and a wrapping price index.
Below 480px, pricing tables retain their headers and associations but visually
stack treatments with explicit Kort/Medium/Prijs labels. The mobile photo dialog,
contact form and footer fit small screens without hiding horizontal overflow.

## Local development

Use Node.js 24 or newer (Node 24 LTS recommended).

```sh
npm ci
npm start
```

Open `http://127.0.0.1:3000`. `npm run dev` restarts the server when files change.
The server binds only to localhost by default. `PORT` and `HOST` may be explicitly
configured for your hosting environment.

## Checks

```sh
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Browser checks cover the five pages, accessibility rules, keyboard menu behavior,
pricing, form validation, local assets, reduced motion and responsive reflow.
Automated checks do not establish full WCAG 2.2 AA compliance: manual screen-reader,
keyboard, real-device and 200% browser zoom testing remains important.

## Structure and deployment

- `public/index.html`: existing page layout and business metadata.
- `public/styles.css`: white/pink design, DM Sans and DM Serif Display, responsive styles.
- `public/editorial.css`: the current warm editorial theme.
- `public/app.js`: business content, published prices, navigation and email-draft form.
- `public/assets/`: original salon images/logo and locally hosted Google Fonts.
- `server.mjs`: dependency-free, read-only public-file server with security headers.
- `dist/`: static deployment output produced by `npm run build`.

### Vercel

Import `raketkroket/marlinails`, use the repository root, and set the production
branch to `main`. The checked-in `vercel.json` selects the Other framework preset,
runs `npm ci` and `npm run build`, and publishes only `dist`. Use Node.js 24.x.
Pushing to `main` triggers a production deployment when the Vercel Git integration
is enabled. No environment variables or backend are needed.

Vercel does not use the generated `_headers` file. `vercel.json` explicitly applies
the production security headers instead; the build fails if they differ from the
Node server's headers, including the structured-data CSP hash. After editing
metadata, update that hash in `vercel.json`. Hashing normalizes HTML line endings
to LF, matching browser parsing and Linux/Windows checkouts. HTML is checked in
with LF line endings, and tests build both checkout formats.
The stylesheet/script URLs carry a
release version, and response caching requires revalidation to avoid mixed old
and new assets. Update the release version when changing these assets.

After deployment, check the production URL, all five hash routes, asset loading
and live security headers. A successful local build or Git push alone is not
confirmation of a live deployment.

Deploy `dist` on maintained static hosting with enforced HTTPS. `_headers` is
understood by compatible hosts such as Netlify and Cloudflare Pages; on other
hosts configure those headers explicitly. Do not assume they are applied:
check the live response headers after deployment. No production application
dependencies, database, analytics, cookies or booking backend are required.
The Node server is an HTTP preview server; use a managed HTTPS host/reverse proxy
for a public deployment. Never expose the repository directory as a web root.

The Content Security Policy allows only local scripts, styles, images and fonts,
and one hash-authorized structured-data block. Rebuild after changing metadata.
Forms cannot POST: the contact form only opens an encoded `mailto:` draft.
It does not send, save or confirm an appointment; customers must send the email
themselves, or call. No new booking system has been invented.

## Content and assets

Prices and Seduction product details were checked against
[the published price list](https://www.marlinails.nl/prijslijst/) and
[Seduction products](https://www.marlinails.nl/producten-seduction/) on 9 October 2026.
The published treatment prices are effective from 1 September 2025.
“Pedicure” is explicitly described as cosmetic teennail care, not medical foot care.
Original salon images come from the business website and the eight supplied 2026 photos.
The supplied glossy pink logo replaces the text branding in the header and footer.
`npm run images` also generates its transparent 480px PNG web copy at
`public/assets/marli-logo-glossy.png`, preserving the full-sized original.
The hero and gallery use separate photos, with no repeated homepage photographs.
Keep permission for their use.
No unrelated stock photography is used.
The supplied originals are untouched. `npm run images` generates 640px/1440px
responsive WebP copies, strips image metadata and enforces a 400 KB per-file budget.
Run it again after adding a photo; assign it to the appropriate content entry.
The build excludes the full-sized supplied JPEG originals from deployment.

DM Sans and DM Serif Display are locally hosted; their SIL Open Font License
notices are included alongside the font files. Local hosting avoids sending
visitors' IP addresses to font or image CDNs. Google Maps is an outbound directions
link, not an embedded tracking map.
