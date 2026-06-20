import React, { useState } from "react";
import { X, Smartphone } from "lucide-react";
import { parseSms } from "./smsparse.js";
import { EXPENSE_CATS, INCOME_CATS, tk, uid } from "./lib.js";
import { isNative, requestSms, readInbox, looksLikeTxn } from "./native.js";

const SAMPLE = `You have received Tk 12,000.00 from 01712345678. Ref Salary. Balance Tk 18,500. TrxID 9AB1CD on 18/06/2026.
Payment Tk 850.00 to Shwapno successful. bKash. Balance Tk 17,650.
Cash Out Tk 5,000.00. Fee Tk 85. Nagad. 18-Jun-2026.`;

export default function ImportSms({ wallets, onClose, onImport }) {
  const [text, setText] = useState("");
  const [walletId, setWalletId] = useState(wallets[0]?.id);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");

  const parse = (t) => {
    setText(t);
    setRows(parseSms(t).map((r) => ({ ...r, id: uid(), include: true })));
  };
  const autoRead = async () => {
    setBusy("Requesting permission…");
    const ok = await requestSms();
    if (!ok) { setBusy(""); alert("Allow SMS access to auto-read your transaction messages."); return; }
    setBusy("Reading inbox…");
    const msgs = await readInbox(120, 1000);
    const txt = msgs.filter((m) => looksLikeTxn(m.body)).slice(0, 200).map((m) => m.body).join("\n\n");
    setBusy("");
    if (!txt) { alert("No transaction-style SMS found in the last few months."); return; }
    parse(txt);
  };
  const upd = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const importAll = () => {
    const chosen = rows.filter((r) => r.include && r.amount > 0);
    onImport(chosen.map((r) => ({
      id: uid(), type: r.type, amount: +r.amount, walletId,
      date: r.date, note: r.note,
      ...(r.type === "transfer" ? {} : { category: r.category }),
    })));
  };
  const count = rows.filter((r) => r.include).length;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <button className="sheet-x" onClick={onClose}><X size={22} /></button>
          <span className="sheet-title">Import from SMS</span>
          <span style={{ width: 36 }} />
        </div>

        <div className="sheet-body" style={{ paddingTop: 14 }}>
          <p className="sms-help">Paste one or more transaction SMS (bKash, Nagad, Rocket, bank/card). The app pulls out the amount, type and a category — check them, then import.</p>
          {isNative() && (
            <button className="sms-auto" onClick={autoRead} disabled={!!busy}>
              <Smartphone size={18} /> {busy || "Read my SMS inbox automatically"}
            </button>
          )}
          <textarea className="sms-area" rows={5} placeholder={"Paste SMS here…\n\ne.g.\n" + SAMPLE} value={text} onChange={(e) => parse(e.target.value)} />
          <div className="sms-tryrow">
            <button className="sms-try" onClick={() => parse(SAMPLE)}>Try a sample</button>
            <label className="sms-wallet">Into
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            </label>
          </div>

          {rows.length > 0 && <div className="sms-found">{rows.length} detected</div>}
          <div className="sms-list">
            {rows.map((r) => {
              const cats = r.type === "income" ? INCOME_CATS : EXPENSE_CATS;
              return (
                <div className={"sms-card" + (r.include ? "" : " off")} key={r.id}>
                  <button className="sms-chk" onClick={() => upd(r.id, "include", !r.include)}>{r.include ? "✓" : ""}</button>
                  <div className="sms-main">
                    <div className="sms-line1">
                      <span className={"sms-type " + r.type}>{r.type}</span>
                      <span className="sms-amt"><i>৳</i><input inputMode="numeric" value={r.amount} onChange={(e) => upd(r.id, "amount", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span>
                    </div>
                    <div className="sms-line2">
                      <select value={r.category} onChange={(e) => upd(r.id, "category", e.target.value)}>
                        {cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      <button className="sms-flip" onClick={() => upd(r.id, "type", r.type === "income" ? "expense" : "income")}>flip</button>
                      <span className="sms-date">{r.date}</span>
                    </div>
                    <div className="sms-raw">{r.raw}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="sheet-save" onClick={importAll} disabled={count === 0}>{count > 0 ? `Import ${count} transaction${count > 1 ? "s" : ""}` : "Nothing to import"}</button>
      </div>
    </div>
  );
}
