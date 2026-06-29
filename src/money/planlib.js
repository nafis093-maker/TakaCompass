import { tk, big } from "./lib.js";

export const RATES = { inflation: 9.4, sanchayapatra: 11.83, homeLoan: 13, carLoan: 13.5, taxFree: 375000 };

export function emi(P, ratePct, years) {
  if (P <= 0 || years <= 0) return 0;
  const r = ratePct / 100 / 12, n = years * 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

const SLABS = [375000, 300000, 400000, 500000, 2000000, Infinity];
const SRATE = [0, 0.10, 0.15, 0.20, 0.25, 0.30];
export function taxBD(taxable, eligibleInvest) {
  if (taxable <= RATES.taxFree) return { gross: 0, rebate: 0, net: 0, eff: 0, allowable: 0 };
  let rem = taxable, gross = 0;
  const slabs = [RATES.taxFree, ...SLABS.slice(1)];
  for (let i = 0; i < slabs.length; i++) {
    const band = Math.min(rem, slabs[i]);
    gross += band * SRATE[i];
    rem -= band;
    if (rem <= 0) break;
  }
  const allowable = Math.min(eligibleInvest, 0.2 * taxable, 1000000);
  const rebate = 0.15 * allowable;
  const net = Math.max(gross - rebate, 5000);
  return { gross, rebate, net, eff: taxable > 0 ? (net / taxable) * 100 : 0, allowable };
}

export function realReturn(blended) {
  return ((1 + blended / 100) / (1 + RATES.inflation / 100) - 1) * 100;
}

export function projectSeries(nw, annualAdd, growth, years) {
  const pts = [{ y: 0, nom: nw, real: nw }];
  let v = nw;
  for (let i = 1; i <= years; i++) {
    v = v * (1 + growth / 100) + annualAdd;
    pts.push({ y: i, nom: v, real: v / Math.pow(1 + RATES.inflation / 100, i) });
  }
  return pts;
}

export function goalEval(g, surplus, monthlyIncome, curEMI) {
  const dpAmt = g.cost * g.dp / 100;
  const loanAmt = g.cost - dpAmt;
  const months = Math.max(1, g.years * 12);
  const reqSave = dpAmt / months;
  const loanEMI = emi(loanAmt, g.rate, g.tenure);
  const totalInterest = loanEMI * g.tenure * 12 - loanAmt;
  const dtiAfter = monthlyIncome > 0 ? ((curEMI + loanEMI) / monthlyIncome) * 100 : 0;
  let level, verdict;
  if (reqSave - surplus > 0) { level = "warn"; verdict = `Need ${tk(reqSave)}/mo for the down payment but your surplus is ${tk(surplus)} — stretch the timeline or lift income.`; }
  else if (dtiAfter > 40) { level = "warn"; verdict = `Down payment is reachable, but the ${tk(loanEMI)} EMI pushes debt to ${Math.round(dtiAfter)}% of income (over 40%). Bigger down payment helps.`; }
  else { level = "ok"; verdict = `On track — ${tk(reqSave)}/mo covers the down payment in ${g.years}y, and the ${tk(loanEMI)} EMI keeps debt at a healthy ${Math.round(dtiAfter)}%.`; }
  return { dpAmt, loanAmt, reqSave, loanEMI, totalInterest, dtiAfter, level, verdict };
}

const LV = { alert: 0, warn: 1, opp: 2, ok: 3 };
const TAG = { alert: "ACT NOW", warn: "HEADS UP", opp: "OPPORTUNITY", ok: "NICE" };

export function buildInsights(d, taxInvest) {
  const out = [];
  const card = (level, title, body, action, weight = 0) => out.push({ level, title, body, action, weight, tagText: TAG[level] });
  const idleCash = Math.max(0, d.liquid - d.essentialMonthly * 6);

  if (d.monthlyIncome > 0 && d.surplus < 0)
    card("alert", "Spending more than you earn", `You're ${tk(-d.surplus)} in the red this month — outflows beat income.`,
      "Trim your two biggest flexible categories this week, or pause non-essentials until payday.", 3000000 + (-d.surplus));

  if (d.essentialMonthly > 0 && d.emMonths < 3)
    card("alert", "Emergency fund is thin", `Your cash covers only ${d.emMonths.toFixed(1)} months of essentials — a shock could hurt.`,
      `Build toward ${big(d.essentialMonthly * 6)} in cash/FDR before investing anywhere else.`, 2000000 + (3 - d.emMonths) * 100000);
  else if (d.essentialMonthly > 0 && d.emMonths < 6)
    card("warn", "Top up the emergency fund", `You're at ${d.emMonths.toFixed(1)} months of cover.`,
      `Auto-save ~${big((d.essentialMonthly * 6 - d.liquid) / 3)}/mo for 3 months to reach the 6-month floor.`);

  const pricey = d.loans.filter((l) => l.rate >= 12).sort((a, b) => b.rate - a.rate)[0];
  if (pricey && idleCash > 0)
    card("opp", "Prepay debt with idle cash", `Your ${pricey.name} costs ${pricey.rate}% — more than idle cash earns.`,
      `Put ${big(Math.min(idleCash, pricey.bal))} toward ${pricey.name} principal — a guaranteed ${pricey.rate}% return.`);

  if (idleCash > 50000)
    card("warn", "Idle cash is losing value", `${big(idleCash)} sits beyond your safety buffer. At ${RATES.inflation}% inflation it loses ~${tk(idleCash * (RATES.inflation - 1) / 100)} this year.`,
      `Move ${big(idleCash)} into a 5-year Sanchayapatra (~${RATES.sanchayapatra}%) or a 1-year FDR this month.`, 300000 + idleCash / 100);

  const rr = realReturn(d.blendedReturn);
  if (d.totalAssets > 0 && rr < 0)
    card("warn", "Wealth is losing to inflation", `Your blended ${d.blendedReturn.toFixed(1)}% return trails ${RATES.inflation}% inflation.`,
      "Shift part of your low-yield cash into Sanchayapatra and a small, measured gold/DSE mix.");
  else if (d.totalAssets > 0 && rr >= 2)
    card("ok", "Beating inflation", `Your ${d.blendedReturn.toFixed(1)}% blended return clears inflation by ${rr.toFixed(1)} points.`,
      "Keep the allocation and review it once or twice a year.");

  const top = d.allocation[0];
  if (top && top.pct > 60)
    card("warn", `Heavy in ${top.k.toLowerCase()}`, `${Math.round(top.pct)}% of assets sit in one bucket, so one bad year hits hard.`,
      "Direct new savings into other buckets until no single one is above ~50%.");

  if (d.dti > 40)
    card("alert", "Loan load is high", `EMIs eat ${Math.round(d.dti)}% of your income — past the 40% safe ceiling.`,
      "Avoid new loans; refinance or prepay the highest-rate one to ease the load.", 1000000 + d.dti * 1000);

  const room = Math.min(0.2 * d.monthlyIncome * 12, 1000000) - taxInvest;
  if (d.surplus > 0 && room > 20000)
    card("opp", "Unused tax-rebate room", `You can still claim a rebate on ~${big(room)} of eligible investment.`,
      `Invest ${big(room)} in Sanchayapatra/DPS before June 30 to trim ~${tk(0.15 * room)} off your tax.`);

  if (d.monthlyIncome > 0 && d.surplus >= 0 && d.savingsRate >= 25)
    card("ok", "Strong savings rate", `You're saving ${Math.round(d.savingsRate)}% of income — great firepower.`,
      "Point that surplus at a named goal — a flat, retirement, or a Sanchayapatra ladder.");
  else if (d.monthlyIncome > 0 && d.surplus >= 0 && d.savingsRate < 20)
    card("warn", "Low savings rate", `You're saving ${Math.round(d.savingsRate)}% of income.`,
      "Set a 25% auto-transfer on payday so savings leave before you can spend them.");

  (d.budgetAlerts || []).slice(0, 2).forEach((b) => {
    if (b.pct >= 100)
      card("warn", `${b.name} budget is blown`, `You've used ${Math.round(b.pct)}% of your ${big(b.amount)} ${b.name.toLowerCase()} budget this month.`,
        "Ease off this category for the rest of the month, or raise the budget if it's no longer realistic.", 500000 + b.pct * 1000);
    else
      card("warn", `${b.name} budget almost gone`, `${Math.round(b.pct)}% of your ${big(b.amount)} ${b.name.toLowerCase()} budget is used.`,
        `Only ${big(b.amount - b.spent)} left — pace the rest of the month carefully.`);
  });

  if (d.loggingStreak >= 3)
    card("ok", `${d.loggingStreak}-day logging streak`, "You've recorded something every day lately — that consistency is what makes the numbers trustworthy.",
      "Keep it up; the longer the history, the sharper these suggestions get.");

  if (out.length === 0) card("ok", "Looking steady", "Not enough data yet for tailored insights.",
    "Import a bank statement or add a few transactions to unlock suggestions.");
  return out.sort((a, b) => LV[a.level] - LV[b.level] || (b.weight || 0) - (a.weight || 0));
}
