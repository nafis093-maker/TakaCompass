import { monthKey, today, ymd, walletBalance, kindOf, LIQUID_KINDS, catOf } from "./lib.js";

const ESSENTIAL = new Set(["food", "transport", "home", "bills", "health", "education", "family", "groceries"]);
const sum = (arr) => arr.reduce((s, x) => s + x, 0);
const GROUP_COLOR = { Liquid: "#06b6d4", "Fixed-income": "#10b981", Equity: "#8b5cf6", Gold: "#f59e0b", Other: "#94a3b8" };

// Everything the analytics layer needs, derived from the simple money data.
export function derive(data) {
  const { wallets, txns, loans = [], goals = [], budgets = [] } = data;
  const mk = today().slice(0, 7);

  // Use the same trailing window for income AND expense so payday timing and
  // statement-import gaps don't distort the surplus / savings rate. We average
  // over the most recent (up to 3) months that have any income or expense.
  const activeMonths = [...new Set(
    txns.filter((t) => t.type === "income" || t.type === "expense").map((t) => monthKey(t.date))
  )].sort();
  const recent = activeMonths.slice(-3);
  const span = recent.length || 1;
  const inWin = (t) => recent.includes(monthKey(t.date));

  const monthlyIncome = sum(txns.filter((t) => t.type === "income" && inWin(t)).map((t) => t.amount)) / span;

  const catMap = {};
  txns.filter((t) => t.type === "expense" && inWin(t)).forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const expensesByCat = Object.entries(catMap).map(([k, amt]) => ({ key: k, name: catOf(k).label, amt: amt / span, ess: ESSENTIAL.has(k) }));
  const monthlyExpense = sum(expensesByCat.map((e) => e.amt));
  const essFlagged = sum(expensesByCat.filter((e) => e.ess).map((e) => e.amt));
  const essentialMonthly = essFlagged || monthlyExpense;

  const assets = wallets.map((w) => {
    const k = kindOf(w.kind);
    return { name: w.name, amt: walletBalance(w, txns), kind: w.kind, ret: k.ret, group: k.group };
  });
  const totalAssets = sum(assets.map((a) => a.amt));
  const liquid = sum(assets.filter((a) => LIQUID_KINDS.has(a.kind)).map((a) => a.amt));
  const totalLoans = sum(loans.map((l) => l.bal));
  const totalEMI = sum(loans.map((l) => l.emi));
  const netWorth = totalAssets - totalLoans;
  const blendedReturn = totalAssets > 0 ? sum(assets.map((a) => a.amt * a.ret)) / totalAssets : 0;

  const surplus = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0;
  const dti = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;
  const emMonths = essentialMonthly > 0 ? liquid / essentialMonthly : 0;

  const grp = {};
  assets.forEach((a) => { grp[a.group] = (grp[a.group] || 0) + a.amt; });
  const allocation = Object.entries(grp)
    .map(([k, v]) => ({ k, v, pct: totalAssets > 0 ? (v / totalAssets) * 100 : 0, color: GROUP_COLOR[k] || "#94a3b8" }))
    .sort((a, b) => b.v - a.v);

  // engagement signals
  const dateSet = new Set(txns.map((t) => t.date));
  let loggingStreak = 0;
  let cur = today();
  while (dateSet.has(cur)) { loggingStreak++; const dt = new Date(cur); dt.setDate(dt.getDate() - 1); cur = ymd(dt); }

  const budgetAlerts = budgets
    .map((b) => {
      const spent = txns.filter((t) => t.type === "expense" && monthKey(t.date) === mk && (b.category === "all" || t.category === b.category)).reduce((s, t) => s + t.amount, 0);
      return { name: b.name, spent, amount: b.amount, pct: b.amount > 0 ? (spent / b.amount) * 100 : 0 };
    })
    .filter((x) => x.pct >= 85)
    .sort((a, b) => b.pct - a.pct);

  return {
    mk, monthlyIncome, monthlyExpense, expensesByCat, essentialMonthly,
    assets, totalAssets, liquid, loans, totalLoans, totalEMI, netWorth,
    blendedReturn, surplus, savingsRate, dti, emMonths, allocation, goals,
    loggingStreak, budgetAlerts,
  };
}
