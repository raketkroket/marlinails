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

## Prices and the 1 January 2027 increase

Treatment prices live in `CONTENT.prices` in `public/app.js` as numbers
(`[kort, medium]` or a single amount). Rows marked `hand: true` are hand
treatments; Marjon asked for these to rise by €2.50 per 1 January 2027.
`CONTENT.priceChange` holds the date, label and amount.

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
  (€17,50). To include one, add `hand: true` to its row.
- After the change has passed, the base prices can be updated and
  `priceChange` moved to the next change (or the announcement removed).

Browser tests fix the clock to verify both sides of the switch.

## Replacing photos

1. Put the original in `public/` (or `public/assets/`).
2. Add its file name in `scripts/optimize-images.mjs` if it is not a
   `2026XXXX_XXXXXX.jpg` file, then run `npm run images`.
3. Change the name, `alt` text and caption in `CONTENT` (`images`, `services`
   or `gallery`). `focus` controls the crop (CSS `object-position`).

The profile photo is `CONTENT.images.about` (currently `20211113_122901`).

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

Not implemented. See `docs/ADMIN-CMS-OPTIONS.md` for options, costs and the
approvals needed.

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
