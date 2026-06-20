import { guessCategory } from "./smsparse.js";

const MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const DATE_RE = [
  /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/,
  /\b(\d{1,2})[\-\s]([A-Za-z]{3})[\-\s](\d{2,4})\b/,
  /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/,
];
const AMT_RE = /\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}/g;
const MONEY_TOK = /^\(?-?(?:\d{1,3}(?:,\d{3})*\.\d{2}|\d{1,3}(?:,\d{3})+)\)?$/;
const SKIP_RE = /opening balance|closing balance|balance b\/?f|balance forward|brought forward|carried forward|\bb\/f\b|\bc\/f\b|^balance$|sub ?total|grand total/i;

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
function refFrom(line) {
  const m = line.match(/\b(?:trx\.?\s?id|txn\.?\s?id|transaction\s?id|ref(?:erence)?(?:\s?(?:no|id|#))?)[:\s#.]*([A-Za-z0-9]{5,})/i);
  return m ? m[1] : null;
}
function isTransfer(desc) {
  return /tran(?:sfer)?\s+for\s+funding|closure\s+proceeds|ibanking\s+trf|fund\s+transfer|\btrf\s+to\s+\d|\btrf\s+from\s+\d|crtr\/nps|nps\s+online|own\s+a\/c/i.test(desc) || undefined;
}
const isMoney = (s) => MONEY_TOK.test(s.trim());
const val = (s) => parseFloat(s.replace(/[(),]/g, "").replace(/[^0-9.\-]/g, ""));

function descFromTokens(tokens) {
  const parts = tokens.map((t) => t.s).filter((s) => {
    const x = s.trim();
    return x && x !== "-" && x !== "," && !isMoney(x);
  });
  let s = stripDates(parts.join(" "));
  return s.replace(/\s{2,}/g, " ").replace(/[|]/g, " ").trim().slice(0, 50);
}

function findAnchors(rows) {
  for (const r of rows) {
    if (!r.tokens) continue;
    let W, D, B;
    for (const t of r.tokens) {
      const s = t.s.trim().toLowerCase();
      if (W == null && /^(withdraw|withdrawal|debit|debits?)$/.test(s)) W = t.x;
      else if (D == null && /^(deposit|credit|credits?)$/.test(s)) D = t.x;
      else if (B == null && /^balance$/.test(s)) B = t.x;
    }
    if (W != null && D != null && B != null) return { W, D, B };
  }
  return null;
}

// Column-aware parse: assign each money token to the nearest of the
// Withdrawal / Deposit / Balance columns by x-position.
function parseByColumns(rows, anchors) {
  const { W, D, B } = anchors;
  const out = [];
  let opening = null;
  for (const r of rows) {
    const date = parseDate(r.text);
    if (!date) continue;
    const monies = r.tokens.filter((t) => isMoney(t.s)).map((t) => ({ x: t.x, v: val(t.s) }));
    if (!monies.length) continue;
    let wd = 0, dp = 0, bal = null, balX = -1;
    for (const m of monies) {
      const dW = Math.abs(m.x - W), dD = Math.abs(m.x - D), dB = Math.abs(m.x - B);
      const min = Math.min(dW, dD, dB);
      if (min === dB) { if (m.x > balX) { bal = m.v; balX = m.x; } }
      else if (min === dW) wd += m.v;
      else dp += m.v;
    }
    if (SKIP_RE.test(r.text)) { if (bal != null && opening == null) opening = bal; continue; }
    let type, amount;
    if (wd > 0 && dp === 0) { type = "expense"; amount = wd; }
    else if (dp > 0 && wd === 0) { type = "income"; amount = dp; }
    else if (wd > 0 || dp > 0) { if (dp >= wd) { type = "income"; amount = dp; } else { type = "expense"; amount = wd; } }
    else continue;
    if (!amount || amount <= 0) continue;
    if (opening == null && bal != null) opening = bal - (type === "income" ? amount : -amount);
    const desc = descFromTokens(r.tokens);
    out.push({ type, amount, category: guessCategory(desc.toLowerCase(), desc, type), note: desc, date, ref: refFrom(r.text) || undefined, transfer: isTransfer(desc), raw: r.text, balance: bal });
  }
  return { txns: out, opening };
}

// Fallback when no column headers found: balance-delta on plain text lines.
function parseByDelta(lines) {
  const raw = [];
  for (const line of lines) {
    const date = parseDate(line);
    if (!date) continue;
    const amts = (stripDates(line).match(AMT_RE) || []).map((x) => parseFloat(x.replace(/,/g, "")));
    if (!amts.length) continue;
    const desc = descFromTokens(line.split(/\s+/).map((s) => ({ x: 0, s })));
    if (SKIP_RE.test(line)) { raw.push({ date, seed: true, bal: amts[amts.length - 1] }); continue; }
    const balance = amts.length >= 2 ? amts[amts.length - 1] : null;
    const amount = amts.length >= 2 ? amts[amts.length - 2] : amts[0];
    if (!amount || amount <= 0) continue;
    raw.push({ date, amount, balance, desc, line });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date));
  let prev = null; const out = [];
  for (const r of raw) {
    if (r.seed) { prev = r.bal; continue; }
    let type;
    if (/\bcr\b/i.test(r.line)) type = "income";
    else if (/\bdr\b/i.test(r.line)) type = "expense";
    else if (r.balance != null && prev != null) type = r.balance >= prev ? "income" : "expense";
    else type = "expense";
    if (r.balance != null) prev = r.balance;
    out.push({ type, amount: r.amount, category: guessCategory(r.desc.toLowerCase(), r.desc, type), note: r.desc, date: r.date, ref: refFrom(r.line) || undefined, raw: r.line, balance: r.balance });
  }
  return { txns: out, opening: null };
}

// Accepts rows of {text, tokens:[{x,s}]} (column-aware) or plain strings (delta).
export function parseStatement(input) {
  const rows = input.map((r) => (typeof r === "string" ? { text: r, tokens: null } : r));
  const anchors = rows.some((r) => r.tokens) ? findAnchors(rows) : null;
  return anchors ? parseByColumns(rows, anchors) : parseByDelta(rows.map((r) => r.text));
}
