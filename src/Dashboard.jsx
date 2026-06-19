import React, { useState, useMemo, useEffect } from "react";
import Marketplace from "./components/Marketplace.jsx";

// ============================================================================
//  TAKA COMPASS — a personal financial planner tuned to Bangladesh
//  Tracks income, expense, assets, loans → analyses cash flow, net worth,
//  inflation-real growth, tax, and plans big purchases (car / flat).
//  Defaults reflect mid-2026 BD rates. NOT financial advice — see footer.
// ============================================================================

// --- Bangladesh reference rates (mid-2026, editable in the Context bar) -----
const BD = {
  inflation: 9.4,        // BBS, ~May 2026
  sanchayapatra: 11.83,  // 5-yr Bangladesh Savings Certificate (≤7.5 lakh)
  dps: 10.0,             // typical bank DPS
  fdr: 9.0,              // typical FDR
  homeLoan: 13.0,        // market-based, ~12–13%
  carLoan: 13.5,         // auto/personal
  policy: 10.0,          // Bangladesh Bank policy rate
  taxFree: 375000,       // FY2026-27 individual threshold
};

// FY2026-27 individual slabs (5% entry slab abolished → first taxable rate 10%)
const TAX_SLABS = [
  { width: 375000, rate: 0 },
  { width: 300000, rate: 0.10 },
  { width: 400000, rate: 0.15 },
  { width: 500000, rate: 0.20 },
  { width: 2000000, rate: 0.25 },
  { width: Infinity, rate: 0.30 },
];

const fmt = (n, d = 0) =>
  n === null || n === undefined || isNaN(n)
    ? "—"
    : Math.round(n * 10 ** d) / 10 ** d === 0 ? "0"
    : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const tk = (n) => "৳" + fmt(n);
// Bangladeshi short scale: lakh (1e5) / crore (1e7)
const big = (n) => {
  const a = Math.abs(n);
  if (a >= 1e7) return "৳" + fmt(n / 1e7, 2) + " Cr";
  if (a >= 1e5) return "৳" + fmt(n / 1e5, 2) + " L";
  return tk(n);
};

const num = (v, fb) => (typeof v === "number" && !isNaN(v) ? v : fb);

let _id = 1;
const uid = () => ++_id;

