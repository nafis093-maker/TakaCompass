import React, { useState } from "react";
import { X, FileText, Trash2 } from "lucide-react";
import { parsePdf } from "./stmtparse.js";
import { EXPENSE_CATS, INCOME_CATS, uid } from "./lib.js";

export default function StatementImport({ wallets, onClose, onImport }) {
  const bankDefault = (wallets.find((w) => w.kind === "bank") || wallets[0])?.id;
  const [files, setFiles] = useState([]); // {id, file, name, walletId, password, error}
  const [rows, setRows] = useState([]);   // parsed, editable
  const [busy, setBusy] = useState("");

  const addFiles = (list) => {
    const next = Array.from(list).map((file) => ({ id: uid(), file, name: file.name, walletId: bankDefault, password: "", error: "" }));
    setFiles((f) => [...f, ...next]);
    setRows([]);
  };
  const updFile = (id, k, v) => setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, [k]: v } : f)));
  const rmFile = (id) => setFiles((fs) => fs.filter((f) => f.id !== id));

  const parseAll = async () => {
    setRows([]);
    const out = [];
    for (const f of files) {
      setBusy(`Reading ${f.name}…`);
      try {
        const { txns, textFound } = await parsePdf(f.file, f.password || undefined);
        if (!textFound) { updFile(f.id, "error", "No text found — looks like a scanned image (OCR not supported)."); continue; }
        updFile(f.id, "error", "");
        const bank = wallets.find((w) => w.id === f.walletId)?.name || "Bank";
        txns.forEach((t) => out.push({ ...t, id: uid(), walletId: f.walletId, bank, include: true }));
      } catch (e) {
        const msg = String(e?.message || e);
        updFile(f.id, "error", /password/i.test(msg) ? "Password required or incorrect." : "Couldn't read this PDF.");
      }
    }
    setBusy("");
    setRows(out);
  };

  const upd = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const importAll = () => {
    const chosen = rows.filter((r) => r.include && r.amount > 0);
    onImport(chosen.map((r) => ({ id: uid(), type: r.type, amount: +r.amount, category: r.category, walletId: r.walletId, date: r.date, note: r.note })));
  };
  const count = rows.filter((r) => r.include).length;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <button className="sheet-x" onClick={onClose}><X size={22} /></button>
          <span className="sheet-title">Upload bank statements</span>
          <span style={{ width: 36 }} />
        </div>

        <div className="sheet-body" style={{ paddingTop: 14 }}>
          <p className="sms-help">Upload PDF statements — one or several, from different banks. The app reads each, pulls out the transactions, and you assign each statement to a wallet. Scanned (image) PDFs aren't supported.</p>

          <label className="stmt-drop">
            <FileText size={20} /> Choose PDF statement(s)
            <input type="file" accept="application/pdf,.pdf" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
          </label>

          {files.map((f) => (
            <div className="stmt-file" key={f.id}>
              <div className="stmt-frow">
                <FileText size={16} />
                <span className="stmt-fname">{f.name}</span>
                <button className="stmt-frm" onClick={() => rmFile(f.id)}><Trash2 size={15} /></button>
              </div>
              <div className="stmt-fopts">
                <label>Wallet
                  <select value={f.walletId} onChange={(e) => updFile(f.id, "walletId", e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                </label>
                <input className="stmt-pass" placeholder="PDF password (if any)" value={f.password} onChange={(e) => updFile(f.id, "password", e.target.value)} />
              </div>
              {f.error && <div className="stmt-err">{f.error}</div>}
            </div>
          ))}

          {files.length > 0 && <button className="sms-auto" onClick={parseAll} disabled={!!busy}>{busy || `Read ${files.length} statement${files.length > 1 ? "s" : ""}`}</button>}

          {rows.length > 0 && <div className="sms-found">{rows.length} transactions detected</div>}
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
                      <span className="stmt-bank">{r.bank}</span>
                    </div>
                    <div className="sms-line2">
                      <select value={r.category} onChange={(e) => upd(r.id, "category", e.target.value)}>{cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                      <button className="sms-flip" onClick={() => upd(r.id, "type", r.type === "income" ? "expense" : "income")}>flip</button>
                      <span className="sms-date">{r.date}</span>
                    </div>
                    <div className="sms-raw">{r.note}</div>
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
