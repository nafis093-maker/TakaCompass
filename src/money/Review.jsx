import React, { useState, useRef } from "react";
import { ChevronLeft, Check, X, Inbox, Pencil } from "lucide-react";
import { EXPENSE_CATS, INCOME_CATS, catOf, tk, niceDate } from "./lib.js";
import { isNative, smsSupported, smsGranted, requestSms, readInbox } from "./native.js";

export default function Review({ pending = [], wallets, onConfirm, onDismiss, onEdit, onScan, onClose }) {
  const [scanning, setScanning] = useState("");
  const canScan = smsSupported();

  const scan = async () => {
    setScanning("Reading your inbox…");
    if (!(await smsGranted())) { const ok = await requestSms(); if (!ok) { setScanning("SMS permission denied."); return; } }
    const msgs = await readInbox();
    const added = onScan(msgs.map((m) => m.body || ""));
    setScanning(added ? `Added ${added} to review.` : "No new transactions found.");
  };

  return (
    <div className="m-app">
      <div className="ra-bar"><button className="planner-back" onClick={onClose}><ChevronLeft size={18} /> Back</button></div>
      <div className="scr" style={{ paddingTop: 4 }}>
        <div className="m-title">Review SMS</div>
        <p className="plan-intro">Transactions we spotted in your bank &amp; mobile-money texts. Swipe right to add, left to skip — or tap to edit first. Nothing is saved until you confirm it.</p>

        {canScan && <button className="m-create" onClick={scan} disabled={!!scanning}><Inbox size={18} /> {scanning || "Scan my inbox"}</button>}
        {!canScan && <p className="m-note" style={{ marginTop: 0 }}>Automatic SMS capture is Android-only (Apple doesn't allow reading texts). On iPhone and the web, add transactions with the “SMS” paste tool on the home screen, or by hand.</p>}
        {scanning && canScan && <div className="sy-status">{scanning}</div>}

        {pending.length === 0 ? (
          <p className="m-empty">Nothing to review right now.</p>
        ) : (
          <div className="rv-stack">
            {pending.map((p) => (
              <ReviewCard key={p.id} item={p} wallets={wallets}
                onConfirm={(patch) => onConfirm(p.id, patch)} onDismiss={() => onDismiss(p.id)} onEdit={() => onEdit(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ item, wallets, onConfirm, onDismiss, onEdit }) {
  const [cat, setCat] = useState(item.parsed.category);
  const [walletId, setWalletId] = useState(item.parsed.walletId || wallets[0]?.id);
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState("");
  const start = useRef(null);
  const c = catOf(cat);
  const cats = item.parsed.type === "income" ? INCOME_CATS : EXPENSE_CATS;

  const down = (e) => { start.current = (e.touches ? e.touches[0].clientX : e.clientX); };
  const move = (e) => {
    if (start.current == null) return;
    setDx((e.touches ? e.touches[0].clientX : e.clientX) - start.current);
  };
  const up = () => {
    if (start.current == null) return;
    const x = dx; start.current = null;
    if (x > 90) { setGone("right"); setTimeout(() => onConfirm({ category: cat, walletId }), 220); }
    else if (x < -90) { setGone("left"); setTimeout(onDismiss, 220); }
    else setDx(0);
  };

  const style = gone
    ? { transform: `translateX(${gone === "right" ? 600 : -600}px) rotate(${gone === "right" ? 12 : -12}deg)`, opacity: 0 }
    : { transform: `translateX(${dx}px) rotate(${dx / 28}deg)` };

  return (
    <div className="rv-card" style={style}
      onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
      onTouchStart={down} onTouchMove={move} onTouchEnd={up}>
      <div className={"rv-hint left" + (dx < -40 ? " on" : "")}>Skip</div>
      <div className={"rv-hint right" + (dx > 40 ? " on" : "")}>Add</div>

      <div className="rv-top">
        <span className="m-txic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={22} strokeWidth={2.2} /></span>
        <div className="rv-amt">
          <div className={item.parsed.type === "income" ? "pos" : "neg"}>{item.parsed.type === "income" ? "+" : "-"}{tk(item.parsed.amount)}</div>
          <div className="rv-date">{item.parsed.note || "From SMS"} · {niceDate(item.parsed.date)}</div>
        </div>
      </div>

      <div className="rv-raw">{item.raw}</div>

      <div className="rv-edit">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
        <select value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      </div>

      <div className="rv-actions">
        <button className="rv-skip" onClick={() => { setGone("left"); setTimeout(onDismiss, 220); }}><X size={18} /> Skip</button>
        <button className="rv-edit-btn" onClick={onEdit}><Pencil size={16} /></button>
        <button className="rv-add" onClick={() => { setGone("right"); setTimeout(() => onConfirm({ category: cat, walletId }), 220); }}><Check size={18} /> Add</button>
      </div>
    </div>
  );
}
