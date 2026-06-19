# Taka Compass

A personal financial planner tuned to **Bangladesh**. Track income, expenses,
assets and loans, then get a transparent read on cash flow, net worth,
inflation-adjusted growth, income tax (FY2026-27), and big-purchase plans
(car / flat) with proper EMI and affordability math.

Defaults use mid-2026 BD reference rates — inflation ~9.4%, Sanchayapatra
~11.83%, home loan ~13%, policy rate 10% — all editable in the top context bar.

Built with Vite + React. Fully client-side, no backend, no env vars.

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
