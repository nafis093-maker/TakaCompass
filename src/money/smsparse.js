import { today } from "./lib.js";

// Heuristic parser for common Bangladeshi transaction SMS (bKash, Nagad, Rocket,
// banks/cards). It won't be perfect — every parsed item is editable before import.

const num = (s) => parseFloat(String(s).replace(/,/g, ""));

function amountFrom(s) {
  const m = s.match(/(?:Tk|BDT|TK|৳)\.?\s*([\d,]+(?:\.\d{1,2})?)/i) || s.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:Tk|BDT|taka)/i);
  return m ? num(m[1]) : null;
}

function provider(low) {
  if (low.includes("bkash")) return "bKash";
  if (low.includes("nagad")) return "Nagad";
  if (low.includes("rocket")) return "Rocket";
  if (low.includes("upay")) return "Upay";
  return "";
}

export function guessCategory(low, who, type) {
  const w = (who || "") + " " + low;
  if (type === "income") {
    if (/salary|payroll|wage/.test(w)) return "salary";
    if (/int\.?\s?pd|interest/.test(w)) return "investment";
    if (/dividend|profit/.test(w)) return "investment";
    if (/refund|cashback|reversal/.test(w)) return "other_in";
    return "other_in";
  }
  if (/wtax|\bvat\b|excise|\bduty\b|ac mnt|mnt fee|maintenance|yrly ac|service charge|\bcharge\b|scheme fee|stamp/.test(w)) return "bills";
  if (/card pymt|card payment|\bpos\b|visa|mastercard/.test(w)) return "shopping";
  if (/restaurant|food|cafe|kfc|pizza|burger|foodpanda|hungrynaki|dine/.test(w)) return "food";
  if (/grocery|super ?shop|agora|meena|shwapno|unimart|daily/.test(w)) return "groceries";
  if (/fuel|petrol|octane|cng|filling/.test(w)) return "transport";
  if (/uber|pathao|obhai|ride|bus|train|rail|air|flight/.test(w)) return "transport";
  if (/electric|desco|dpdc|wasa|gas|titas|water|internet|isp|wifi|broadband|bill/.test(w)) return "bills";
  if (/recharge|mobile|topup|top-up|airtime|gp |robi|banglalink|teletalk/.test(w)) return "bills";
  if (/pharma|hospital|clinic|doctor|medic|health|diagnostic/.test(w)) return "health";
  if (/school|college|university|tuition|admission|semester|exam fee|education/.test(w)) return "education";
  if (/shop|store|mart|fashion|cloth|electronics|daraz|mall|purchase/.test(w)) return "shopping";
  if (/cash out|withdraw|atm/.test(low)) return "other";
  return "other";
}

function dateFrom(s) {
  // dd/mm/yyyy or dd-mm-yyyy or dd-Mon-yyyy
  let m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!isNaN(Date.parse(iso))) return iso;
  }
  m = s.match(/(\d{1,2})[\s-]([A-Za-z]{3})[\s-](\d{2,4})/);
  if (m) {
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const mm = months[m[2].toLowerCase()];
    if (mm) {
      let y = m[3].length === 2 ? "20" + m[3] : m[3];
      return `${y}-${mm}-${String(m[1]).padStart(2, "0")}`;
    }
  }
  return null;
}

function clean(x) {
  if (!x) return "";
  return x.split(/[.,;:]|\b(?:successful|completed|on|via|ref|trxid|txnid|balance|tk|bdt|fee|account|a\/c)\b/i)[0].trim().replace(/\s+/g, " ");
}
function counterparty(s) {
  const at = s.match(/\bat\s+([A-Za-z][A-Za-z0-9 .&'-]{1,28})/i);
  const to = s.match(/\bto\s+([A-Za-z][A-Za-z0-9 .&'-]{1,28})/i);
  const from = s.match(/\bfrom\s+([A-Za-z][A-Za-z0-9 .&'-]{1,28})/i);
  return clean(at?.[1] || to?.[1] || from?.[1] || "");
}

function refFrom(s) {
  const m = s.match(/\b(?:trx\.?\s?id|txn\.?\s?id|transaction\s?id|trace\s?id|ref(?:erence)?(?:\s?(?:no|id|num|#))?)[:\s#.]*([A-Za-z0-9]{4,})/i);
  return m ? m[1] : null;
}

export function parseOne(raw) {
  const s = raw.trim();
  if (!s) return null;
  const amount = amountFrom(s);
  if (!amount) return null;
  const low = s.toLowerCase();

  let type = "expense";
  if (/\b(received|cash ?in|credited|deposit|salary|add money|money received|refund|received from)\b/.test(low)) type = "income";
  if (/\b(sent|send money|payment|cash ?out|withdraw|debited|spent|purchase|paid|bill pay|transfer to)\b/.test(low)) type = "expense";

  const who = counterparty(s);
  const category = guessCategory(low, who, type);
  const prov = provider(low);
  const note = [prov, who].filter(Boolean).join(" · ").slice(0, 40);
  const date = dateFrom(s) || today();
  const ref = refFrom(s) || undefined;
  return { type, amount, category, note, date, ref, raw: s };
}

export function parseSms(text) {
  // split on blank lines; if one blob, also split on obvious message starts
  let blocks = text.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length <= 1) {
    blocks = text.split(/\n(?=(?:bkash|nagad|rocket|your|tk|bdt|payment|cash|received|sent)\b)/i).map((b) => b.trim()).filter(Boolean);
  }
  return blocks.map(parseOne).filter(Boolean);
}
