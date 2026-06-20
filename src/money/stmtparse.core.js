import { guessCategory } from "./smsparse.js";

const MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const DATE_RE = [
  /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/,
  /\b(\d{1,2})[\-\s]([A-Za-z]{3})[\-\s](\d{2,4})\b/,
  /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/,
];
const AMT_RE = /\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}/g;

export function parseDate(line) {
  let m = line.match(DATE_RE[0]);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!isNaN(Date.parse(iso))) return iso;
  }
  m = line.match(DATE_RE[1]);
  if (m) {
    const mm = MONTHS[m[2].toLowerCase()];
    if (mm) { let y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${mm}-${m[1].padStart(2, "0")}`; }
  }
  m = line.match(DATE_RE[2]);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

function stripDates(line) {
  let s = line;
  DATE_RE.forEach((re) => { s = s.replace(new RegExp(re, "g"), " "); });
  return s;
}

function describe(line) {
  let s = stripDates(line).replace(AMT_RE, " ").replace(/\b(dr|cr)\b/gi, " ");
  return s.replace(/[|]/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 50);
}

const SKIP_RE = /opening balance|closing balance|balance b\/?f|brought forward|carried forward|\bb\/f\b|\bc\/f\b|^balance$|sub ?total|grand total/i;

function refFrom(line) {
  const m = line.match(/\b(?:trx\.?\s?id|txn\.?\s?id|transaction\s?id|ref(?:erence)?(?:\s?(?:no|id|#))?)[:\s#.]*([A-Za-z0-9]{5,})/i);
  return m ? m[1] : null;
}

export function parseStatement(lines) {
  const raw = [];
  for (const line of lines) {
    const date = parseDate(line);
    if (!date) continue;
    const cleaned = stripDates(line);
    const amts = (cleaned.match(AMT_RE) || []).map((x) => parseFloat(x.replace(/,/g, "")));
    if (!amts.length) continue;
    const desc = describe(line);
    if (SKIP_RE.test(line)) { raw.push({ date, seed: true, bal: amts[amts.length - 1] }); continue; }
    const balance = amts.length >= 2 ? amts[amts.length - 1] : null;
    const amount = amts.length >= 2 ? amts[amts.length - 2] : amts[0];
    if (!amount || amount <= 0) continue;
    raw.push({ date, amount, balance, desc, line });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date));
  let prev = null;
  const out = [];
  for (const r of raw) {
    if (r.seed) { prev = r.bal; continue; }
    let type;
    if (/\bcr\b/i.test(r.line)) type = "income";
    else if (/\bdr\b/i.test(r.line)) type = "expense";
    else if (r.balance != null && prev != null) type = r.balance >= prev ? "income" : "expense";
    else type = "expense";
    if (r.balance != null) prev = r.balance;
    const category = guessCategory(r.desc.toLowerCase(), r.desc, type);
    out.push({ type, amount: r.amount, category, note: r.desc, date: r.date, ref: refFrom(r.line) || undefined, raw: r.line });
  }
  return out;
}
