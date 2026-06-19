# Taka Compass

A personal financial planner tuned to **Bangladesh**. Track income, expenses,
assets and loans, then get a transparent read on cash flow, net worth,
inflation-adjusted growth, income tax (FY2026-27), and big-purchase plans
(car / flat) with proper EMI and affordability math.

Defaults use mid-2026 BD reference rates — inflation ~9.4%, Sanchayapatra
~11.83%, home loan ~13%, policy rate 10% — all editable in the top context bar.

Built with Vite + React. Fully client-side, no backend, no env vars.

## Features

- **Cash flow / Net worth / Goals / Insights / Projection** tabs.
- **Projection** plots your net worth 5–10 years out at your current surplus and
  blended return, with an inflation-adjusted ("today's taka") line overlaid.
- **Auto-sync** pulls the BD reference rates from `public/rates.json` on load and
  shows the last-synced date. A daily GitHub Action keeps that file fresh (see
  below). Toggle it off to drive the rates manually.

## Daily rate auto-sync — how it works

```
.github/workflows/sync-rates.yml   (cron: 08:00 Bangladesh, daily)
        └─ runs scripts/sync-rates.mjs
                 └─ updates public/rates.json + commits
                          └─ push triggers a Vercel redeploy
                                   └─ app fetches the fresh rates.json on load
```

Honest note on data sources: most BD savings/policy rates have **no official
public API** and change via periodic circulars. The script ships with curated
mid-2026 baselines and only overwrites a field when its fetcher returns a value,
so the file never degrades. The World Bank lending rate is wired live as a
working example; the inflation / Sanchayapatra / policy fetchers are stubs in
`scripts/sync-rates.mjs` for you to point at a source you trust. When a new
circular lands you can also just edit `public/rates.json` and redeploy.

The action needs no secrets — it commits with the built-in `GITHUB_TOKEN`. Make
sure Settings → Actions → "Workflow permissions" is set to **Read and write**.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Push to GitHub

This folder is already a git repo with an initial commit on `main`.
Create an empty repo on GitHub (no README/license), then:

```bash
git remote add origin https://github.com/<your-username>/taka-compass.git
git push -u origin main
```

Using SSH instead:

```bash
git remote add origin git@github.com:<your-username>/taka-compass.git
git push -u origin main
```

If you'd rather start the history fresh:

```bash
rm -rf .git
git init
git add .
git commit -m "Initial commit: Taka Compass"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Accounts & sign-in

The app opens on a login screen with **Continue with Google**, **Continue with
Apple**, and **Skip — guest mode**. After sign-in, a short step-by-step setup
collects your numbers (income → expenses → savings → loans → goals) instead of a
dense form, then drops you into the dashboard. Your data is saved in the browser,
keyed to your account, so it's there next time. Guest mode loads demo data.

Setup needed for real OAuth (copy `.env.example` → `.env`, fill in, redeploy):

- **Google** works fully client-side. Create an OAuth client ID at
  console.cloud.google.com → Credentials → OAuth client ID → Web application,
  add your deployed URL to *Authorized JavaScript origins*, and set
  `VITE_GOOGLE_CLIENT_ID`. On Vercel, add it under Project → Settings →
  Environment Variables and redeploy. Until it's set, the Google button gently
  points you to guest mode.
- **Apple** can't be done from a static frontend — it needs an Apple Developer
  account ($99/yr) and the server-side verifier in `api/apple-auth.js`. The
  button and serverless scaffold are in place but inert until you configure it.

### Going further (optional)

Browser-stored data doesn't sync across devices, and Apple's server bits are
fiddly. If you want real accounts with both providers and cross-device data, a
managed auth + DB provider (Supabase, Firebase, Clerk, Auth0) handles all of it
with a static frontend — that's the clean upgrade path when you're ready.



## Rate marketplace (and the monetization model)

The **Marketplace** tab compares loan and deposit products across banks & NBFIs.
It pre-fills from the user's own situation — your biggest goal's loan amount in
*Borrow* mode, your idle cash in *Save* mode — computes the EMI / maturity for
each option, and ranks them best-deal-first with a one-click *Visit →* to the
institution's site.

The catalog lives in `src/data/products.js`. Each product supports
`sponsored: true` + a `priority`, which pins it to the top of its category with a
visible **Sponsored** badge — the paid-placement mechanism. Everything below a
sponsored row is ranked purely by best cost/return, and the best non-sponsored
option is badged **Best rate**, so the listing stays trustworthy.

Before commercializing:

- **Rates are indicative samples, not a live feed.** There's no single API for BD
  institution rates and they change constantly. Replace the catalog with confirmed
  data (partner-supplied or a maintained admin/DB) and keep the "verify" labeling.
  Wrong rates are both a trust and a liability risk.
- **Displaying institutions' rates and charging for placement** in Bangladesh
  likely engages Bangladesh Bank rules and you'd want agreements with the
  institutions before using their names commercially. Labeling sponsored listings
  (built in) is standard. Not legal advice — get proper counsel before launch.
- **Chicken-and-egg:** institutions pay once you have users; users come if the
  data is accurate and comprehensive. Early on, catalog accuracy *is* the product.

## Deploy to Vercel

Import the GitHub repo at vercel.com → Add New → Project. Vercel auto-detects
Vite (build `npm run build`, output `dist`). Or run `vercel --prod` from the
folder with the Vercel CLI.

## Not financial advice

Every figure is arithmetic on your inputs and standard planning heuristics, using
editable BD reference rates. The tax estimate reflects the proposed FY2026-27
structure — verify slabs and the rebate cap with the NBR. Rates change; re-check
before acting.
