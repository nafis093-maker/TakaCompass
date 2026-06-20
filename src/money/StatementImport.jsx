import React, { useState, useMemo } from "react";
import { X, FileText, Trash2, Wallet as WalletIcon, Banknote } from "lucide-react";
import { parsePdf } from "./stmtparse.js";
import { EXPENSE_CATS, INCOME_CATS, uid, tk, kindOf, txnFingerprint } from "./lib.js";

const last4 = (a) => (a ? "…" + String(a).slice(-4) : "");

export default function StatementImport({ wallets, loans = [], onClose, onImport, existing = [] }) {
  const existingFps = useMemo(() => new Set(existing.map(txnFingerprint)), [existing]);
  const [files, setFiles] = useState([]); // {id, file, name, password, error, target, override}
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");

  const addFiles = (list) => {
    setFiles((f) => [...f, ...Array.from(list).map((file) => ({ id: uid(), file, name: file.name, password: "", error: "" }))]);
    setRows([]);
  };
  const updFile = (id, k, v) => setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, [k]: v } : f)));
  const rmFile = (id) => { setFiles((fs) => fs.filter((f) => f.id !== id)); setRows([]); };

  const parseAll = async () => {
    setRows([]);
    const out = [];
    const nextFiles = [...files];
    for (let i = 0; i < nextFiles.length; i++) {
      const f = nextFiles[i];
      setBusy(`Reading ${f.name}…`);
      try {
        const { txns, textFound, opening, closing, meta } = await parsePdf(f.file, f.password || undefined);
        if (!textFound) { f.error = "No text found — looks like a scanned image (OCR not supported)."; continue; }
        f.error = "";
        const acct = meta.accountNo;
        const name = (meta.bank || "Bank") + " " + last4(acct);
        let target;
        if (meta.isLoan) {
          const matched = acct && loans.find((l) => l.acctNo === acct);
          target = { mode: "loan", displayName: name, acct, accType: meta.accountType,
            matchedLoanId: matched?.id || null,
            newLoan: matched ? null : { id: uid(), name: (meta.bank || "Bank") + " loan " + last4(acct), bal: Math.round(closing || meta.availBalance || 0), rate: 0, emi: 0, acctNo: acct } };
        } else {
          const matched = acct && wallets.find((w) => w.acctNo === acct);
          target = { mode: "wallet", displayName: matched ? matched.name : name, acct, accType: meta.accountType, kind: meta.kind,
            matchedWalletId: matched?.id || null,
            newWallet: matched ? null : { id: uid(), name, kind: meta.kind, acctNo: acct, opening: Math.round(opening || 0), color: kindOf(meta.kind).color } };
        }
        f.target = target;
        f.override = "auto";
        const isLoanFile = target.mode === "loan";
        const fileWalletId = target.matchedWalletId || target.newWallet?.id || null;
        txns.forEach((t) => out.push({ ...t, id: uid(), fileId: f.id, bank: target.displayName, isLoanFile, walletId: fileWalletId, include: true }));
      } catch (e) {
        f.error = /password/i.test(String(e?.message || e)) ? "Password required or incorrect." : "Couldn't read this PDF.";
      }
    }
    setFiles(nextFiles);
    setBusy("");
    const seen = new Set(existingFps);
    out.forEach((r) => {
      r.dupe = seen.has(txnFingerprint(r));
      r.include = !r.dupe && !r.transfer && !r.isLoanFile;
      if (!r.dupe) seen.add(txnFingerprint(r));
    });
    setRows(out);
  };

  const upd = (id, k, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const setOverride = (fileId, v) => {
    setFiles((fs) => fs.map((f) => (f.id === fileId ? { ...f, override: v } : f)));
    setRows((rs) => rs.map((r) => (r.fileId === fileId ? { ...r, walletId: v === "auto" ? (files.find((f) => f.id === fileId)?.target?.matchedWalletId || files.find((f) => f.id === fileId)?.target?.newWallet?.id || null) : v } : r)));
  };

  const parsedFiles = files.filter((f) => f.target);
  const importAll = () => {
    const newWallets = [], newLoans = [];
    parsedFiles.forEach((f) => {
      if (f.override && f.override !== "auto") return; // routed to an existing wallet
      if (f.target.mode === "loan" && f.target.newLoan) newLoans.push(f.target.newLoan);
      if (f.target.mode === "wallet" && f.target.newWallet) newWallets.push(f.target.newWallet);
    });
    const chosen = rows.filter((r) => r.include && r.amount > 0 && r.walletId);
    const skipped = rows.filter((r) => r.dupe && !r.include).length;
    onImport({
      txns: chosen.map((r) => ({ id: uid(), type: r.type, amount: +r.amount, category: r.category, walletId: r.walletId, date: r.date, note: r.note, ref: r.ref })),
      skipped, newWallets, newLoans,
    });
  };
  const count = rows.filter((r) => r.include).length;
  const dupes = rows.filter((r) => r.dupe).length;
  const newAccts = parsedFiles.filter((f) => f.override === "auto" && (f.target.newWallet || f.target.newLoan)).length;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <button className="sheet-x" onClick={onClose}><X size={22} /></button>
          <span className="sheet-title">Upload bank statements</span>
          <span style={{ width: 36 }} />
        </div>

        <div className="sheet-body" style={{ paddingTop: 14 }}>
          <p className="sms-help">Upload PDF statements from any bank. The app reads the account number and type from each one and routes it automatically — a deposit account becomes a wallet, a loan account becomes a loan. Re-uploads match the same account. Scanned image PDFs aren't supported.</p>

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
              {!f.target && <input className="stmt-pass" placeholder="PDF password (if any)" value={f.password || ""} onChange={(e) => updFile(f.id, "password", e.target.value)} />}
              {f.error && <div className="stmt-err">{f.error}</div>}
              {f.target && (
                <div className="stmt-detect">
                  <span className="sd-ic" style={{ background: (f.target.mode === "loan" ? "#fa5a7d" : kindOf(f.target.kind).color) + "22", color: f.target.mode === "loan" ? "#fa5a7d" : kindOf(f.target.kind).color }}>
                    {f.target.mode === "loan" ? <Banknote size={18} /> : <WalletIcon size={18} />}
                  </span>
                  <div className="sd-meta">
                    <div className="sd-name">{f.target.displayName}</div>
                    <div className="sd-sub">
                      {f.target.acct ? "A/C " + last4(f.target.acct) : "no account no."}{f.target.accType ? " · " + f.target.accType : ""}
                      {" · "}
                      {f.override !== "auto" ? "→ existing wallet"
                        : f.target.mode === "loan" ? (f.target.matchedLoanId ? "→ matched loan" : "→ new loan")
                        : (f.target.matchedWalletId ? "→ matched wallet" : "→ new wallet")}
                    </div>
                  </div>
                  <select className="sd-override" value={f.override} onChange={(e) => setOverride(f.id, e.target.value)}>
                    <option value="auto">Auto</option>
                    {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}

          {files.length > 0 && <button className="sms-auto" onClick={parseAll} disabled={!!busy}>{busy || `Read ${files.length} statement${files.length > 1 ? "s" : ""}`}</button>}

          {rows.length > 0 && <div className="sms-found">{rows.length} transactions{dupes ? ` · ${dupes} already imported` : ""}{newAccts ? ` · ${newAccts} new account${newAccts > 1 ? "s" : ""}` : ""}</div>}
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
                      {r.dupe && <span className="sms-dupe">duplicate</span>}
                      {r.transfer && <span className="sms-xfer">transfer?</span>}
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

        <button className="sheet-save" onClick={importAll} disabled={count === 0 && newAccts === 0}>
          {count > 0 ? `Import ${count} transaction${count > 1 ? "s" : ""}` : newAccts > 0 ? `Create ${newAccts} account${newAccts > 1 ? "s" : ""}` : "Nothing to import"}
        </button>
      </div>
    </div>
  );
}
