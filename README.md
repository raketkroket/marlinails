# Marli Nails

The current design keeps its warm editorial canvas and photographic hero, with
cream, beige and soft brown surfaces, restrained pink appointment accents,
rounded controls and frosted navigation surfaces.
Glass effects use opaque fallbacks and respect reduced-transparency preferences;
existing motion respects reduced-motion preferences.
On mobile, the header and booking dock float within safe-area-aware margins.
The transparent header shell uses backed controls to keep navigation readable
over photography; the dock hides while the keyboard-accessible menu is open.
It also hides while a contact field is focused, leaving space for the mobile
keyboard. Desktop controls and body copy retain readable 15-17px sizing.
Dutch content, the five existing hash-routed pages, salon
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
- `public/content/*.json`: editable texts, photos and prices (edited via `/admin`).
- `public/app.js`: fixed business details (phone, address, hours), rendering,
  navigation, dated prices and the email-draft form.
- `public/admin/`: "Mijn website", Marjon's visual editor (login, dashboard,
  click-to-edit preview, photos, price list). `public/admin/prices.js` holds the
  price rules shared with the server.
- `api/admin.js` + `api/_lib/`: the editor's API (one Vercel function): login,
  sessions, rate limiting, validation, photo processing and storage.
- `scripts/content.mjs`: bundles the content JSON into `/content.js`;
  `scripts/preview.mjs` builds `/admin/preview.html` from `index.html`.
- `public/assets/`: original salon images/logo and locally hosted Google Fonts.
- `server.mjs`: dependency-free, read-only public-file server with security headers.
- `dist/`: static deployment output produced by `npm run build`.

### Vercel

Import `raketkroket/marlinails`, use the repository root, and set the production
branch to `main`. The checked-in `vercel.json` selects the Other framework preset,
runs `npm ci` and `npm run build`, and publishes only `dist`. Use Node.js 24.x.
Pushing to `main` triggers a production deployment when the Vercel Git integration
is enabled. The public site needs no environment variables; the editor needs
the secrets listed under "Website editor (admin)".

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

## Prices and the 1 January 2027 increase

Treatment prices live in `public/content/prijzen.json` (editable via `/admin`):
`price` (kort, or the only price) and optional `medium`. Rows with `hand: true`
("Handbehandeling" in the admin) are hand treatments; Marjon asked for these to
rise by €2.50 per 1 January 2027. `change` holds the date and amount; the Dutch
date labels are derived from it.

- Until 31 December 2026 (Dutch time, `Europe/Amsterdam`) the current prices
  are shown. The price list announces the change and lets visitors switch to
  view the new prices; the homepage notes the date.
- From 1 January 2027 the new prices apply automatically on the price list
  and the homepage "Vanaf" amounts, and the announcement disappears.
- Raised: natural nail treatments, sets met verlenging, Seal & Protect,
  manicure Brons/Zilver/Goud and E-manicure voor heren.
- Not raised: teennagels, Seduction products, the free repair.
- **Awaiting Marjon's confirmation, currently not raised:** nail art
  (€3,00 per nagel), breuk per nagel (€10,00/€12,50) and verwijderen gelpolish
  (€17,50). Marjon can tick "Handbehandeling" for these in the admin.
- Rows may also carry a scheduled price (`next` / `nextMedium`) set in the
  editor with "Vanaf 1 januari 2027"; it overrides the automatic increase.
- The first save in the editor on or after the date makes the new prices the
  normal prices and removes the schedule (`change` becomes `null`).

Browser tests fix the clock to verify both sides of the switch.

## Replacing photos

