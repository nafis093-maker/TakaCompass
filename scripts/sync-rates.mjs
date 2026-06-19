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

// Bangla → Western digits (govt pages often render numbers in Bangla)
const BN = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
const bnToEn = (s) => s.replace(/[০-৯]/g, (d) => BN[d]);

// --- Sanchayapatra source config (adjust if the Action log shows a miss) ----
// The Dept. of National Savings publishes profit rates here. There is no API,
// so we fetch the page, flatten it to text, and pull the 5-year Bangladesh
// Sanchayapatra rate near its label. If they move the page or render it via
// JS / PDF, this returns null and the curated baseline in rates.json is kept.
const SANCHAYAPATRA_URLS = [
  "https://nationalsavings.gov.bd/",
  "https://www.nationalsavings.gov.bd/",
];

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
async function fetchPolicyRate() { return null; }     // Bangladesh Bank
async function fetchFdr() { return null; }            // your bank's published board

// --- real best-effort: 5-year Bangladesh Sanchayapatra from nationalsavings.gov.bd
async function fetchSanchayapatra() {
  for (const url of SANCHAYAPATRA_URLS) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; taka-compass-bot/1.0)" },
        redirect: "follow",
      });
      if (!r.ok) continue;
      const text = bnToEn(await r.text())
        .replace(/<[^>]+>/g, " ")   // drop tags
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ");
      // a percentage figure sitting near a 5-year / Bangladesh Sanchayapatra label
      const patterns = [
        /(?:5[\s-]?year|five[\s-]?year|bangladesh\s*sanchayapatra|5\s*bochor|p(?:a|aa)nch\s*bochor)[^%]{0,140}?(\d{1,2}(?:\.\d{1,2})?)\s*%/i,
        /(\d{2}(?:\.\d{1,2})?)\s*%[^%]{0,80}?(?:5[\s-]?year|bangladesh\s*sanchayapatra)/i,
      ];
      for (const re of patterns) {
        const m = text.match(re);
        if (m) {
          const v = parseFloat(m[1]);
          if (v > 5 && v < 20) {        // sanity band — rejects junk matches
            console.log("sanchayapatra: matched", v + "% from", url);
            return Math.round(v * 100) / 100;
          }
        }
      }
      console.warn("sanchayapatra: fetched", url, "but no rate matched — page may be JS-rendered or relabelled; adjust SANCHAYAPATRA_URLS / patterns");
    } catch (e) {
      console.warn("sanchayapatra: fetch failed for", url, "—", e.message);
    }
  }
  return null; // keep the curated baseline
}

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
