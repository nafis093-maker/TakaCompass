import React, { useState, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { walletBalance, kindOf, tk, big } from "./lib.js";

// Buckets that are zakatable (wealth held). "other" is excluded by default.
const ZAKATABLE = new Set(["cash", "bank", "fdr", "sanchayapatra", "dps", "stocks", "gold"]);

export default function Zakat({ wallets, txns, onClose }) {
  const buckets = useMemo(() =>
    wallets
      .map((w) => ({ id: w.id, name: w.name, kind: w.kind, amt: walletBalance(w, txns) }))
      .filter((b) => b.amt > 0), [wallets, txns]);

  const [excluded, setExcluded] = useState(() => new Set(buckets.filter((b) => !ZAKATABLE.has(b.kind)).map((b) => b.id)));
  const [goldRate, setGoldRate] = useState(11500); // ৳/gram, 22k — editable
  const [liabilities, setLiabilities] = useState(0);

  const toggle = (id) => setExcluded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const included = buckets.filter((b) => !excluded.has(b.id));
  const gross = included.reduce((s, b) => s + b.amt, 0);
  const net = Math.max(0, gross - (+liabilities || 0));
  const nisab = goldRate * 85; // 85g gold threshold
  const eligible = net >= nisab;
  const zakat = eligible ? net * 0.025 : 0;

  return (
    <div className="m-app">
      <div className="ra-bar"><button className="planner-back" onClick={onClose}><ChevronLeft size={18} /> Back</button></div>
      <div className="scr" style={{ paddingTop: 4 }}>
        <div className="m-title">Zakat calculator</div>
        <p className="plan-intro">Zakat is 2.5% of your zakatable wealth held for a lunar year, if it's above the nisab threshold. Pick what to include and we'll do the maths. This is an estimate — confirm with a scholar for your situation.</p>

        <div className="z-sec">Your wealth</div>
        {buckets.length === 0 && <p className="m-empty">No positive balances to assess yet.</p>}
        {buckets.map((b) => (
          <label className="z-row" key={b.id}>
            <input type="checkbox" checked={!excluded.has(b.id)} onChange={() => toggle(b.id)} />
            <span className="z-name">{b.name}<i>{kindOf(b.kind).label}</i></span>
            <b>{tk(b.amt)}</b>
          </label>
        ))}

        <div className="z-sec">Adjustments</div>
        <label className="z-inrow">Gold price (৳/gram, 22k)
          <span className="m-money sm"><i>৳</i><input inputMode="numeric" value={goldRate} onChange={(e) => setGoldRate(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span>
        </label>
        <label className="z-inrow">Short-term debts to deduct
          <span className="m-money sm"><i>৳</i><input inputMode="numeric" value={liabilities} onChange={(e) => setLiabilities(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span>
        </label>

        <div className="z-result">
          <div className="z-line"><span>Zakatable wealth</span><b>{tk(net)}</b></div>
          <div className="z-line"><span>Nisab (85g gold)</span><b>{tk(nisab)}</b></div>
          <div className={"z-big " + (eligible ? "due" : "na")}>
            {eligible ? <>Zakat due<br /><span>{tk(zakat)}</span></> : <>Below nisab<br /><span>No zakat due</span></>}
          </div>
          {eligible && <p className="z-note">2.5% of {tk(net)}. Nisab uses an 85g gold equivalent at the price above.</p>}
        </div>
      </div>
    </div>
  );
}
