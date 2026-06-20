import React, { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  tk, big, catOf, today, monthLabel, cashflowMonths, wealthSeries, categoryBreakdown, totalWealth,
} from "./lib.js";
import { CashflowBars, WealthLine, Donut } from "./charts.jsx";
import { derive } from "./derive.js";
import { RATES, taxBD, realReturn, projectSeries, goalEval, buildInsights, emi } from "./planlib.js";
import { loadSources, adminToCatalog } from "./rateadmin.js";
import Marketplace from "../components/Marketplace.jsx";

const SEGS = ["Overview", "Health", "Goals", "Future", "Rates"];

export default function Plan({ data, addGoal, delGoal }) {
  const [seg, setSeg] = useState("Overview");
  const d = useMemo(() => derive(data), [data]);

  return (
    <div className="scr plan">
      <div className="m-title">Your plan</div>
      <p className="plan-intro">Live analysis of everything you've logged — no extra entry needed.</p>
      <div className="m-toggle plan-seg">
        {SEGS.map((s) => <button key={s} className={seg === s ? "on" : ""} onClick={() => setSeg(s)}>{s}</button>)}
      </div>

      {seg === "Overview" && <Overview data={data} d={d} />}
      {seg === "Health" && <Health d={d} />}
      {seg === "Goals" && <Goals d={d} addGoal={addGoal} delGoal={delGoal} />}
      {seg === "Future" && <Future d={d} />}
      {seg === "Rates" && (() => {
        const { extra, extraInst } = adminToCatalog(loadSources());
        return (
          <Marketplace
            idleCash={Math.max(0, d.liquid - d.essentialMonthly * 6)}
            goalLoan={d.goals[0] ? { amount: d.goals[0].cost * (1 - d.goals[0].dp / 100), years: d.goals[0].tenure, cat: /flat|home|house/i.test(d.goals[0].name) ? "home-loan" : /car/i.test(d.goals[0].name) ? "car-loan" : "personal-loan" } : null}
            rates={RATES}
            extraProducts={extra}
            extraInst={extraInst}
          />
        );
      })()}
    </div>
  );
}

