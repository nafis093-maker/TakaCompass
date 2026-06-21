import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { WALLET_KINDS, kindOf, uid, today } from "./lib.js";

export default function AddAccount({ onClose, onAddWallet, onAddLoan }) {
  const [mode, setMode] = useState("asset");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("cash");
  const [opening, setOpening] = useState(0);
  const [rate, setRate] = useState(13.5);
  const [emiv, setEmiv] = useState(0);
  const [start, setStart] = useState("");
  const [tenure, setTenure] = useState("");
  const [trate, setTrate] = useState("");

  const TERM = new Set(["fdr", "sanchayapatra", "dps"]);
  const isTerm = mode === "asset" && TERM.has(kind);
  const canSave = name.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    if (mode === "asset") {
      const w = { id: uid(), name: name.trim(), kind, opening: +opening || 0, color: kindOf(kind).color };
      if (isTerm && start && tenure) { w.start = start; w.tenureMonths = +tenure; w.rate = +trate || kindOf(kind).ret; }
      onAddWallet(w);
    } else onAddLoan({ id: uid(), name: name.trim(), bal: +opening || 0, rate: +rate || 0, emi: +emiv || 0 });
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <button className="sheet-x" onClick={onClose}><X size={22} /></button>
          <span className="sheet-title">Add account</span>
          <button className="sheet-ok" onClick={save} disabled={!canSave}><Check size={22} /></button>
        </div>

        <div className="sheet-types" style={{ paddingTop: 16 }}>
          <button className={"st" + (mode === "asset" ? " on" : "")} onClick={() => setMode("asset")}>Asset / Wallet</button>
          <button className={"st" + (mode === "loan" ? " on" : "")} onClick={() => setMode("loan")}>Loan (you owe)</button>
        </div>

        <div className="sheet-body">
          <input className="sheet-note" autoFocus placeholder={mode === "asset" ? "Name (e.g. bKash, Bank, Gold)" : "Loan name (e.g. Car loan)"} value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 12 }} />

          {mode === "asset" && (
            <label className="sheet-row">Type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {WALLET_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label} · ~{k.ret}%</option>)}
              </select>
            </label>
          )}

          <label className="sheet-row">{mode === "asset" ? "Current balance" : "Amount owed"}
            <span className="m-money sm"><i>৳</i><input inputMode="numeric" value={opening || ""} onChange={(e) => setOpening(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span>
          </label>

          {isTerm && (
            <>
              <label className="sheet-row">Started on<input type="date" value={start} max={today()} onChange={(e) => setStart(e.target.value)} /></label>
              <label className="sheet-row">Term (months)<span className="m-money sm"><input inputMode="numeric" placeholder="e.g. 60" value={tenure} onChange={(e) => setTenure(e.target.value.replace(/[^0-9]/g, ""))} /></span></label>
              <label className="sheet-row">Profit %<span className="onb-pct sm"><input placeholder={String(kindOf(kind).ret)} value={trate} onChange={(e) => setTrate(e.target.value.replace(/[^0-9.]/g, ""))} />%</span></label>
              <p className="m-note" style={{ margin: "2px 0 0" }}>Optional — adds this to your maturity tracker with a projected value.</p>
            </>
          )}

          {mode === "loan" && (
            <>
              <label className="sheet-row">Interest %<span className="onb-pct sm"><input value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} />%</span></label>
              <label className="sheet-row">Monthly EMI<span className="m-money sm"><i>৳</i><input inputMode="numeric" value={emiv || ""} onChange={(e) => setEmiv(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span></label>
            </>
          )}
        </div>

        <button className="sheet-save" onClick={save} disabled={!canSave}>Add {mode === "asset" ? "account" : "loan"}</button>
      </div>
    </div>
  );
}
