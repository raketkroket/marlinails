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
- `public/admin/`: Decap CMS admin; `api/`: its GitHub login (Vercel functions).
- `scripts/content.mjs`: bundles the content JSON into `/content.js`.
- `public/assets/`: original salon images/logo and locally hosted Google Fonts.
- `server.mjs`: dependency-free, read-only public-file server with security headers.
- `dist/`: static deployment output produced by `npm run build`.

### Vercel

Import `raketkroket/marlinails`, use the repository root, and set the production
branch to `main`. The checked-in `vercel.json` selects the Other framework preset,
runs `npm ci` and `npm run build`, and publishes only `dist`. Use Node.js 24.x.
Pushing to `main` triggers a production deployment when the Vercel Git integration
is enabled. The public site needs no environment variables; the admin login
needs two (see "Content editing (admin)").

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
- After the change has passed, the base prices can be updated and
  `priceChange` moved to the next change (or the announcement removed).

Browser tests fix the clock to verify both sides of the switch.

## Replacing photos

Via `/admin`: choose a new photo in the field, adjust the description and
caption, and publish. Uploads go to `public/assets/uploads/`; the build deploys
only resized 640/1440 px WebP copies (orientation fixed, metadata such as GPS
removed). The original upload does stay in the (public) GitHub repository.

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

## Content editing (admin)

`/admin/` runs [Decap CMS](https://decapcms.org/) 3.16.3 (pinned, with
subresource integrity). Marjon can edit existing texts, photos, captions and
prices on all five pages; she cannot add or remove pages, sections or list items.
Phone, email, address and opening hours stay fixed in `public/app.js` because
they also appear in the structured data. Every save is a commit on `main`, so
Vercel redeploys within about a minute and any change can be reverted in Git.
Dutch guide for Marjon: `docs/BEHEER-HANDLEIDING.md`. Options considered:
`docs/ADMIN-CMS-OPTIONS.md`.

One-time setup (until this is done, `/admin/` shows the login but it fails safely):

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   Homepage `https://marlinails.vercel.app`, callback
   `https://marlinails.vercel.app/api/callback`. Generate a client secret.
2. Vercel → Project → Settings → Environment Variables (Production):
   `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`. Redeploy.
3. Marjon creates a GitHub account; invite it under the repository's
   Settings → Collaborators with write access. Only accounts with write access
   can save.
4. After the domain move, change the OAuth app URLs and `site_url`/`display_url`
   in `public/admin/config.yml` to `https://www.marlinails.nl`.

Security: the secret exists only in Vercel; `api/auth.js` and `api/callback.js`
use a one-time state cookie, never store tokens, and hand the token only to the
same-origin admin window. `/admin/` has its own CSP (CMS bundle from unpkg,
GitHub API, and `'unsafe-eval'`, which Decap's config validator needs); the
public site keeps its strict CSP and loads content from the same-origin
`/content.js`. `tests/admin.test.mjs` checks that every content field is
editable (so saves never drop data), that lists cannot grow or shrink, the
OAuth flow, and upload optimization.

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
