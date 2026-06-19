import {
  Utensils, ShoppingBag, TrainFront, Home, ReceiptText, Drama, Car, Plane,
  Users, HeartPulse, GraduationCap, ShoppingCart, Tag, Banknote, Briefcase,
  Gift, TrendingUp, Coins,
} from "lucide-react";

// ---- categories (colorful, like the reference money managers) -------------
export const EXPENSE_CATS = [
  { key: "food", label: "Food & Drink", Icon: Utensils, color: "#f97316" },
  { key: "shopping", label: "Shopping", Icon: ShoppingBag, color: "#d946ef" },
  { key: "transport", label: "Transport", Icon: TrainFront, color: "#f59e0b" },
  { key: "home", label: "Home", Icon: Home, color: "#b08968" },
  { key: "bills", label: "Bills & Fees", Icon: ReceiptText, color: "#14b8a6" },
  { key: "fun", label: "Entertainment", Icon: Drama, color: "#fb923c" },
  { key: "car", label: "Car", Icon: Car, color: "#3b82f6" },
  { key: "travel", label: "Travel", Icon: Plane, color: "#ec4899" },
  { key: "family", label: "Family", Icon: Users, color: "#60a5fa" },
  { key: "health", label: "Healthcare", Icon: HeartPulse, color: "#ef4444" },
  { key: "education", label: "Education", Icon: GraduationCap, color: "#2563eb" },
  { key: "groceries", label: "Groceries", Icon: ShoppingCart, color: "#f59e0b" },
  { key: "other", label: "Other", Icon: Tag, color: "#94a3b8" },
];
export const INCOME_CATS = [
  { key: "salary", label: "Salary", Icon: Banknote, color: "#0ea372" },
  { key: "business", label: "Business", Icon: Briefcase, color: "#0891b2" },
  { key: "gift", label: "Gift", Icon: Gift, color: "#ec4899" },
  { key: "investment", label: "Investment", Icon: TrendingUp, color: "#8b5cf6" },
  { key: "other_in", label: "Other", Icon: Coins, color: "#94a3b8" },
];
const ALL = {};
[...EXPENSE_CATS, ...INCOME_CATS].forEach((c) => (ALL[c.key] = c));
export const catOf = (key) => ALL[key] || { key, label: "Other", Icon: Tag, color: "#94a3b8" };

// ---- formatting ------------------------------------------------------------
export const tk = (n) => "৳" + Math.round(Math.abs(n)).toLocaleString("en-US");
export const signed = (n) => (n < 0 ? "-" : n > 0 ? "+" : "") + tk(n);
export const big = (n) => {
  const a = Math.abs(n);
  if (a >= 1e7) return "৳" + (n / 1e7).toFixed(2) + "Cr";
  if (a >= 1e5) return "৳" + (n / 1e5).toFixed(2) + "L";
  if (a >= 1e3) return "৳" + Math.round(n / 1e3) + "k";
  return "৳" + Math.round(n);
};
export const uid = () => Math.random().toString(36).slice(2, 9);
export const today = () => new Date().toISOString().slice(0, 10);
export const monthKey = (d) => d.slice(0, 7);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (mk) => MON[parseInt(mk.slice(5, 7), 10) - 1];
export const niceDate = (d) => {
  if (d === today()) return "Today";
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (d === y) return "Yesterday";
  const dt = new Date(d);
  return `${MON[dt.getMonth()]} ${dt.getDate()}`;
};
export const lastMonths = (n) => {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.toISOString().slice(0, 7));
  }
  return out;
};

// ---- persistence -----------------------------------------------------------
const KEY = (email) => `taka:money:${email || "guest"}`;
export function loadMoney(email) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY(email)));
    if (d && d.wallets) return d;
  } catch {}
  return seed();
}
export function saveMoney(email, data) {
  try { localStorage.setItem(KEY(email), JSON.stringify(data)); } catch {}
}
function seed() {
  const w = { id: uid(), name: "Cash Wallet", opening: 0, color: "#0ea372" };
  return {
    wallets: [w],
    txns: [
      { id: uid(), type: "income", amount: 197000, category: "salary", walletId: w.id, date: today(), note: "" },
      { id: uid(), type: "expense", amount: 50000, category: "shopping", walletId: w.id, date: today(), note: "" },
    ],
    budgets: [{ id: uid(), name: "Shopping", amount: 60000, category: "shopping" }],
  };
}

// ---- derivations -----------------------------------------------------------
export function walletBalance(w, txns) {
  let b = w.opening || 0;
  for (const t of txns) {
    if (t.type === "expense" && t.walletId === w.id) b -= t.amount;
    else if (t.type === "income" && t.walletId === w.id) b += t.amount;
    else if (t.type === "transfer") {
      if (t.walletId === w.id) b -= t.amount;
      if (t.toWalletId === w.id) b += t.amount;
    }
  }
  return b;
}
export const totalWealth = (wallets, txns) => wallets.reduce((s, w) => s + walletBalance(w, txns), 0);

export function cashflowMonths(txns, n = 6) {
  const months = lastMonths(n);
  const map = {};
  months.forEach((m) => (map[m] = { month: m, income: 0, expense: 0 }));
  for (const t of txns) {
    const m = monthKey(t.date);
    if (!map[m]) continue;
    if (t.type === "income") map[m].income += t.amount;
    else if (t.type === "expense") map[m].expense += t.amount;
  }
  return months.map((m) => map[m]);
}

export function wealthSeries(wallets, txns, n = 6) {
  const months = lastMonths(n);
  const opening = wallets.reduce((s, w) => s + (w.opening || 0), 0);
  // net delta per month (income - expense; transfers net to zero across wallets)
  const delta = {};
  for (const t of txns) {
    const m = monthKey(t.date);
    if (t.type === "income") delta[m] = (delta[m] || 0) + t.amount;
    else if (t.type === "expense") delta[m] = (delta[m] || 0) - t.amount;
  }
  // cumulative up to and including each shown month, plus anything before window
  const allMonths = Object.keys(delta).sort();
  let running = opening;
  const before = allMonths.filter((m) => m < months[0]);
  before.forEach((m) => (running += delta[m]));
  return months.map((m) => {
    running += delta[m] || 0;
    return { month: m, value: running };
  });
}

export function categoryBreakdown(txns, type, mk) {
  const map = {};
  let total = 0;
  for (const t of txns) {
    if (t.type !== type) continue;
    if (mk && monthKey(t.date) !== mk) continue;
    map[t.category] = (map[t.category] || 0) + t.amount;
    total += t.amount;
  }
  return Object.entries(map)
    .map(([key, amount]) => ({ ...catOf(key), amount, pct: total ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function budgetSpent(budget, txns, mk) {
  return txns
    .filter((t) => t.type === "expense" && monthKey(t.date) === mk && (budget.category === "all" || t.category === budget.category))
    .reduce((s, t) => s + t.amount, 0);
}
