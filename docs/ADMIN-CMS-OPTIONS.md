# Content editing for Marjon: options (option A implemented)

Status: **option A was approved and implemented** (October 2026); see the README,
"Content editing (admin)", for setup. This document keeps the original comparison.

## Intended scope

Marjon edits **existing** content only:

- replace an existing photo (gallery, treatment card, profile photo);
- change an existing paragraph, caption or price;
- not: create pages, sections or layouts.

All of this content now lives in `public/content/*.json` (originally the
`CONTENT` object at the top of `public/app.js`); every option below edits that
data and nothing else.

## Options

| | A. Git-based CMS (Decap CMS) | B. Hosted headless CMS (Sanity, Storyblok…) | C. Custom admin on Vercel | D. No CMS (current) |
|---|---|---|---|---|
| How it works | `/admin` page edits `content.json` and uploads images as commits to GitHub; Vercel redeploys | Content stored at a third party, fetched at build time | Own login, serverless API and storage (Vercel Blob/KV) | Marjon sends changes; developer updates and deploys |
| Login / security | GitHub login via OAuth; only accounts with repo access can save | Vendor accounts and roles | We build and maintain auth, sessions, rate limiting, uploads | n/a |
| External credentials | GitHub OAuth app (client ID + secret, stored as **Vercel environment variables**, never in client JS); GitHub account for Marjon | Vendor account, API token, webhook | Password hashing, session secret, storage tokens | none |
| Hosting cost | €0 (GitHub free, Vercel Hobby) | Free tier, then paid per seat/usage | Possibly paid storage/KV; Vercel Hobby is for non-commercial use | €0 |
| Maintenance | Low: one config file, CMS loaded from a pinned version | Medium: vendor API/plan changes | High: security patches are ours | Developer time per change |
| Effort to build | ~1 day: move `CONTENT` to `public/content.json`, field config limited to existing fields, small OAuth function, CSP update (`connect-src 'self'`), tests | 1–2 days | Several days plus ongoing security work | 0 |
| Fits "edit existing only" | Yes: fields can be locked to text/image of existing entries, no add/delete | Partly: schema can restrict | Yes, but all custom | Yes |

## Recommendation

If Marjon wants to edit herself, **option A (Decap CMS with GitHub login)** is
the simplest secure choice: no database, no extra monthly cost, every change is
a reviewable Git commit that can be undone, and the public site stays static.

Before building it, please confirm:

1. Approval of the extra scope (outside the current paid project).
2. Marjon is willing to create a GitHub account (we give it write access to this repository only).
3. Permission to create a GitHub OAuth app for the site and store its secret in Vercel.
4. Whether the Vercel project should move from Hobby to Pro (Vercel's Hobby plan is meant for non-commercial use; check this regardless of the CMS).

Option A is now in place; until the OAuth app and environment variables are set up, changes go through the developer (option D).
