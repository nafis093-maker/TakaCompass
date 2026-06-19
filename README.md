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

## Deploy to Vercel

Import the GitHub repo at vercel.com → Add New → Project. Vercel auto-detects
Vite (build `npm run build`, output `dist`). Or run `vercel --prod` from the
folder with the Vercel CLI.

## Not financial advice

Every figure is arithmetic on your inputs and standard planning heuristics, using
editable BD reference rates. The tax estimate reflects the proposed FY2026-27
structure — verify slabs and the rebate cap with the NBR. Rates change; re-check
before acting.
