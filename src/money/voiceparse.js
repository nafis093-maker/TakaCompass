import { guessCategory } from "./smsparse.js";

const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NUMWORDS = new Set([...Object.keys(ONES), ...Object.keys(TENS), "hundred", "thousand", "lakh", "lac", "k", "grand", "million", "crore", "and"]);

function wordsToNumber(seq) {
  let total = 0, current = 0, found = false;
  for (const w of seq) {
    if (ONES[w] != null) { current += ONES[w]; found = true; }
    else if (TENS[w] != null) { current += TENS[w]; found = true; }
    else if (w === "hundred") { current = (current || 1) * 100; found = true; }
    else if (w === "thousand" || w === "k" || w === "grand") { total += (current || 1) * 1000; current = 0; found = true; }
    else if (w === "lakh" || w === "lac") { total += (current || 1) * 100000; current = 0; found = true; }
    else if (w === "crore") { total += (current || 1) * 10000000; current = 0; found = true; }
    else if (w === "million") { total += (current || 1) * 1000000; current = 0; found = true; }
    else if (w === "and") { /* skip */ }
  }
  return found ? total + current : null;
}

function extractAmount(low) {
  const m = low.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|hundred|thousand|lakh|lac|crore|cr)?/);
  if (m) {
    let n = parseFloat(m[1].replace(/,/g, ""));
    const s = m[2];
    if (s === "k" || s === "thousand") n *= 1000;
    else if (s === "hundred") n *= 100;
    else if (s === "lakh" || s === "lac") n *= 100000;
    else if (s === "crore" || s === "cr") n *= 10000000;
    if (n > 0) return n;
  }
  const tokens = low.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (NUMWORDS.has(tokens[i])) {
      const seq = [];
      let j = i;
      while (j < tokens.length && NUMWORDS.has(tokens[j])) { seq.push(tokens[j]); j++; }
      const val = wordsToNumber(seq);
      if (val && val > 0) return val;
      i = j;
    }
  }
  return null;
}

// "spent 200 on lunch" / "received 5k salary" / "two hundred taka groceries"
export function parseSpeech(text) {
  if (!text) return null;
  const low = text.toLowerCase();
  const amount = extractAmount(low);
  if (!amount || amount <= 0) return null;

  const income = /\b(received|recieved|got|get|earned|salary|income|credited|credit|deposit|deposited|refund|bonus|profit|interest|cashback)\b/.test(low);
  const type = income ? "income" : "expense";

  let note = "";
  const nm = low.match(/\b(?:on|for|at|to|from)\s+([a-z][a-z\s]{1,28})/);
  if (nm) note = nm[1].replace(/\b(taka|tk|bdt|today|yesterday|please|rupees?)\b/g, "").replace(/\s+/g, " ").trim();

  const category = guessCategory(low, note || low, type);
  return { type, amount: Math.round(amount), category, note: note ? note[0].toUpperCase() + note.slice(1) : "" };
}
