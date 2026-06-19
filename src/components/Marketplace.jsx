import React, { useState } from "react";
import { INST, PRODUCTS, BORROW_CATS, SAVE_CATS, UPDATED } from "../data/products.js";

const fmt = (n, d = 0) => (isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const big = (n) => {
  const a = Math.abs(n);
  if (a >= 1e7) return "৳" + fmt(n / 1e7, 2) + " Cr";
  if (a >= 1e5) return "৳" + fmt(n / 1e5, 2) + " L";
  return "৳" + fmt(n);
};
const tk = (n) => "৳" + fmt(Math.round(n));
function emi(P, rate, years) {
  const r = rate / 100 / 12, n = years * 12;
  if (P <= 0 || years <= 0) return 0;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export default function Marketplace({ idleCash = 0, goalLoan, rates }) {
  const [mode, setMode] = useState(goalLoan && goalLoan.amount > 0 ? "borrow" : "save");
  const [bcat, setBcat] = useState(goalLoan?.cat || "home-loan");
  const [scat, setScat] = useState("fdr");
  const [amount, setAmount] = useState(
    goalLoan && goalLoan.amount > 0 ? Math.round(goalLoan.amount) : Math.max(100000, Math.round(idleCash))
  );
  const [tenure, setTenure] = useState(goalLoan?.years || 5);

  const cat = mode === "borrow" ? bcat : scat;
  const list = PRODUCTS.filter((p) => p.cat === cat);

  const ranked = list
    .map((p) => {
      const inst = INST[p.inst];
      if (mode === "borrow") {
        const yrs = Math.min(tenure, p.tenureMax);
        const m = emi(amount, p.rate, yrs);
        return { ...p, inst, yrs, emi: m, totalInterest: m * yrs * 12 - amount, metric: m };
      }
      const yrs = Math.min(tenure, p.tenureMax);
      const maturity = amount * Math.pow(1 + p.rate / 100, yrs);
      return { ...p, inst, yrs, maturity, earned: maturity - amount, metric: -p.rate };
    })
    .sort((a, b) => {
      // sponsored pinned on top, then by best deal
      if (!!b.sponsored !== !!a.sponsored) return (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0);
      if (a.sponsored && b.sponsored) return (a.priority || 9) - (b.priority || 9);
      return a.metric - b.metric;
    });

  // index of the best NON-sponsored option, to badge it honestly
  const bestOrganic = ranked.findIndex((r) => !r.sponsored);
  const cats = mode === "borrow" ? BORROW_CATS : SAVE_CATS;

  return (
    <div className="mkt">
      <div className="mkt-head">
        <div>
          <h3 className="ih">Find a better rate 💸</h3>
          <p className="mkt-sub">
            {mode === "borrow"
              ? "Compare what banks & NBFIs would charge on a loan, then go straight to them."
              : "Compare where your money earns the most, then open an account with one click."}
          </p>
        </div>
        <div className="mkt-modes">
          <button className={"mm" + (mode === "borrow" ? " on" : "")} onClick={() => setMode("borrow")}>Borrow</button>
          <button className={"mm" + (mode === "save" ? " on" : "")} onClick={() => setMode("save")}>Save / Deposit</button>
        </div>
      </div>

      <div className="mkt-controls">
        <div className="mkt-chips">
          {cats.map((c) => (
            <button key={c.key} className={"mchip" + (cat === c.key ? " on" : "")}
              onClick={() => (mode === "borrow" ? setBcat(c.key) : setScat(c.key))}>
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
        <div className="mkt-inputs">
          <label className="mkt-field">
            <span>{mode === "borrow" ? "Loan amount" : "Deposit amount"}</span>
            <span className="mkt-money"><i>৳</i><input inputMode="numeric" value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span>
          </label>
          <label className="mkt-field">
            <span>{mode === "borrow" ? "Years to repay" : "Years held"}</span>
            <input className="mkt-yr" inputMode="numeric" value={tenure}
              onChange={(e) => setTenure(parseFloat(e.target.value) || 1)} />
          </label>
        </div>
      </div>

      <div className="mkt-list">
        {ranked.map((r, i) => (
          <div className={"mkt-card" + (r.sponsored ? " sponsored" : "")} key={r.id}>
            <div className="mkt-left">
              <div className="mkt-inst">
                <span className="mkt-logo">{r.inst.name[0]}</span>
                <div>
                  <div className="mkt-name">{r.inst.name} <span className="mkt-type">{r.inst.type}</span></div>
                  <div className="mkt-prod">{r.name}{r.note ? " · " + r.note : ""}</div>
                </div>
              </div>
              <div className="mkt-badges">
                {r.sponsored && <span className="b-sponsored">Sponsored</span>}
                {!r.sponsored && i === bestOrganic && <span className="b-best">Best rate</span>}
              </div>
            </div>

            <div className="mkt-mid">
              <div className="mkt-rate">{fmt(r.rate, 2)}<small>%</small></div>
              <div className="mkt-rlabel">{mode === "borrow" ? "p.a." : "return p.a."}</div>
            </div>

            <div className="mkt-calc">
              {mode === "borrow" ? (
                <>
                  <div className="mc"><span>Monthly EMI</span><b>{tk(r.emi)}</b></div>
                  <div className="mc"><span>Total interest ({r.yrs}y)</span><b className="warn">{big(r.totalInterest)}</b></div>
                </>
              ) : (
                <>
                  <div className="mc"><span>Value in {r.yrs}y</span><b className="good">{big(r.maturity)}</b></div>
                  <div className="mc"><span>You earn</span><b className="good">{big(r.earned)}</b></div>
                </>
              )}
            </div>

            <a className="mkt-go" href={r.inst.url} target="_blank" rel="noopener noreferrer">Visit →</a>
          </div>
        ))}
      </div>

      <p className="mkt-foot">
        Rates are <b>indicative</b> (catalog updated {UPDATED}) — confirm current terms on the institution's site before applying.
        <span className="mkt-spon-note"> "Sponsored" placements are paid positions; everything below them is ranked purely by best {mode === "borrow" ? "cost" : "return"}.</span>
      </p>
    </div>
  );
}