Via the editor: click the photo (or use Foto's), choose a file, adjust the crop,
and save. The browser shrinks the photo first; the server checks that it really
is a JPG/PNG/WebP, then stores only 640 px and 1440 px WebP copies (orientation
fixed, all metadata such as GPS removed) in `public/assets/uploads/`. The
original photo is never stored or committed.

By hand: put the original in `public/`, add it to `scripts/optimize-images.mjs`
if needed, run `npm run images`, and point the JSON at its `-1440.webp` copy.
The profile photo is `over.json` → `portrait` (also used on the homepage).

## Domain: marlinails.vercel.app → www.marlinails.nl

Canonical URL, Open Graph URL/image and structured data already point at the
intended final domain `https://www.marlinails.nl/`; the custom domain is **not**
connected yet and the current WordPress site there has not been touched.
`vercel.json` redirects the old WordPress paths (`/prijslijst/`,
`/producten-seduction/`, `/over-marli-nails/`, `/contact/`) to the new pages,
so links keep working after the move. The Open Graph image only resolves once
the domain points here. To migrate (with Marjon's approval):

1. Find out who manages the marlinails.nl DNS and the current WordPress hosting.
2. **Keep the existing MX/email records** so info@marlinails.nl keeps working.
3. In Vercel → Project → Domains add `www.marlinails.nl` and `marlinails.nl`
   (redirect apex to www) and set the DNS records Vercel shows.
4. Check the live site, HTTPS, redirects and headers, then submit
   `https://www.marlinails.nl/` in Google Search Console.
5. Cancel the old WordPress hosting only after everything is verified.

## Website editor (admin)

`/admin/` is "Mijn website": a Dutch editor where Marjon logs in with a username
and password, clicks a text, photo or price on a live preview of her own website,
changes it and presses **Opslaan**. She can only change existing content: no new
pages, sections or list items, and no code. Phone, email, address and opening
hours stay fixed in `public/app.js` (they are also in the structured data).
Dutch guide: `docs/BEHEER-HANDLEIDING.md`.

### How saving works

The API (`api/admin.js`) validates every save against the stored content (same
structure, safe text without HTML, prices 0–1000 with two decimals, known photo
paths) and writes it to the GitHub repository with a server-side token: one
commit per save, containing only `public/content/*.json` and processed WebP
photos in `public/assets/uploads/`. Vercel then redeploys the site (about a
minute); the editor shows when the change is live. Because content lives in the
repository, saves survive refreshes, logouts, redeploys and restarts, every
change is versioned, and the public site stays static with its strict CSP.
A stale editor window cannot overwrite newer content (conflict check).

### Security

- Password: only a scrypt hash is stored, as a Vercel secret. Sessions are
  HMAC-signed, HTTP-only, `SameSite=Strict`, `Secure` cookies (`__Host-` prefix),
  logged out after 24 h without activity and always after 7 days. Changing the
  password ends all sessions.
- Every action needs a session; every write also needs the session's CSRF token
  and a same-origin request. Uploads are only possible when logged in.
- Login limits: 5 failed attempts per IP per 15 minutes and 20 per hour for the
  account, shared across serverless instances via Upstash Redis. On Vercel the
  editor refuses to run without Redis, the password hash or the session secret.
- `/admin/` has its own CSP (same-origin scripts/API only, may frame its own
  preview); the public site's CSP and `frame-ancestors 'none'` are unchanged.
- No registration, no tokens or keys in the browser.

### One-time setup (required before the editor works in production)

1. **Password**: run `npm run admin:wachtwoord` locally and enter Marjon's
   password (min. 12 characters, typed hidden). It prints `ADMIN_PASSWORD_HASH`
   and a random `ADMIN_SESSION_SECRET`.
2. **GitHub token**: GitHub → Settings → Developer settings → Fine-grained
   personal access tokens → Generate. Repository access: only
   `raketkroket/marlinails`; permissions: **Contents: Read and write**. Copy it as
   `GITHUB_CONTENT_TOKEN`. (Expiry: pick the longest your account allows and set
   a reminder; when it expires, saving shows an error until it is replaced.)
3. **Redis (free)**: Vercel → Project → Storage / Marketplace → Upstash for
   Redis (free plan) → connect to this project. This adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`/`_TOKEN`).
4. Vercel → Project → Settings → Environment Variables (Production): add
   `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `GITHUB_CONTENT_TOKEN`.
   Optional: `ADMIN_USERNAME` (default `marjon123`), `GITHUB_BRANCH` (default
   `main`). Then redeploy.
5. Test: open `/admin/`, log in, change a word, refresh, and check the live site
   a minute later. Change it back the same way.

**Password reset**: run `npm run admin:wachtwoord` again, replace
`ADMIN_PASSWORD_HASH` in Vercel and redeploy. All sessions end automatically.
Give Marjon the new password in person or by phone.

### Local development

Without `GITHUB_CONTENT_TOKEN` (and not on Vercel) the editor saves straight into
this checkout (`public/content`, `public/assets/uploads`), or into
`ADMIN_LOCAL_ROOT` when set. Start it with the two `ADMIN_*` secrets set:
`ADMIN_PASSWORD_HASH=... ADMIN_SESSION_SECRET=... npm start`, then open
`http://127.0.0.1:3000/admin/`. Tests use a throwaway copy plus local stand-ins
for the GitHub and Upstash REST APIs (`tests/helpers/mocks.mjs`).

## Content and assets

Prices and Seduction product details were checked against
[the published price list](https://www.marlinails.nl/prijslijst/) and
[Seduction products](https://www.marlinails.nl/producten-seduction/) on 9 October 2026
(prices rechecked on 15 October 2026).
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
