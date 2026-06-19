// scripts/sync-rates.mjs
// Refreshes public/rates.json. Run daily by the GitHub Action, or manually:
//   node scripts/sync-rates.mjs
//
// Design: each field has a fetcher returning a number or null. On null (or any
// error) we KEEP the existing value — the file never degrades, it only improves
// as you wire real sources. Most BD savings/policy rates have no official JSON
// API (they move via circulars), so those ship as curated baselines and their
// fetchers are stubs for you to fill in. The World Bank lending rate is wired
// for real as a working example of a live source feeding the pipeline.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "..", "public", "rates.json");
const num = (v) => (typeof v === "number" && !isNaN(v) ? v : null);

// --- live source: World Bank avg lending rate for Bangladesh (free, lagging) ---
async function fetchLendingRateWB() {
  try {
    const url =
      "https://api.worldbank.org/v2/country/BD/indicator/FR.INR.LEND" +
      "?format=json&per_page=10&mrnev=1";
    const r = await fetch(url, { headers: { "User-Agent": "taka-compass" } });
    const j = await r.json();
    const v = j?.[1]?.find((d) => d && d.value != null)?.value;
    return num(v);
  } catch {
    return null;
  }
}

// --- stubs: return a number once you point them at a source you trust ---------
async function fetchInflation() { return null; }     // e.g. parse BBS CPI release
async function fetchSanchayapatra() { return null; }  // nationalsavings.gov.bd circular
async function fetchPolicyRate() { return null; }     // Bangladesh Bank
async function fetchFdr() { return null; }            // your bank's published board

async function main() {
  const cur = JSON.parse(await readFile(FILE, "utf8"));
  const next = { ...cur };

  // live reference (does not clobber the curated, fresher loan figures)
  const wb = await fetchLendingRateWB();
  if (wb != null) next.lendingRefWB = Math.round(wb * 100) / 100;

  // apply any fetchers that returned a value; otherwise keep last-good
  const upd = {
    inflation: await fetchInflation(),
    sanchayapatra: await fetchSanchayapatra(),
    policy: await fetchPolicyRate(),
    fdr: await fetchFdr(),
  };
  for (const [k, v] of Object.entries(upd)) if (v != null) next[k] = v;

  next.lastSynced = new Date().toISOString().slice(0, 10);
  await writeFile(FILE, JSON.stringify(next, null, 2) + "\n");
  console.log("rates.json synced", next.lastSynced, { lendingRefWB: next.lendingRefWB });
}

main().catch((e) => {
  console.error("sync failed:", e);
  process.exit(1);
});
