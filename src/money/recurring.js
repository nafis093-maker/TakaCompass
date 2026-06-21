import { uid, today, ymd } from "./lib.js";

export const addMonths = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return ymd(d); };
export const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return ymd(d); };
const step = (iso, freq) => (freq === "weekly" ? addDays(iso, 7) : freq === "yearly" ? addMonths(iso, 12) : addMonths(iso, 1));

// Next occurrence strictly after `from`, starting from rule.nextDate.
export function nextAfter(nextDate, freq, from) {
  let n = nextDate;
  let g = 0;
  while (n <= from && g++ < 600) n = step(n, freq);
  return n;
}

// Turn every due occurrence (up to today) into real transactions.
// Returns { txns: [...new], recurring: [...updated] } — only changed when something is due.
export function materializeDue(data) {
  const t0 = today();
  const newTxns = [];
  let changed = false;
  const recurring = (data.recurring || []).map((r) => {
    if (!r.active) return r;
    let next = r.nextDate;
    let g = 0;
    while (next <= t0 && g++ < 600) {
      newTxns.push({
        id: uid(), type: r.type, amount: r.amount, category: r.category,
        walletId: r.walletId, toWalletId: r.toWalletId, date: next,
        note: r.note || "Recurring", recurringId: r.id, auto: true,
      });
      next = step(next, r.freq);
      changed = true;
    }
    return next === r.nextDate ? r : { ...r, nextDate: next };
  });
  return changed ? { txns: newTxns, recurring } : { txns: [], recurring: data.recurring || [] };
}

// Rules due within the next `days` days (for the upcoming strip + reminders).
export function upcoming(recurring = [], days = 14) {
  const t0 = today();
  const until = addDays(t0, days);
  return (recurring || [])
    .filter((r) => r.active && r.nextDate >= t0 && r.nextDate <= until)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

export function makeRule({ type, amount, category, walletId, toWalletId, note, freq, nextDate }) {
  return { id: uid(), type, amount: +amount, category, walletId, toWalletId, note: note || "", freq: freq || "monthly", nextDate, active: true };
}
