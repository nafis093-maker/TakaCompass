import React, { useState } from "react";

const gid = () => Math.random().toString(36).slice(2, 9);
const n = (v) => parseFloat(v) || 0;

// chips → goal templates
const GOAL_TPL = {
  Flat: { cost: 8000000, dp: 25, rate: 13, tenure: 20, years: 5, emoji: "🏠" },
  Car: { cost: 2500000, dp: 20, rate: 13.5, tenure: 5, years: 3, emoji: "🚗" },
  Travel: { cost: 300000, dp: 100, rate: 0, tenure: 1, years: 1, emoji: "✈️" },
  Wedding: { cost: 1500000, dp: 100, rate: 0, tenure: 1, years: 2, emoji: "💍" },
};

export default function Onboarding({ user, onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    income: [{ id: gid(), name: "Salary", amt: 0 }],
    exp: { Rent: 0, Food: 0, Transport: 0, Fun: 0 },
    sav: { Cash: 0, "Sanchayapatra / DPS": 0, Stocks: 0, Gold: 0 },
    loan: { has: false, name: "Loan", bal: 0, emi: 0, rate: 13.5 },
    goals: {},
  });

  const steps = ["intro", "income", "expenses", "savings", "loan", "goals"];
  const last = steps.length - 1;
  const pct = (step / last) * 100;

  const finish = () => onDone(mapToData(d));

  return (
    <div className="onb">
      <div className="onb-card">
        <div className="onb-progress"><span style={{ width: pct + "%" }} /></div>

        {step === 0 && (
          <Step emoji="👋" title={`Hey ${user.name.split(" ")[0]}!`} sub="Let's map your money in under a minute. Rough numbers are fine — you can tweak everything later.">
            <div className="onb-actions solo">
              <button className="np" onClick={() => setStep(1)}>Let's go →</button>
              <button className="skip" onClick={onSkip}>Skip, show me a demo</button>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step emoji="💸" title="What's coming in?" sub="Monthly income — salary, business, side hustle, whatever.">
            {d.income.map((row, i) => (
              <div className="onb-row" key={row.id}>
                <input className="onb-name" value={row.name} placeholder="Source"
                  onChange={(e) => setD((s) => ({ ...s, income: s.income.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r) }))} />
                <Money value={row.amt} onChange={(v) => setD((s) => ({ ...s, income: s.income.map((r) => r.id === row.id ? { ...r, amt: v } : r) }))} />
                {d.income.length > 1 && <button className="onb-x" onClick={() => setD((s) => ({ ...s, income: s.income.filter((r) => r.id !== row.id) }))}>×</button>}
              </div>
            ))}
            <button className="onb-add" onClick={() => setD((s) => ({ ...s, income: [...s.income, { id: gid(), name: "", amt: 0 }] }))}>+ another source</button>
            <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
          </Step>
        )}

        {step === 2 && (
          <Step emoji="🧾" title="What goes out?" sub="Ballpark monthly spend. Leave blank what doesn't apply.">
            {Object.keys(d.exp).map((k) => (
              <div className="onb-row" key={k}>
                <span className="onb-label">{k === "Fun" ? "Fun & lifestyle" : k}</span>
                <Money value={d.exp[k]} onChange={(v) => setD((s) => ({ ...s, exp: { ...s.exp, [k]: v } }))} />
              </div>
            ))}
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </Step>
        )}

        {step === 3 && (
          <Step emoji="🏦" title="What've you got saved?" sub="Current balances. We'll assume sensible BD return rates — edit later if you want.">
            {Object.keys(d.sav).map((k) => (
              <div className="onb-row" key={k}>
                <span className="onb-label">{k}</span>
                <Money value={d.sav[k]} onChange={(v) => setD((s) => ({ ...s, sav: { ...s.sav, [k]: v } }))} />
              </div>
            ))}
            <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </Step>
        )}

        {step === 4 && (
          <Step emoji="📉" title="Any loans?" sub="Car, personal, home — anything you're paying off.">
            <div className="onb-toggle2">
              <button className={"t2" + (!d.loan.has ? " on" : "")} onClick={() => setD((s) => ({ ...s, loan: { ...s.loan, has: false } }))}>Nope, debt-free 🎉</button>
              <button className={"t2" + (d.loan.has ? " on" : "")} onClick={() => setD((s) => ({ ...s, loan: { ...s.loan, has: true } }))}>Yeah, I've got one</button>
            </div>
            {d.loan.has && (
              <div className="onb-loanfields">
                <div className="onb-row"><span className="onb-label">What is it?</span>
                  <input className="onb-name" value={d.loan.name} onChange={(e) => setD((s) => ({ ...s, loan: { ...s.loan, name: e.target.value } }))} /></div>
                <div className="onb-row"><span className="onb-label">Amount left</span><Money value={d.loan.bal} onChange={(v) => setD((s) => ({ ...s, loan: { ...s.loan, bal: v } }))} /></div>
                <div className="onb-row"><span className="onb-label">Monthly EMI</span><Money value={d.loan.emi} onChange={(v) => setD((s) => ({ ...s, loan: { ...s.loan, emi: v } }))} /></div>
                <div className="onb-row"><span className="onb-label">Interest %</span>
                  <span className="onb-pct"><input value={d.loan.rate} onChange={(e) => setD((s) => ({ ...s, loan: { ...s.loan, rate: n(e.target.value) } }))} />%</span></div>
              </div>
            )}
            <Nav onBack={() => setStep(3)} onNext={() => setStep(5)} />
          </Step>
        )}

        {step === 5 && (
          <Step emoji="🎯" title="What are you saving for?" sub="Tap any that apply — we'll set up a plan with the math done.">
            <div className="onb-chips">
              {Object.entries(GOAL_TPL).map(([k, t]) => (
                <button key={k} className={"chip" + (d.goals[k] ? " on" : "")}
                  onClick={() => setD((s) => { const g = { ...s.goals }; if (g[k]) delete g[k]; else g[k] = { ...t, name: k }; return { ...s, goals: g }; })}>
                  <span className="chip-emoji">{t.emoji}</span>{k}
                </button>
              ))}
            </div>
            {Object.keys(d.goals).length > 0 && (
              <div className="onb-goalcosts">
                {Object.keys(d.goals).map((k) => (
                  <div className="onb-row" key={k}>
                    <span className="onb-label">{GOAL_TPL[k].emoji} {k} — target</span>
                    <Money value={d.goals[k].cost} onChange={(v) => setD((s) => ({ ...s, goals: { ...s.goals, [k]: { ...s.goals[k], cost: v } } }))} />
                  </div>
                ))}
              </div>
            )}
            <div className="onb-actions">
              <button className="bk" onClick={() => setStep(4)}>← Back</button>
              <button className="np" onClick={finish}>See my dashboard ✨</button>
            </div>
          </Step>
        )}
      </div>
    </div>
  );
}

