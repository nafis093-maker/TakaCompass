import { monthKey, today, walletBalance, kindOf, LIQUID_KINDS, catOf } from "./lib.js";

const ESSENTIAL = new Set(["food", "transport", "home", "bills", "health", "education", "family", "groceries"]);
const sum = (arr) => arr.reduce((s, x) => s + x, 0);
const GROUP_COLOR = { Liquid: "#06b6d4", "Fixed-income": "#10b981", Equity: "#8b5cf6", Gold: "#f59e0b", Other: "#94a3b8" };

// Everything the analytics layer needs, derived from the simple money data.
export function derive(data) {
  const { wallets, txns, loans = [], goals = [] } = data;
  const mk = today().slice(0, 7);

  const incMonths = [...new Set(txns.filter((t) => t.type === "income").map((t) => monthKey(t.date)))].sort();
  const incMonth = txns.some((t) => t.type === "income" && monthKey(t.date) === mk) ? mk : (incMonths[incMonths.length - 1] || mk);
  const monthlyIncome = sum(txns.filter((t) => t.type === "income" && monthKey(t.date) === incMonth).map((t) => t.amount));

  const catMap = {};
  txns.filter((t) => t.type === "expense" && monthKey(t.date) === mk).forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const expensesByCat = Object.entries(catMap).map(([k, amt]) => ({ key: k, name: catOf(k).label, amt, ess: ESSENTIAL.has(k) }));
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

  return {
    mk, monthlyIncome, monthlyExpense, expensesByCat, essentialMonthly,
    assets, totalAssets, liquid, loans, totalLoans, totalEMI, netWorth,
    blendedReturn, surplus, savingsRate, dti, emMonths, allocation, goals,
  };
}