function emi(P, annualRatePct, years) {
  if (P <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function taxBD(taxable, eligibleInvest, rates) {
  if (taxable <= rates.taxFree) return { gross: 0, rebate: 0, net: 0, eff: 0 };
  // progressive — first slab uses live threshold, rest from table
  let remaining = taxable, gross = 0;
  const slabs = [{ width: rates.taxFree, rate: 0 }, ...TAX_SLABS.slice(1)];
  for (const s of slabs) {
    const band = Math.min(remaining, s.width);
    gross += band * s.rate;
    remaining -= band;
    if (remaining <= 0) break;
  }
  const allowable = Math.min(eligibleInvest, 0.2 * taxable, 1000000);
  const rebate = 0.15 * allowable;
  const net = Math.max(gross - rebate, 5000);
  return { gross, rebate, net, eff: taxable > 0 ? (net / taxable) * 100 : 0, allowable };
}

const seed = {
  income: [
    { id: uid(), name: "Salary (IDLC)", amt: 120000 },
    { id: uid(), name: "Workshop business", amt: 60000 },
  ],
  expenses: [
    { id: uid(), name: "Rent", amt: 25000, ess: true },
    { id: uid(), name: "Food & groceries", amt: 25000, ess: true },
    { id: uid(), name: "Utilities & internet", amt: 8000, ess: true },
    { id: uid(), name: "Transport", amt: 10000, ess: true },
    { id: uid(), name: "Family support", amt: 15000, ess: true },
    { id: uid(), name: "Lifestyle & dining", amt: 12000, ess: false },
  ],
  assets: [
    { id: uid(), name: "Cash & current a/c", amt: 400000, ret: 1, kind: "Liquid" },
    { id: uid(), name: "FDR", amt: 500000, ret: 9, kind: "Liquid" },
    { id: uid(), name: "Sanchayapatra", amt: 1000000, ret: 11.83, kind: "Fixed-income" },
    { id: uid(), name: "DPS", amt: 300000, ret: 10, kind: "Fixed-income" },
    { id: uid(), name: "DSE stocks", amt: 600000, ret: 15, kind: "Equity" },
    { id: uid(), name: "Gold", amt: 800000, ret: 8, kind: "Gold" },
    { id: uid(), name: "Provident fund", amt: 700000, ret: 10, kind: "Fixed-income" },
  ],
  loans: [
    { id: uid(), name: "Car loan", bal: 600000, rate: 13.5, emi: 18000, years: 3 },
  ],
  goals: [
    { id: uid(), name: "Flat in Dhaka", cost: 8000000, dp: 25, rate: 13, tenure: 20, years: 5 },
    { id: uid(), name: "Car upgrade", cost: 2500000, dp: 20, rate: 13.5, tenure: 5, years: 2 },
  ],
};

const TABS = ["Cash flow", "Net worth", "Goals", "Marketplace", "Insights", "Projection"];

export default function Dashboard({ initial, onPersist, user, onSignOut }) {
  const [rates, setRates] = useState(BD);
  const [income, setIncome] = useState(initial?.income ?? seed.income);
  const [expenses, setExpenses] = useState(initial?.expenses ?? seed.expenses);
  const [assets, setAssets] = useState(initial?.assets ?? seed.assets);
  const [loans, setLoans] = useState(initial?.loans ?? seed.loans);
  const [goals, setGoals] = useState(initial?.goals ?? seed.goals);
  const [tab, setTab] = useState("Cash flow");
  const [taxInvest, setTaxInvest] = useState(360000);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncMsg, setSyncMsg] = useState("");

  const syncRates = async () => {
    try {
      setSyncMsg("syncing…");
      const res = await fetch("rates.json?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("no rates file");
      const d = await res.json();
      setRates((r) => ({
        ...r,
        inflation: num(d.inflation, r.inflation),
        sanchayapatra: num(d.sanchayapatra, r.sanchayapatra),
        dps: num(d.dps, r.dps),
        fdr: num(d.fdr, r.fdr),
        homeLoan: num(d.homeLoan, r.homeLoan),
        carLoan: num(d.carLoan, r.carLoan),
        policy: num(d.policy, r.policy),
        taxFree: num(d.taxFree, r.taxFree),
      }));
      setLastSynced(d.lastSynced || new Date().toISOString().slice(0, 10));
      setSyncMsg("");
    } catch (e) {
      setSyncMsg("built-in rates · deploy to enable daily sync");
    }
  };

  useEffect(() => {
    if (autoSync) syncRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  useEffect(() => {
    onPersist?.({ income, expenses, assets, loans, goals });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, expenses, assets, loans, goals]);

  // ---- derived totals ----
  const totalIncome = income.reduce((s, x) => s + x.amt, 0);
  const totalExp = expenses.reduce((s, x) => s + x.amt, 0);
  const essExp = expenses.filter((x) => x.ess).reduce((s, x) => s + x.amt, 0);
  const totalEMI = loans.reduce((s, x) => s + x.emi, 0);
  const surplus = totalIncome - totalExp - totalEMI;
  const savingsRate = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;
  const dti = totalIncome > 0 ? (totalEMI / totalIncome) * 100 : 0;

  const totalAssets = assets.reduce((s, x) => s + x.amt, 0);
  const totalDebt = loans.reduce((s, x) => s + x.bal, 0);
  const netWorth = totalAssets - totalDebt;
  const liquid = assets.filter((a) => a.kind === "Liquid").reduce((s, a) => s + a.amt, 0);
  const emMonths = essExp > 0 ? liquid / essExp : 0;
  const blendedRet = totalAssets > 0 ? assets.reduce((s, a) => s + a.amt * a.ret, 0) / totalAssets : 0;
  const realRet = ((1 + blendedRet / 100) / (1 + rates.inflation / 100) - 1) * 100;

  const idleCash = Math.max(0, liquid - essExp * 6);
  const bigGoal = goals.slice().sort((a, b) => b.cost - a.cost)[0];
  const goalLoan = bigGoal
    ? {
        amount: bigGoal.cost * (1 - bigGoal.dp / 100),
        years: bigGoal.tenure,
        cat: /flat|home|house|apart/i.test(bigGoal.name) ? "home-loan"
          : /car|auto/i.test(bigGoal.name) ? "car-loan" : "personal-loan",
      }
    : null;

  const annualTaxable = totalIncome * 12;
  const tax = taxBD(annualTaxable, taxInvest, rates);

  // allocation by kind
  const byKind = useMemo(() => {
    const m = {};
    assets.forEach((a) => (m[a.kind] = (m[a.kind] || 0) + a.amt));
    return Object.entries(m).map(([k, v]) => ({ k, v, pct: totalAssets > 0 ? (v / totalAssets) * 100 : 0 }))
      .sort((a, b) => b.v - a.v);
  }, [assets, totalAssets]);

  const insights = buildInsights({
    surplus, savingsRate, dti, liquid, essExp, emMonths, loans, assets,
    totalAssets, blendedRet, realRet, rates, byKind, taxInvest, tax, totalIncome,
  });

  // ---- row helpers ----
  const mut = (setter) => (id, k, v) =>
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, [k]: k === "name" ? v : (typeof v === "boolean" ? v : parseFloat(v) || 0) } : r)));
  const rmRow = (setter) => (id) => setter((rows) => rows.filter((r) => r.id !== id));
  const mI = mut(setIncome), mE = mut(setExpenses), mA = mut(setAssets), mL = mut(setLoans), mG = mut(setGoals);

  return (
    <div className="app">
      <style>{css}</style>

      <header className="hd">
        <div className="logo">
          <span className="coin">৳</span>
          <div>
            <h1>Taka Compass</h1>
            <p>Personal financial planner · Bangladesh</p>
          </div>
        </div>
        <div className="hd-right">
          {user && (
            <div className="userchip">
              {user.picture ? <img src={user.picture} alt="" /> : <span className="uava">{(user.name || "U")[0]}</span>}
              <span className="uname">{user.name}</span>
              <button className="signout" onClick={onSignOut}>Sign out</button>
            </div>
          )}
          <div className="ctx">
          <Ctx label="Inflation" v={rates.inflation} onC={(x) => setRates((r) => ({ ...r, inflation: x }))} suf="%" />
          <Ctx label="Sanchayapatra" v={rates.sanchayapatra} onC={(x) => setRates((r) => ({ ...r, sanchayapatra: x }))} suf="%" />
          <Ctx label="Home loan" v={rates.homeLoan} onC={(x) => setRates((r) => ({ ...r, homeLoan: x }))} suf="%" />
          <Ctx label="Policy rate" v={rates.policy} onC={(x) => setRates((r) => ({ ...r, policy: x }))} suf="%" />
          </div>
        </div>
      </header>

      {/* sticky summary */}
      <div className="summary">
        <Stat label="Net worth" value={big(netWorth)} tone={netWorth >= 0 ? "good" : "bad"} />
        <Stat label="Monthly surplus" value={tk(surplus)} sub={fmt(savingsRate, 0) + "% of income"} tone={surplus > 0 ? "good" : "bad"} />
        <Stat label="Emergency fund" value={fmt(emMonths, 1) + " mo"} sub={emMonths >= 6 ? "covered" : "build to 6"} tone={emMonths >= 6 ? "good" : emMonths >= 3 ? "warn" : "bad"} />
        <Stat label="Debt / income" value={fmt(dti, 0) + "%"} sub={dti <= 36 ? "healthy" : dti <= 40 ? "tight" : "stretched"} tone={dti <= 36 ? "good" : dti <= 40 ? "warn" : "bad"} />
        <Stat label="Real growth" value={(realRet >= 0 ? "+" : "") + fmt(realRet, 1) + "%"} sub={"after " + fmt(rates.inflation, 1) + "% inflation"} tone={realRet >= 0 ? "good" : "bad"} />
      </div>

      <div className="syncstrip">
        <label className="swtog">
          <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
          <span className="track"><span className="knob" /></span>
          Auto-sync BD rates daily
        </label>
        <span className="syncstate">{lastSynced ? "synced " + lastSynced : (syncMsg || "built-in rates")}</span>
        <button className="syncnow" onClick={syncRates}>Sync now</button>
        <span className="syncnote">Rates load from your deployed <code>rates.json</code>, refreshed daily by the bundled GitHub Action.</span>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      {tab === "Cash flow" && (
        <div className="grid2">
          <Panel title="Money in" accent="#34d399"
            foot={<b className="ptot good">{tk(totalIncome)}/mo</b>}
            onAdd={() => setIncome((r) => [...r, { id: uid(), name: "New source", amt: 0 }])}>
            {income.map((r) => (
              <Line key={r.id} name={r.name} amt={r.amt}
                onName={(v) => mI(r.id, "name", v)} onAmt={(v) => mI(r.id, "amt", v)} onDel={() => rmRow(setIncome)(r.id)} />
            ))}
          </Panel>

          <Panel title="Money out" accent="#f06a6a"
            foot={<b className="ptot bad">{tk(totalExp + totalEMI)}/mo</b>}
            onAdd={() => setExpenses((r) => [...r, { id: uid(), name: "New expense", amt: 0, ess: true }])}>
            {expenses.map((r) => (
              <Line key={r.id} name={r.name} amt={r.amt}
                onName={(v) => mE(r.id, "name", v)} onAmt={(v) => mE(r.id, "amt", v)} onDel={() => rmRow(setExpenses)(r.id)}
                tag={<button className={"ess" + (r.ess ? " on" : "")} onClick={() => mE(r.id, "ess", !r.ess)} title="Essential cost?">{r.ess ? "essential" : "lifestyle"}</button>} />
            ))}
            {loans.map((l) => (
              <Line key={l.id} name={l.name + " (EMI)"} amt={l.emi} readOnly tag={<span className="ess lock">loan</span>} />
            ))}
          </Panel>

          <div className="flowbar">
            <div className="fb"><span>In</span><b className="good">{tk(totalIncome)}</b></div>
            <span className="op">−</span>
            <div className="fb"><span>Out</span><b className="bad">{tk(totalExp + totalEMI)}</b></div>
            <span className="op">=</span>
            <div className={"fb big " + (surplus >= 0 ? "good" : "bad")}><span>Surplus / month</span><b>{tk(surplus)}</b></div>
          </div>
        </div>
      )}

      {tab === "Net worth" && (
        <div className="grid2">
          <Panel title="Assets" accent="#34d399"
            foot={<b className="ptot good">{big(totalAssets)}</b>}
            onAdd={() => setAssets((r) => [...r, { id: uid(), name: "New asset", amt: 0, ret: rates.fdr, kind: "Liquid" }])}>
            {assets.map((a) => (
              <div className="arow" key={a.id}>
                <input className="cell name" value={a.name} onChange={(e) => mA(a.id, "name", e.target.value)} />
                <select className="cell kind" value={a.kind} onChange={(e) => mA(a.id, "kind", e.target.value)}>
                  {["Liquid", "Fixed-income", "Equity", "Gold", "Property", "Other"].map((k) => <option key={k}>{k}</option>)}
                </select>
                <input className="cell num" value={a.amt} onChange={(e) => mA(a.id, "amt", e.target.value)} />
                <span className="ret"><input className="cell ret" value={a.ret} onChange={(e) => mA(a.id, "ret", e.target.value)} />%</span>
                <button className="x" onClick={() => rmRow(setAssets)(a.id)}>×</button>
              </div>
            ))}
          </Panel>

          <Panel title="Loans" accent="#f06a6a"
            foot={<b className="ptot bad">{big(totalDebt)}</b>}
            onAdd={() => setLoans((r) => [...r, { id: uid(), name: "New loan", bal: 0, rate: rates.carLoan, emi: 0, years: 3 }])}>
            {loans.map((l) => (
              <div className="lrow" key={l.id}>
                <input className="cell name" value={l.name} onChange={(e) => mL(l.id, "name", e.target.value)} />
                <span className="lf"><label>Balance</label><input className="cell num" value={l.bal} onChange={(e) => mL(l.id, "bal", e.target.value)} /></span>
                <span className="lf"><label>Rate%</label><input className="cell ret" value={l.rate} onChange={(e) => mL(l.id, "rate", e.target.value)} /></span>
                <span className="lf"><label>EMI</label><input className="cell num" value={l.emi} onChange={(e) => mL(l.id, "emi", e.target.value)} /></span>
                <button className="x" onClick={() => rmRow(setLoans)(l.id)}>×</button>
              </div>
            ))}
            {loans.length === 0 && <p className="empty">Debt-free. Nothing here is a good thing.</p>}
          </Panel>

          <div className="alloc">
            <div className="allochd">Asset allocation · blended return <b className="good">{fmt(blendedRet, 1)}%</b> vs inflation {fmt(rates.inflation, 1)}%</div>
            <div className="allocbar">
              {byKind.map((b) => (
                <span key={b.k} className={"seg seg-" + b.k.replace(/[^a-z]/gi, "")} style={{ width: b.pct + "%" }} title={b.k + " " + fmt(b.pct, 0) + "%"} />
              ))}
            </div>
            <div className="alloclegend">
              {byKind.map((b) => (
                <span key={b.k} className="lg"><i className={"dot seg-" + b.k.replace(/[^a-z]/gi, "")} />{b.k} {fmt(b.pct, 0)}% · {big(b.v)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Goals" && (
        <div className="goals">
          <div className="goalsadd">
            <button className="btn add" onClick={() => setGoals((g) => [...g, { id: uid(), name: "New goal", cost: 1000000, dp: 20, rate: rates.carLoan, tenure: 5, years: 3 }])}>+ Add a goal</button>
            <span className="hint">Affordability assumes total EMIs should stay ≤ 40% of income.</span>
          </div>
          {goals.map((g) => (
            <GoalCard key={g.id} g={g} surplus={surplus} totalIncome={totalIncome} curEMI={totalEMI}
              onC={(k, v) => mG(g.id, k, v)} onDel={() => rmRow(setGoals)(g.id)} />
          ))}
        </div>
      )}

      {tab === "Insights" && (
        <div className="insights">
          <div className="taxcard">
            <div className="taxhd">
              <h3>Income tax estimate · FY2026-27</h3>
              <span className="badge">estimate — verify with NBR</span>
            </div>
            <div className="taxgrid">
              <Field label="Annual taxable income" v={annualTaxable} readOnly note="= monthly income × 12 (edit incomes to change)" />
              <Field label="Annual rebate-eligible investment" v={taxInvest} onChange={setTaxInvest} note="Sanchayapatra, DPS, life insurance, DSE — capped at 20% of income / ৳10L" />
              <Field label="Tax before rebate" v={Math.round(tax.gross)} readOnly />
              <Field label="Investment rebate (15%)" v={Math.round(tax.rebate)} readOnly accent="#34d399" />
              <Field label="Estimated tax payable" v={Math.round(tax.net)} readOnly accent="#f0b042" big />
              <Field label="Effective rate" v={fmt(tax.eff, 1)} suf="%" readOnly />
            </div>
            <p className="taxnote">The rebate is why Sanchayapatra & DPS do double duty in BD — return <i>and</i> a tax cut. Maxing rebate-eligible investments to ~{big(Math.min(0.2 * annualTaxable, 1000000))} this year would shave roughly {tk(Math.round(0.15 * Math.min(0.2 * annualTaxable, 1000000) - tax.rebate))} more off your bill.</p>
          </div>

          <h3 className="ih">What your numbers are telling you</h3>
          <div className="cards">
            {insights.map((c, i) => (
              <div className={"icard " + c.level} key={i}>
                <div className="ictop"><span className="ilevel">{c.tagText}</span><b>{c.title}</b></div>
                <p>{c.body}</p>
              </div>
            ))}
          </div>

          <div className="ladder">
            <h3 className="ih">Where each surplus taka should go — the BD waterfall</h3>
            <ol>
              <li><b>Emergency fund first.</b> 6 months of essentials ({big(essExp * 6)}) in liquid FDR/savings before anything else.</li>
              <li><b>Kill debt above ~12%.</b> Prepaying a {fmt(rates.homeLoan, 0)}%-ish loan is a guaranteed, tax-free return no deposit can match.</li>
              <li><b>Max the tax-advantaged tier.</b> Sanchayapatra (~{fmt(rates.sanchayapatra, 1)}%) and DPS — they beat inflation <i>and</i> earn a 15% rebate.</li>
              <li><b>Diversify for real growth.</b> DSE equity + gold, sized to your risk, to pull blended return above the {fmt(rates.inflation, 1)}% inflation line.</li>
              <li><b>Then the big asset.</b> Down-payment savings for the flat/car goal, only once 1–4 are on track.</li>
            </ol>
          </div>
        </div>
      )}

      {tab === "Marketplace" && (
        <Marketplace idleCash={idleCash} goalLoan={goalLoan} rates={rates} />
      )}

      {tab === "Projection" && (
        <Projection netWorth={netWorth} surplus={surplus} blendedRet={blendedRet} inflation={rates.inflation} />
      )}

      <footer className="ft">
        <p><b>Not financial advice.</b> Every figure here is arithmetic on the numbers you enter, using mid-2026 Bangladesh reference rates you can edit in the top bar. Tax is an estimate of the FY2026-27 structure — confirm slabs, the rebate cap and your eligible investments with the NBR or a tax advisor. Sanchayapatra/loan rates change; re-check before acting. I'm not a licensed financial advisor.</p>
      </footer>
    </div>
  );
}

// ---------------- insight engine ----------------
function buildInsights(s) {
  const out = [];
  const idleCash = Math.max(0, s.liquid - s.essExp * 6);
  const lvl = { alert: { o: 0, t: "ACT NOW" }, warn: { o: 1, t: "ATTENTION" }, opp: { o: 2, t: "OPPORTUNITY" }, ok: { o: 3, t: "ON TRACK" } };

  if (s.surplus < 0) {
    out.push(card("alert", "You're running a monthly deficit", `Spending exceeds income by ${tk(-s.surplus)} a month. Nothing else matters until this closes — trim the largest non-essential lines or lift income before adding any goal or investment.`));
  }

  if (s.emMonths < 3) {
    out.push(card("alert", "Emergency fund is thin", `Liquid savings cover only ${fmt(s.emMonths, 1)} months of essentials. Aim for 6 months (${big(s.essExp * 6)}) in FDR/savings before locking money into Sanchayapatra or stocks — illiquid is useless in a crisis.`));
  } else if (s.emMonths < 6) {
    out.push(card("warn", "Top up the emergency fund", `You have ${fmt(s.emMonths, 1)} months of cover; 6 is the floor for a single-income-plus-business household. ${big(s.essExp * 6 - s.liquid)} more gets you there.`));
  }

  // high-cost debt vs idle cash
  const pricey = s.loans.filter((l) => l.rate >= 12).sort((a, b) => b.rate - a.rate)[0];
  if (pricey && idleCash > 0) {
    out.push(card("opp", "Prepay debt with your idle cash", `Your ${pricey.name} costs ${fmt(pricey.rate, 1)}%. You hold ${big(idleCash)} above your emergency buffer earning far less. Prepaying is a guaranteed ${fmt(pricey.rate, 1)}% "return" — better than any deposit, and it frees up the ${tk(pricey.emi)} EMI.`));
  }

  // idle cash inflation drag
  if (idleCash > 50000) {
    const drag = idleCash * (s.rates.inflation - 1) / 100;
    out.push(card("warn", "Idle cash is quietly shrinking", `About ${big(idleCash)} sits beyond your emergency buffer earning near-zero. At ${fmt(s.rates.inflation, 1)}% inflation that's roughly ${tk(Math.round(drag))} of purchasing power lost this year. Move it to Sanchayapatra (~${fmt(s.rates.sanchayapatra, 1)}%) or at least FDR.`));
  }

  // inflation beat
  if (s.realRet < 0) {
    out.push(card("warn", "Your wealth is losing to inflation", `Blended return ${fmt(s.blendedRet, 1)}% trails ${fmt(s.rates.inflation, 1)}% inflation, so in real terms the portfolio shrinks ~${fmt(-s.realRet, 1)}% a year. Tilt more into Sanchayapatra and a measured DSE/gold allocation to get above the line.`));
  } else if (s.realRet >= 2) {
    out.push(card("ok", "Beating inflation in real terms", `Blended ${fmt(s.blendedRet, 1)}% return clears inflation by ${fmt(s.realRet, 1)} points. Your money is genuinely growing — keep the mix and avoid drifting back into idle cash.`));
  }

  // concentration
  const big1 = s.byKind[0];
  if (big1 && big1.pct > 50) {
    out.push(card("warn", `Over-concentrated in ${big1.k.toLowerCase()}`, `${fmt(big1.pct, 0)}% of assets sit in one bucket (${big1.k}). One bad year there hits your whole net worth. Spread across fixed-income, equity and gold so no single class can sink you.`));
  }

  // tax-advantaged room
  const room = Math.min(0.2 * s.totalIncome * 12, 1000000) - s.taxInvest;
  if (s.surplus > 0 && room > 20000) {
    out.push(card("opp", "Unused tax-rebate room", `You can still route about ${big(room)} into rebate-eligible Sanchayapatra/DPS this year. That earns ~${fmt(s.rates.sanchayapatra, 1)}% and trims ~${tk(Math.round(0.15 * room))} off your tax — among the best risk-free moves available in BD.`));
  }

  // dti
  if (s.dti > 40) {
    out.push(card("alert", "You're over-leveraged", `EMIs eat ${fmt(s.dti, 0)}% of income (40% is the comfort ceiling). Taking on a flat or car loan now would be a stretch — clear or shrink existing debt first.`));
  }

  // savings rate
  if (s.surplus >= 0 && s.savingsRate < 20) {
    out.push(card("warn", "Savings rate is low", `You're saving ${fmt(s.savingsRate, 0)}% of income. For your big goals (flat, car) 25–30% is the zone — find it in the lifestyle lines or new income from the workshop.`));
  } else if (s.savingsRate >= 25) {
    out.push(card("ok", "Strong savings rate", `Saving ${fmt(s.savingsRate, 0)}% of income gives you real firepower for goals. The job now is deploying it well, not saving harder.`));
  }

  out.sort((a, b) => lvl[a.level].o - lvl[b.level].o);
  out.forEach((c) => (c.tagText = lvl[c.level].t));
  return out;
  function card(level, title, body) { return { level, title, body, tagText: "" }; }
}

// ---------------- goal card ----------------
function GoalCard({ g, surplus, totalIncome, curEMI, onC, onDel }) {
  const dpAmt = g.cost * g.dp / 100;
  const loanAmt = g.cost - dpAmt;
  const months = Math.max(1, g.years * 12);
  const reqSave = dpAmt / months;
  const loanEMI = emi(loanAmt, g.rate, g.tenure);
  const totalInterest = loanEMI * g.tenure * 12 - loanAmt;
  const dtiAfter = totalIncome > 0 ? ((curEMI + loanEMI) / totalIncome) * 100 : 0;
  const saveGap = reqSave - surplus;

  let verdict, vlevel;
  if (saveGap > 0) { verdict = `Saving gap of ${tk(Math.round(saveGap))}/mo — at your current surplus the down payment lands later than ${g.years}y. Extend the timeline, lift surplus, or lower the target.`; vlevel = "warn"; }
  else if (dtiAfter > 40) { verdict = `Down payment is reachable, but the ${tk(Math.round(loanEMI))} EMI pushes total debt to ${fmt(dtiAfter, 0)}% of income — above the 40% comfort line. Bigger down payment or longer tenure eases it.`; vlevel = "warn"; }
  else { verdict = `On track. Setting aside ${tk(Math.round(reqSave))}/mo covers the down payment in ${g.years}y, and the ${tk(Math.round(loanEMI))} EMI keeps total debt at a healthy ${fmt(dtiAfter, 0)}% of income.`; vlevel = "ok"; }

  return (
    <div className={"goalcard " + vlevel}>
      <div className="goaltop">
        <input className="cell goalname" value={g.name} onChange={(e) => onC("name", e.target.value)} />
        <button className="x" onClick={onDel}>×</button>
      </div>
      <div className="goalinputs">
        <GField label="Total cost" v={g.cost} onChange={(v) => onC("cost", v)} />
        <GField label="Down pmt %" v={g.dp} onChange={(v) => onC("dp", v)} suf="%" />
        <GField label="Loan rate %" v={g.rate} onChange={(v) => onC("rate", v)} suf="%" />
        <GField label="Loan years" v={g.tenure} onChange={(v) => onC("tenure", v)} />
        <GField label="Buy in (yrs)" v={g.years} onChange={(v) => onC("years", v)} />
      </div>
      <div className="goalmath">
        <M label="Down payment" v={big(dpAmt)} />
        <M label="Save / month" v={tk(Math.round(reqSave))} hot />
        <M label="Loan amount" v={big(loanAmt)} />
        <M label="Loan EMI" v={tk(Math.round(loanEMI))} hot />
        <M label="Total interest" v={big(totalInterest)} warn />
        <M label="Debt after" v={fmt(dtiAfter, 0) + "% of income"} />
      </div>
      <div className={"verdict " + vlevel}>{verdict}</div>
    </div>
  );
}

// ---------------- projection chart ----------------
function projectSeries(nw, annualAdd, growth, infl, years) {
  const pts = [{ y: 0, nom: nw, real: nw }];
  let v = nw;
  for (let i = 1; i <= years; i++) {
    v = v * (1 + growth / 100) + annualAdd;
    pts.push({ y: i, nom: v, real: v / Math.pow(1 + infl / 100, i) });
  }
  return pts;
}

function Projection({ netWorth, surplus, blendedRet, inflation }) {
  const [years, setYears] = useState(10);
  const annualAdd = surplus * 12;
  const series = projectSeries(netWorth, annualAdd, blendedRet, inflation, years);
  const end = series[series.length - 1];
  const W = 720, H = 320, PL = 70, PR = 18, PT = 18, PB = 34;
  const vals = series.flatMap((p) => [p.nom, p.real]);
  const yMax = Math.max(...vals, 1), yMin = Math.min(...vals, 0);
  const xx = (i) => PL + (i / years) * (W - PL - PR);
  const yy = (v) => PT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PT - PB);
  const path = (key) => series.map((p, i) => (i ? "L" : "M") + xx(p.y).toFixed(1) + " " + yy(p[key]).toFixed(1)).join(" ");
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + (i / ticks) * (yMax - yMin));

  return (
    <div className="proj">
      <div className="projhd">
        <div>
          <h3>Net worth, projected {years} years out</h3>
          <p>Assumes your {tk(annualAdd)}/yr surplus stays invested at your {fmt(blendedRet, 1)}% blended return. The faded line is the same wealth in <b>today's</b> taka, after {fmt(inflation, 1)}% inflation.</p>
        </div>
        <label className="yearsel">Horizon
          <input type="range" min="5" max="10" value={years} onChange={(e) => setYears(+e.target.value)} />
          <b>{years}y</b>
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="xMidYMid meet">
        {tickVals.map((t, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={yy(t)} y2={yy(t)} className="grid" />
            <text x={PL - 8} y={yy(t) + 4} className="ytk" textAnchor="end">{big(t)}</text>
          </g>
        ))}
        {series.map((p) => (
          <text key={p.y} x={xx(p.y)} y={H - PB + 18} className="xtk" textAnchor="middle">{p.y}</text>
        ))}
        {yMin < 0 && <line x1={PL} x2={W - PR} y1={yy(0)} y2={yy(0)} className="zero" />}
        <path d={path("real")} className="lreal" />
        <path d={path("nom")} className="lnom" />
        {series.map((p) => <circle key={"n" + p.y} cx={xx(p.y)} cy={yy(p.nom)} r="2.5" className="dotn" />)}
        <circle cx={xx(end.y)} cy={yy(end.nom)} r="4.5" className="dotend" />
      </svg>

      <div className="leg">
        <span><i className="lk nom" />Nominal net worth</span>
        <span><i className="lk real" />In today's purchasing power</span>
      </div>

      <div className="projstats">
        <M label={`Net worth in ${years}y (nominal)`} v={big(end.nom)} hot />
        <M label="In today's purchasing power" v={big(end.real)} />
        <M label="Total you contribute" v={big(annualAdd * years)} />
        <M label="Growth on top" v={big(end.nom - netWorth - annualAdd * years)} />
      </div>
      {surplus <= 0 && <p className="projwarn">Your current surplus is {tk(surplus)} — with nothing to invest, this curve only reflects growth (or drawdown) on existing assets. Closing the cash-flow gap is what bends it upward.</p>}
      <p className="projnote">A planning projection, not a forecast — real returns vary year to year. Assumes steady contributions and return, and that existing debt amortises on schedule.</p>
    </div>
  );
}

// ---------------- little components ----------------
function Stat({ label, value, sub, tone }) {
  return (
    <div className="stat">
      <span className="slabel">{label}</span>
      <span className={"svalue " + (tone || "")}>{value}</span>
      {sub && <span className="ssub">{sub}</span>}
    </div>
  );
}
function Ctx({ label, v, onC, suf }) {
  return (
    <label className="cx">
      <span>{label}</span>
      <span className="cxin"><input value={v} onChange={(e) => onC(parseFloat(e.target.value) || 0)} />{suf}</span>
    </label>
  );
}
function Panel({ title, accent, children, foot, onAdd }) {
  return (
    <div className="panel" style={{ borderTopColor: accent }}>
      <div className="phd"><h2>{title}</h2>{onAdd && <button className="btn add" onClick={onAdd}>+</button>}</div>
      <div className="pbody">{children}</div>
      <div className="pfoot">{foot}</div>
    </div>
  );
}
function Line({ name, amt, onName, onAmt, onDel, tag, readOnly }) {
  return (
    <div className="line">
      {readOnly ? <span className="cell name ro">{name}</span> : <input className="cell name" value={name} onChange={(e) => onName(e.target.value)} />}
      {tag}
      {readOnly ? <span className="cell num ro">{tk(amt)}</span> : <input className="cell num" value={amt} onChange={(e) => onAmt(e.target.value)} />}
      {onDel ? <button className="x" onClick={onDel}>×</button> : <span className="x ph" />}
    </div>
  );
}
function Field({ label, v, onChange, readOnly, suf, note, accent, big: isBig }) {
  return (
    <label className="tf">
      <span className="tfl">{label}</span>
      <span className="tfin" style={accent ? { color: accent } : null}>
        {readOnly ? <b className={isBig ? "tfbig" : ""}>{suf ? v : tk(v)}{suf}</b>
          : <input value={v} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />}
      </span>
      {note && <span className="tfnote">{note}</span>}
    </label>
  );
}
function GField({ label, v, onChange, suf }) {
  return (
    <label className="gf"><span>{label}</span><span className="gfin"><input value={v} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />{suf}</span></label>
  );
}
function M({ label, v, hot, warn }) {
  return <div className="m"><span>{label}</span><b className={hot ? "hot" : warn ? "warn" : ""}>{v}</b></div>;
}

const css = `
.app{--bg:#f6f3ff;--p1:#ffffff;--p2:#f3eefe;--ln:#e9e1fb;--tx:#1b1438;--mut:#7d76a0;
  --good:#12b886;--warn:#f59f0a;--bad:#fa5a7d;--info:#5b8cff;--eq:#9b6bff;--acc:#7c5cff;
  background:radial-gradient(1200px 500px at 80% -10%, #ece3ff 0%, var(--bg) 60%);color:var(--tx);min-height:100vh;
  font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.45;padding:20px;max-width:1140px;margin:0 auto}
.app *{box-sizing:border-box}
input,select,button{font-family:inherit}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap}
.logo{display:flex;gap:13px;align-items:center}
.coin{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;box-shadow:0 8px 22px -8px #7c5cff}
.logo h1{margin:0;font-size:22px;letter-spacing:-.03em;font-weight:800}
.logo p{margin:1px 0 0;color:var(--mut);font-size:12.5px;font-weight:500}
.hd-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.userchip{display:flex;align-items:center;gap:8px;background:var(--p1);border:1px solid var(--ln);border-radius:999px;padding:4px 6px 4px 12px;box-shadow:0 4px 14px -10px #7c5cff}
.userchip img,.uava{width:28px;height:28px;border-radius:50%;object-fit:cover}
.uava{background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
.uname{font-size:13px;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.signout{background:none;border:none;color:var(--mut);font-size:12px;cursor:pointer;border-radius:999px;padding:5px 10px}
.signout:hover{background:var(--p2);color:var(--bad)}
.ctx{display:flex;gap:8px;flex-wrap:wrap}
.cx{display:flex;flex-direction:column;gap:3px;background:var(--p1);border:1px solid var(--ln);border-radius:13px;padding:7px 12px;min-width:96px}
.cx>span{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;font-weight:600}
.cxin{display:flex;align-items:center;font-family:ui-monospace,monospace;font-weight:700;color:var(--acc)}
.cxin input{width:42px;background:none;border:none;color:var(--acc);font:inherit;text-align:right;padding:0}
.cxin input:focus{outline:none}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:11px;margin:16px 0;
  background:var(--p1);border:1px solid var(--ln);border-radius:22px;padding:16px;box-shadow:0 16px 40px -28px #7c5cff}
.stat{display:flex;flex-direction:column;gap:2px;padding:0 8px;border-left:1px solid var(--ln)}
.stat:first-child{border-left:none}
.slabel{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;font-weight:600}
.svalue{font-size:22px;font-weight:800;font-family:ui-monospace,monospace;letter-spacing:-.02em}
.svalue.good{color:var(--good)}.svalue.bad{color:var(--bad)}.svalue.warn{color:var(--warn)}
.ssub{font-size:11.5px;color:var(--mut)}
.tabs{display:flex;gap:4px;background:var(--p1);border:1px solid var(--ln);border-radius:999px;padding:5px;width:fit-content;box-shadow:0 6px 18px -14px #7c5cff}
.tab{background:none;border:none;color:var(--mut);padding:9px 18px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:600}
.tab.on{background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff;box-shadow:0 6px 16px -8px #7c5cff}
.tab:hover:not(.on){color:var(--tx)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
@media(max-width:820px){.grid2{grid-template-columns:1fr}}
.panel{background:var(--p1);border:1px solid var(--ln);border-top-width:3px;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 14px 36px -30px #7c5cff}
.phd{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:1px solid var(--ln)}
.phd h2{margin:0;font-size:14px;font-weight:700}
.pbody{padding:8px 12px;display:flex;flex-direction:column;gap:4px}
.pfoot{padding:10px 14px;border-top:1px solid var(--ln);text-align:right;margin-top:auto}
.ptot{font-family:ui-monospace,monospace;font-size:16px;font-weight:700}.ptot.good{color:var(--good)}.ptot.bad{color:var(--bad)}
.line,.arow,.lrow{display:flex;align-items:center;gap:7px}
.cell{background:var(--p2);border:1px solid transparent;border-radius:10px;padding:7px 9px;color:var(--tx);font-size:13px}
.cell:focus{outline:none;border-color:var(--acc);background:#fff}
.cell.name{flex:1;min-width:0}.cell.name.ro{color:var(--mut);background:none}
.cell.num{width:104px;text-align:right;font-family:ui-monospace,monospace}
.cell.num.ro{background:none;color:var(--mut)}
.cell.ret{width:46px;text-align:right;font-family:ui-monospace,monospace}
.cell.kind{width:118px;cursor:pointer}.cell.kind option{background:var(--p1)}
.ret{display:flex;align-items:center;color:var(--mut);font-size:12px;font-family:ui-monospace,monospace}
.x{background:none;border:none;color:var(--mut);font-size:17px;cursor:pointer;line-height:1;width:24px;border-radius:8px;flex:none}
.x:hover{color:var(--bad);background:var(--p2)}
.x.ph{cursor:default}.x.ph:hover{background:none}
.btn{background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff;border:none;border-radius:999px;padding:8px 15px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 8px 18px -10px #7c5cff}
.btn.add{padding:5px 13px;font-size:15px;line-height:1}
.btn:hover{filter:brightness(1.05)}
.ess{background:none;border:1px solid var(--ln);color:var(--mut);font-size:10.5px;border-radius:999px;padding:3px 10px;cursor:pointer;flex:none;font-weight:600}
.ess.on{border-color:var(--info);color:var(--info);background:#eef3ff}
.ess.lock{cursor:default}
.arow .name{flex:1}.lrow{flex-wrap:wrap}
.lf{display:flex;flex-direction:column;gap:2px}.lf label{font-size:10px;color:var(--mut)}
.flowbar,.alloc{grid-column:1/-1;background:var(--p1);border:1px solid var(--ln);border-radius:20px;padding:16px 18px;box-shadow:0 14px 36px -30px #7c5cff}
.flowbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.fb{display:flex;flex-direction:column}.fb span{font-size:11px;color:var(--mut);font-weight:500}.fb b{font-size:17px;font-family:ui-monospace,monospace;font-weight:700}
.fb.big b{font-size:24px}.op{font-size:20px;color:var(--mut)}
.good{color:var(--good)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.allochd{font-size:13px;color:var(--mut);margin-bottom:10px}.allochd b{font-family:ui-monospace,monospace}
.allocbar{display:flex;height:18px;border-radius:999px;overflow:hidden;gap:2px}
.seg{height:100%}
.seg-Liquid{background:#5b8cff}.seg-Fixedincome{background:#12b886}.seg-Equity{background:#9b6bff}
.seg-Gold{background:#f59f0a}.seg-Property{background:#fa5a7d}.seg-Other{background:#94a3b8}
.alloclegend{display:flex;flex-wrap:wrap;gap:14px;margin-top:11px;font-size:12px;color:var(--mut)}
.lg{display:flex;align-items:center;gap:6px}.dot{width:10px;height:10px;border-radius:4px;display:inline-block}
.goals{margin-top:14px;display:flex;flex-direction:column;gap:13px}
.goalsadd{display:flex;align-items:center;gap:12px}.hint{color:var(--mut);font-size:12px}
.goalcard{background:var(--p1);border:1px solid var(--ln);border-left:4px solid var(--ln);border-radius:20px;padding:15px 17px;box-shadow:0 14px 36px -30px #7c5cff}
.goalcard.ok{border-left-color:var(--good)}.goalcard.warn{border-left-color:var(--warn)}
.goaltop{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.goalname{font-size:16px;font-weight:700;flex:1;background:none}
.goalinputs{display:flex;gap:14px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid var(--ln)}
.gf{display:flex;flex-direction:column;gap:3px}.gf>span:first-child{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.03em;font-weight:600}
.gfin{display:flex;align-items:center;color:var(--tx)}.gfin input{width:84px;background:var(--p2);border:1px solid var(--ln);border-radius:10px;padding:6px 8px;color:var(--tx);font-family:ui-monospace,monospace;text-align:right}
.gfin input:focus{outline:none;border-color:var(--acc)}
.goalmath{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 0}
.m{display:flex;flex-direction:column;gap:2px}.m span{font-size:11px;color:var(--mut)}
.m b{font-family:ui-monospace,monospace;font-size:15px;font-weight:700}.m b.hot{color:var(--info)}.m b.warn{color:var(--warn)}
.verdict{font-size:13px;line-height:1.5;padding:11px 13px;border-radius:14px;background:var(--p2)}
.verdict.ok{color:#0a7d5c}.verdict.warn{color:#9a6406}
.insights{margin-top:14px;display:flex;flex-direction:column;gap:18px}
.taxcard{background:var(--p1);border:1px solid var(--ln);border-radius:20px;padding:17px 19px;box-shadow:0 14px 36px -30px #7c5cff}
.taxhd{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.taxhd h3{margin:0;font-size:15px;font-weight:700}
.badge{font-size:10.5px;color:var(--warn);border:1px solid var(--warn);border-radius:999px;padding:3px 10px;font-weight:600}
.taxgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.tf{display:flex;flex-direction:column;gap:3px}
.tfl{font-size:11.5px;color:var(--mut)}
.tfin{font-family:ui-monospace,monospace;font-size:15px;font-weight:700}
.tfin input{width:100%;background:var(--p2);border:1px solid var(--ln);border-radius:11px;padding:8px 10px;color:var(--tx);font:inherit;text-align:right;font-weight:700}
.tfin input:focus{outline:none;border-color:var(--acc)}
.tfbig{font-size:19px}
.tfnote{font-size:10.5px;color:var(--mut);line-height:1.35}
.taxnote{margin:14px 0 0;font-size:12.5px;color:var(--mut);line-height:1.55;border-top:1px solid var(--ln);padding-top:12px}
.ih{font-size:16px;margin:0 0 2px;font-weight:800;letter-spacing:-.02em}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px}
.icard{background:var(--p1);border:1px solid var(--ln);border-left:4px solid var(--mut);border-radius:18px;padding:14px 16px;box-shadow:0 14px 36px -30px #7c5cff}
.icard.alert{border-left-color:var(--bad)}.icard.warn{border-left-color:var(--warn)}
.icard.opp{border-left-color:var(--good)}.icard.ok{border-left-color:var(--info)}
.ictop{display:flex;flex-direction:column;gap:3px;margin-bottom:6px}
.ilevel{font-size:10px;font-weight:800;letter-spacing:.07em;color:var(--mut)}
.icard.alert .ilevel{color:var(--bad)}.icard.warn .ilevel{color:var(--warn)}
.icard.opp .ilevel{color:var(--good)}.icard.ok .ilevel{color:var(--info)}
.ictop b{font-size:14px;font-weight:700}
.icard p{margin:0;font-size:12.8px;color:var(--mut);line-height:1.5}
.ladder ol{margin:8px 0 0;padding-left:20px}
.ladder li{margin-bottom:8px;font-size:13px;color:var(--mut);line-height:1.5}
.ladder li b{color:var(--tx)}
.empty{color:var(--mut);font-size:13px;padding:8px 4px}
.ft{margin-top:20px;background:var(--p1);border:1px solid var(--ln);border-radius:18px;padding:15px 17px}
.ft p{margin:0;font-size:12px;color:var(--mut);line-height:1.55}.ft b{color:var(--tx)}
.syncstrip{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px;background:var(--p1);border:1px solid var(--ln);border-radius:16px;padding:10px 15px;box-shadow:0 10px 28px -24px #7c5cff}
.swtog{display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer;user-select:none;position:relative;font-weight:600}
.swtog input{position:absolute;opacity:0;width:0;height:0}
.track{width:38px;height:22px;border-radius:999px;background:var(--ln);position:relative;transition:background .15s;flex:none}
.knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.15s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.swtog input:checked+.track{background:linear-gradient(135deg,#7c5cff,#5b8cff)}
.swtog input:checked+.track .knob{left:18px}
.swtog input:focus-visible+.track{box-shadow:0 0 0 3px #d9ccff}
.syncstate{font-size:12px;color:var(--mut);font-family:ui-monospace,monospace}
.syncnow{background:var(--p2);border:1px solid var(--ln);color:var(--tx);border-radius:999px;padding:6px 13px;font-size:12px;cursor:pointer;font-weight:600}
.syncnow:hover{border-color:var(--acc);color:var(--acc)}
.syncnote{font-size:11px;color:var(--mut);margin-left:auto}.syncnote code{color:var(--acc);font-weight:600}
.proj{margin-top:14px;background:var(--p1);border:1px solid var(--ln);border-radius:20px;padding:17px 19px;box-shadow:0 14px 36px -30px #7c5cff}
.projhd{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
.projhd h3{margin:0 0 3px;font-size:16px;font-weight:800;letter-spacing:-.02em}
.projhd p{margin:0;font-size:12.5px;color:var(--mut);line-height:1.5;max-width:560px}.projhd p b{color:var(--tx)}
.yearsel{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mut);font-weight:600}
.yearsel input{accent-color:var(--acc)}
.yearsel b{color:var(--tx);font-family:ui-monospace,monospace}
.chart{width:100%;height:auto;margin:14px 0 4px;overflow:visible}
.grid{stroke:var(--ln);stroke-width:1}
.zero{stroke:var(--mut);stroke-width:1;stroke-dasharray:2 3}
.ytk,.xtk{fill:var(--mut);font-size:11px;font-family:ui-monospace,monospace}
.lnom{fill:none;stroke:var(--acc);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}
.lreal{fill:none;stroke:var(--mut);stroke-width:1.5;stroke-dasharray:5 4;stroke-linejoin:round}
.dotn{fill:var(--acc)}.dotend{fill:var(--acc);stroke:var(--p1);stroke-width:2.5}
.leg{display:flex;gap:18px;font-size:12px;color:var(--mut);margin-top:2px}
.leg span{display:flex;align-items:center;gap:7px}
.lk{width:16px;height:0;border-top:3px solid var(--acc);display:inline-block}
.lk.real{border-top:1.5px dashed var(--mut)}
.projstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;border-top:1px solid var(--ln);padding-top:13px;margin-top:12px}
.projwarn{font-size:12.5px;color:var(--warn);margin:12px 0 0;line-height:1.5}
.projnote{font-size:11.5px;color:var(--mut);margin:10px 0 0;line-height:1.5}
.mkt{margin-top:14px}
.mkt-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.mkt-sub{margin:2px 0 0;color:var(--mut);font-size:13px;max-width:520px;line-height:1.5}
.mkt-modes{display:flex;gap:4px;background:var(--p1);border:1px solid var(--ln);border-radius:999px;padding:5px;box-shadow:0 6px 18px -14px #7c5cff}
.mm{background:none;border:none;color:var(--mut);padding:9px 16px;border-radius:999px;cursor:pointer;font-size:13px;font-weight:700}
.mm.on{background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff}
.mkt-controls{background:var(--p1);border:1px solid var(--ln);border-radius:18px;padding:14px 16px;margin-bottom:14px;box-shadow:0 12px 30px -26px #7c5cff}
.mkt-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.mchip{display:flex;align-items:center;gap:7px;background:var(--p2);border:1.5px solid var(--ln);border-radius:999px;padding:8px 15px;font-size:13px;font-weight:700;cursor:pointer;color:var(--tx)}
.mchip.on{border-color:var(--acc);background:#f1ecff;color:var(--acc)}
.mkt-inputs{display:flex;gap:14px;flex-wrap:wrap}
.mkt-field{display:flex;flex-direction:column;gap:5px}
.mkt-field>span{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;font-weight:600}
.mkt-money{display:flex;align-items:center;background:var(--p2);border:1px solid var(--ln);border-radius:12px;padding:0 12px;width:200px}
.mkt-money:focus-within{border-color:var(--acc);background:#fff}
.mkt-money i{color:var(--mut);font-style:normal;font-weight:700}
.mkt-money input{width:100%;border:none;background:none;padding:10px 6px;font-size:15px;font-weight:700;text-align:right;color:var(--tx);font-family:ui-monospace,monospace}
.mkt-money input:focus{outline:none}
.mkt-yr{width:110px;background:var(--p2);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;font-size:15px;font-weight:700;color:var(--tx);font-family:ui-monospace,monospace;text-align:right}
.mkt-yr:focus{outline:none;border-color:var(--acc)}
.mkt-list{display:flex;flex-direction:column;gap:10px}
.mkt-card{display:flex;align-items:center;gap:16px;background:var(--p1);border:1px solid var(--ln);border-radius:18px;padding:14px 16px;flex-wrap:wrap;box-shadow:0 12px 30px -28px #7c5cff}
.mkt-card.sponsored{border-color:#d9ccff;background:linear-gradient(180deg,#faf7ff,#fff);box-shadow:0 14px 32px -22px #7c5cff}
.mkt-left{display:flex;flex-direction:column;gap:7px;flex:1;min-width:200px}
.mkt-inst{display:flex;align-items:center;gap:11px}
.mkt-logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:none}
.mkt-name{font-size:14.5px;font-weight:700}
.mkt-type{font-size:10px;color:var(--mut);border:1px solid var(--ln);border-radius:999px;padding:1px 7px;font-weight:600;vertical-align:middle;margin-left:4px}
.mkt-prod{font-size:12px;color:var(--mut)}
.mkt-badges{display:flex;gap:6px}
.b-sponsored{font-size:10px;font-weight:800;letter-spacing:.04em;color:#8a63ff;background:#efe8ff;border-radius:999px;padding:3px 9px}
.b-best{font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--good);background:#e3f8f0;border-radius:999px;padding:3px 9px}
.mkt-mid{text-align:center;min-width:74px}
.mkt-rate{font-size:26px;font-weight:800;font-family:ui-monospace,monospace;letter-spacing:-.03em;color:var(--acc)}
.mkt-rate small{font-size:14px;font-weight:700}
.mkt-rlabel{font-size:10.5px;color:var(--mut);margin-top:-2px}
.mkt-calc{display:flex;flex-direction:column;gap:5px;min-width:160px}
.mc{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;color:var(--mut)}
.mc b{font-family:ui-monospace,monospace;color:var(--tx);font-weight:700}
.mc b.good{color:var(--good)}.mc b.warn{color:var(--warn)}
.mkt-go{background:linear-gradient(135deg,#7c5cff,#5b8cff);color:#fff;text-decoration:none;border-radius:999px;padding:10px 18px;font-weight:800;font-size:13.5px;box-shadow:0 8px 18px -10px #7c5cff;white-space:nowrap}
.mkt-go:hover{filter:brightness(1.05)}
.mkt-foot{margin-top:14px;font-size:11.5px;color:var(--mut);line-height:1.55}.mkt-foot b{color:var(--tx)}
.mkt-spon-note{display:block;margin-top:3px}
`;