function Step({ emoji, title, sub, children }) {
  return (
    <div className="onb-step" key={title}>
      <div className="onb-emoji" key={emoji}>{emoji}</div>
      <h2>{title}</h2>
      <p className="onb-substep">{sub}</p>
      {children}
    </div>
  );
}
function Nav({ onBack, onNext }) {
  return (
    <div className="onb-actions">
      <button className="bk" onClick={onBack}>← Back</button>
      <button className="np" onClick={onNext}>Next →</button>
    </div>
  );
}
function Money({ value, onChange }) {
  return (
    <span className="onb-money">
      <i>৳</i>
      <input inputMode="numeric" value={value || ""} placeholder="0"
        onChange={(e) => onChange(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} />
    </span>
  );
}

// map the friendly draft → the dashboard's data shape
function mapToData(d) {
  const income = d.income.filter((r) => r.amt > 0).map((r) => ({ id: gid(), name: r.name || "Income", amt: r.amt }));
  if (income.length === 0) income.push({ id: gid(), name: "Income", amt: 0 });

  const expMap = { Rent: true, Food: true, Transport: true, Fun: false };
  const expenses = Object.entries(d.exp).filter(([, v]) => v > 0)
    .map(([k, v]) => ({ id: gid(), name: k === "Fun" ? "Fun & lifestyle" : k, amt: v, ess: expMap[k] }));

  const savMap = {
    Cash: { kind: "Liquid", ret: 1 },
    "Sanchayapatra / DPS": { kind: "Fixed-income", ret: 11.83 },
    Stocks: { kind: "Equity", ret: 15 },
    Gold: { kind: "Gold", ret: 8 },
  };
  const assets = Object.entries(d.sav).filter(([, v]) => v > 0)
    .map(([k, v]) => ({ id: gid(), name: k, amt: v, ret: savMap[k].ret, kind: savMap[k].kind }));

  const loans = d.loan.has && d.loan.bal > 0
    ? [{ id: gid(), name: d.loan.name || "Loan", bal: d.loan.bal, rate: d.loan.rate, emi: d.loan.emi, years: 3 }]
    : [];

  const goals = Object.entries(d.goals).map(([k, g]) => ({ id: gid(), name: k, cost: g.cost, dp: g.dp, rate: g.rate, tenure: g.tenure, years: g.years }));

  return { income, expenses, assets, loans, goals };
}