function Overview({ data, d }) {
  const { wallets, txns } = data;
  const mk = today().slice(0, 7);
  const bars = useMemo(() => cashflowMonths(txns, 6), [txns]);
  const series = useMemo(() => wealthSeries(wallets, txns, 6), [wallets, txns]);
  const cats = useMemo(() => categoryBreakdown(txns, "expense", mk), [txns, mk]);
  return (
    <>
      <div className="m-cfsplit">
        <div className="cf in"><span>Income</span><b>{tk(d.monthlyIncome)}</b></div>
        <div className="cf out"><span>Expenses</span><b>{tk(d.monthlyExpense)}</b></div>
      </div>
      <div className="plan-sec">Cash flow · last 6 months</div>
      <CashflowBars data={bars} />
      <div className="plan-sec">Total wealth</div>
      <WealthLine data={series} />
      {cats.length > 0 && (
        <>
          <div className="plan-sec">Spending · {monthLabel(mk)}</div>
          <div className="m-donutwrap"><Donut slices={cats} /></div>
          <div className="m-list">
            {cats.map((c) => (
              <div className="m-catline" key={c.key}>
                <span className="m-txic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={18} strokeWidth={2.2} /></span>
                <div className="m-catmeta"><div className="m-txname">{c.label}</div><div className="m-txwallet">{Math.round(c.pct)}%</div></div>
                <div className="m-txamt">{tk(c.amount)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Health({ d }) {
  const rr = realReturn(d.blendedReturn);
  const insights = buildInsights(d, Math.min(0.2 * d.monthlyIncome * 12, 1000000) * 0.5);
  const chips = [
    { label: "Net worth", value: big(d.netWorth), tone: d.netWorth >= 0 ? "pos" : "neg" },
    { label: "Surplus / mo", value: tk(d.surplus), tone: d.surplus >= 0 ? "pos" : "neg" },
    { label: "Emergency", value: d.emMonths.toFixed(1) + " mo", tone: d.emMonths >= 6 ? "pos" : "warn" },
    { label: "Debt / income", value: Math.round(d.dti) + "%", tone: d.dti <= 36 ? "pos" : "warn" },
    { label: "Real growth", value: (rr >= 0 ? "+" : "") + rr.toFixed(1) + "%", tone: rr >= 0 ? "pos" : "neg" },
    { label: "Saving rate", value: Math.round(d.savingsRate) + "%", tone: d.savingsRate >= 20 ? "pos" : "warn" },
  ];
  return (
    <>
      <div className="plan-chips">
        {chips.map((c) => <div className="pchip" key={c.label}><span>{c.label}</span><b className={c.tone}>{c.value}</b></div>)}
      </div>
      {d.totalAssets > 0 && (
        <div className="plan-alloc">
          <div className="pa-head">Asset mix · blended {d.blendedReturn.toFixed(1)}% vs {RATES.inflation}% inflation</div>
          <div className="pa-bar">{d.allocation.map((a) => <span key={a.k} style={{ width: a.pct + "%", background: a.color }} title={a.k} />)}</div>
          <div className="pa-legend">{d.allocation.map((a) => <span key={a.k}><i style={{ background: a.color }} />{a.k} {Math.round(a.pct)}%</span>)}</div>
        </div>
      )}
      <div className="plan-cards">
        {insights.map((c, i) => (
          <div className={"pcard " + c.level} key={i}>
            <span className="pc-tag">{c.tagText}</span>
            <b>{c.title}</b>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Goals({ d, addGoal, delGoal }) {
  const [open, setOpen] = useState(false);
  const [g, setG] = useState({ name: "", cost: 0, dp: 20, rate: 13, tenure: 10, years: 3 });
  const create = () => {
    if (!g.name.trim() || g.cost <= 0) return;
    addGoal({ ...g, name: g.name.trim() });
    setG({ name: "", cost: 0, dp: 20, rate: 13, tenure: 10, years: 3 });
    setOpen(false);
  };
  return (
    <>
      {d.goals.length === 0 && <p className="m-empty">No goals yet. Add a flat, car, or anything you're saving for.</p>}
      {d.goals.map((goal) => {
        const e = goalEval(goal, d.surplus, d.monthlyIncome, d.totalEMI);
        return (
          <div className={"plan-goal " + e.level} key={goal.id}>
            <div className="pg-top"><b>{goal.name}</b><button className="pg-del" onClick={() => delGoal(goal.id)}><Trash2 size={15} /></button></div>
            <div className="pg-cost">{big(goal.cost)} · {goal.years}y away</div>
            <div className="pg-math">
              <span>Save <b>{tk(e.reqSave)}</b>/mo</span>
              <span>EMI <b>{tk(e.loanEMI)}</b></span>
              <span>Interest <b className="warn">{big(e.totalInterest)}</b></span>
            </div>
            <div className={"pg-verdict " + e.level}>{e.verdict}</div>
          </div>
        );
      })}
      {open ? (
        <div className="m-bform">
          <input placeholder="Goal (e.g. Flat, Car, Hajj)" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          <div className="m-bform-row">
            <span className="m-money"><i>৳</i><input inputMode="numeric" placeholder="Total cost" value={g.cost || ""} onChange={(e) => setG({ ...g, cost: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} /></span>
          </div>
          <div className="pg-inputs">
            <label>Down %<input value={g.dp} onChange={(e) => setG({ ...g, dp: +e.target.value || 0 })} /></label>
            <label>Buy in (y)<input value={g.years} onChange={(e) => setG({ ...g, years: +e.target.value || 1 })} /></label>
            <label>Loan %<input value={g.rate} onChange={(e) => setG({ ...g, rate: +e.target.value || 0 })} /></label>
            <label>Loan (y)<input value={g.tenure} onChange={(e) => setG({ ...g, tenure: +e.target.value || 1 })} /></label>
          </div>
          <div className="m-bform-actions">
            <button className="ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="primary" onClick={create}>Add goal</button>
          </div>
        </div>
      ) : (
        <button className="m-create" onClick={() => setOpen(true)}><Plus size={18} /> Add a goal</button>
      )}
    </>
  );
}

function Future({ d }) {
  const [years, setYears] = useState(10);
  const [invest, setInvest] = useState(Math.round(Math.min(0.2 * d.monthlyIncome * 12, 1000000) * 0.5));
  const series = projectSeries(d.netWorth, d.surplus * 12, d.blendedReturn, years);
  const end = series[series.length - 1];
  const annualTaxable = d.monthlyIncome * 12;
  const tax = taxBD(annualTaxable, invest);

  const W = 380, H = 170, PL = 6, PR = 6, PT = 14, PB = 22;
  const vals = series.flatMap((p) => [p.nom, p.real]);
  const yMax = Math.max(...vals, 1), yMin = Math.min(...vals, 0);
  const xx = (i) => PL + (i / years) * (W - PL - PR);
  const yy = (v) => PT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PT - PB);
  const path = (key) => series.map((p, i) => (i ? "L" : "M") + xx(p.y).toFixed(1) + " " + yy(p[key]).toFixed(1)).join(" ");

  return (
    <>
      <div className="plan-sec">Net worth in {years} years</div>
      <input className="plan-range" type="range" min="5" max="20" value={years} onChange={(e) => setYears(+e.target.value)} />
      <svg viewBox={`0 0 ${W} ${H}`} className="m-line">
        <path d={path("nom")} className="m-lpath" />
        <path d={path("real")} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" />
        {series.length && <circle cx={xx(years)} cy={yy(end.nom)} r="4.5" className="m-ldot" />}
      </svg>
      <div className="plan-projstats">
        <div><span>In {years}y (nominal)</span><b className="pos">{big(end.nom)}</b></div>
        <div><span>Today's value</span><b>{big(end.real)}</b></div>
      </div>
      <p className="plan-note">Assumes your {tk(d.surplus * 12)}/yr surplus stays invested at your {d.blendedReturn.toFixed(1)}% blended return. Dashed line is the same wealth after {RATES.inflation}% inflation.</p>

      <div className="plan-sec">Income tax · FY2026-27 <span className="plan-badge">estimate</span></div>
      <div className="plan-tax">
        <div className="pt-row"><span>Annual taxable income</span><b>{tk(annualTaxable)}</b></div>
        <div className="pt-row"><span>Rebate-eligible investment</span><span className="m-money sm"><i>৳</i><input inputMode="numeric" value={invest} onChange={(e) => setInvest(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span></div>
        <div className="pt-row"><span>Tax before rebate</span><b>{tk(tax.gross)}</b></div>
        <div className="pt-row"><span>Rebate (15%)</span><b className="pos">−{tk(tax.rebate)}</b></div>
        <div className="pt-row total"><span>Estimated tax</span><b>{tk(tax.net)}</b></div>
      </div>
      <p className="plan-note">Sanchayapatra/DPS earn ~{RATES.sanchayapatra}% <i>and</i> cut this bill via the 15% rebate. Verify slabs with the NBR.</p>
    </>
  );
}
