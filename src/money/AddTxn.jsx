import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { EXPENSE_CATS, INCOME_CATS, uid, today, niceDate } from "./lib.js";

export default function AddTxn({ wallets, onClose, onSave, initial }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount || 0);
  const [category, setCategory] = useState(initial?.category || "food");
  const [walletId, setWalletId] = useState(initial?.walletId || wallets[0]?.id);
  const [toWalletId, setToWalletId] = useState(initial?.toWalletId || wallets[1]?.id || wallets[0]?.id);
  const [date, setDate] = useState(initial?.date || today());
  const [note, setNote] = useState(initial?.note || "");

  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const canSave = amount > 0 && (type !== "transfer" || walletId !== toWalletId);

  const save = () => {
    if (!canSave) return;
    const t = { id: initial?.id || uid(), type, amount: +amount, walletId, date, note };
    if (type === "transfer") t.toWalletId = toWalletId;
    else t.category = type === "income" ? (INCOME_CATS.find((c) => c.key === category) ? category : "salary") : category;
    onSave(t);
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <button className="sheet-x" onClick={onClose}><X size={22} /></button>
          <span className="sheet-title">{initial ? "Edit" : "Add"} transaction</span>
          <button className="sheet-ok" onClick={save} disabled={!canSave}><Check size={22} /></button>
        </div>

        <div className="sheet-amt">
          <span>৳</span>
          <input autoFocus inputMode="numeric" value={amount || ""} placeholder="0"
            onChange={(e) => setAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} />
        </div>

        <div className="sheet-types">
          {["expense", "income", "transfer"].map((t) => (
            <button key={t} className={"st" + (type === t ? " on" : "")} onClick={() => setType(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <div className="sheet-body">
          {type === "transfer" ? (
            <div className="sheet-transfer">
              <label>From<select value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
              <label>To<select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            </div>
          ) : (
            <>
              <div className="sheet-cats">
                {cats.map((c) => (
                  <button key={c.key} className={"catbtn" + (category === c.key ? " on" : "")} onClick={() => setCategory(c.key)}>
                    <span className="catic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={20} strokeWidth={2.2} /></span>
                    <span className="catlbl">{c.label}</span>
                  </button>
                ))}
              </div>
              <label className="sheet-row">Wallet
                <select value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              </label>
            </>
          )}

          <label className="sheet-row">Date
            <span className="daterow">
              <button className={"dtbtn" + (date === today() ? " on" : "")} onClick={() => setDate(today())}>Today</button>
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            </span>
          </label>
          <input className="sheet-note" placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="sheet-save" onClick={save} disabled={!canSave}>{initial ? "Save changes" : "Add transaction"}</button>
      </div>
    </div>
  );
}
