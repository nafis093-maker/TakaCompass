import { guessCategory } from "./smsparse.js";

const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  "এক": 1, "দুই": 2, "তিন": 3, "চার": 4, "পাঁচ": 5, "পাচ": 5, "ছয়": 6, "ছ": 6, "সাত": 7, "আট": 8, "নয়": 9, "নয": 9, "দশ": 10,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const HUNDRED = new Set(["hundred", "শ", "শত", "একশ", "শো"]);
const THOUSAND = new Set(["thousand", "k", "grand", "হাজার"]);
const LAKH = new Set(["lakh", "lac", "লাখ", "লক্ষ"]);
const CRORE = new Set(["crore", "cr", "কোটি"]);
const MILLION = new Set(["million"]);
const NUMWORDS = new Set([
  ...Object.keys(ONES), ...Object.keys(TENS),
  ...HUNDRED, ...THOUSAND, ...LAKH, ...CRORE, ...MILLION, "and", "ও", "আর",
]);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
function bnToAscii(s) { return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))); }

function wordsToNumber(seq) {
  let total = 0, current = 0, found = false;
  for (const w of seq) {
    if (ONES[w] != null) { current += ONES[w]; found = true; }
    else if (TENS[w] != null) { current += TENS[w]; found = true; }
    else if (HUNDRED.has(w)) { current = (current || 1) * 100; found = true; }
    else if (THOUSAND.has(w)) { total += (current || 1) * 1000; current = 0; found = true; }
    else if (LAKH.has(w)) { total += (current || 1) * 100000; current = 0; found = true; }
    else if (CRORE.has(w)) { total += (current || 1) * 10000000; current = 0; found = true; }
    else if (MILLION.has(w)) { total += (current || 1) * 1000000; current = 0; found = true; }
  }
  return found ? total + current : null;
}

const SCALE_RE = "k|hundred|thousand|lakh|lac|crore|cr|হাজার|শত|শ|লাখ|লক্ষ|কোটি";
function scaleMul(s) {
  if (!s) return 1;
  if (THOUSAND.has(s)) return 1000;
  if (HUNDRED.has(s)) return 100;
  if (LAKH.has(s)) return 100000;
  if (CRORE.has(s) || s === "cr") return 10000000;
  return 1;
}

function extractAmount(low) {
  const m = low.match(new RegExp("(\\d[\\d,]*(?:\\.\\d+)?)\\s*(" + SCALE_RE + ")?"));
  if (m && m[1]) {
    let n = parseFloat(m[1].replace(/,/g, ""));
    n *= scaleMul(m[2]);
    if (n > 0) return n;
  }
  const tokens = low.replace(/[^a-z\u0980-\u09FF\s]/g, " ").split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (NUMWORDS.has(tokens[i])) {
      const seq = []; let j = i;
      while (j < tokens.length && NUMWORDS.has(tokens[j])) { seq.push(tokens[j]); j++; }
      const val = wordsToNumber(seq);
      if (val && val > 0) return val;
      i = j;
    }
  }
  return null;
}

const BN_CAT = [
  [/খাবার|খাওয়া|দুপুর|রাত|নাস্তা|হোটেল|রেস্ট/, "food"],
  [/বাজার|মুদি|সদাই/, "groceries"],
  [/রিকশা|রিক্সা|উবার|পাঠাও|বাস|সিএনজি|যাতায়াত|ভাড়া|ট্রেন|বাইক/, "transport"],
  [/বিল|বিদ্যুৎ|কারেন্ট|গ্যাস|পানি|ইন্টারনেট|রিচার্জ|মোবাইল/, "bills"],
  [/কেনা|কিনলাম|শপিং|জামা|কাপড়|জুতা/, "shopping"],
  [/ওষুধ|ঔষধ|ডাক্তার|হাসপাতাল|চিকিৎসা/, "health"],
  [/সিনেমা|মুভি|বিনোদন|গেম/, "fun"],
  [/বেতন|স্যালারি/, "salary"],
];
function bnCategory(low) {
  for (const [re, key] of BN_CAT) { if (re.test(low)) return key; }
  return null;
}

export function parseSpeech(text) {
  if (!text) return null;
  const low = bnToAscii(text.toLowerCase());
  const amount = extractAmount(low);
  if (!amount || amount <= 0) return null;

  const income = /\b(received|recieved|got|get|earned|salary|income|credited|credit|deposit|deposited|refund|bonus|profit|interest|cashback)\b/.test(low)
    || /বেতন|পেলাম|পেয়েছি|আয়|জমা|বোনাস|ফেরত|লাভ|মুনাফা/.test(low);
  const type = income ? "income" : "expense";

  let note = "";
  const nm = low.match(/\b(?:on|for|at|to|from)\s+([a-z][a-z\s]{1,28})/);
  if (nm) note = nm[1].replace(/\b(taka|tk|bdt|today|yesterday|please|rupees?)\b/g, "").replace(/\s+/g, " ").trim();

  const category = bnCategory(low) || guessCategory(low, note || low, type);
  return { type, amount: Math.round(amount), category, note: note ? note[0].toUpperCase() + note.slice(1) : "" };
}
