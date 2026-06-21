import React, { useState } from "react";
import { ChevronLeft, Plus, Trash2, Pause, Play, CalendarClock } from "lucide-react";
import { EXPENSE_CATS, INCOME_CATS, catOf, tk, today, niceDate } from "./lib.js";
import { makeRule, nextAfter } from "./recurring.js";

const FREQ_LABEL = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export default function Recurring({ wallets, recurring = [], onAdd, onUpdate, onDelete, onClose, nativeReminders }) {
  const [draft, setDraft] = useState(null);
  const blank = () => ({ type: "expense", amount: "", category: "bills", walletId: wallets[0]?.id, note: "", freq: "monthly", nextDate: today() });

  const save = () => {
    if (!draft.amount || !draft.nextDate) return;
    onAdd(makeRule({ ...draft, amount: +draft.amount }));
    setDraft(null);
  };
  const sorted = [...recurring].sort((a, b) => (a.active === b.active ? a.nextDate.localeCompare(b.nextDate) : a.active ? -1 : 1));

  return (
    <div className="m-app">
      <div className="ra-bar"><button className="planner-back" onClick={onClose}><ChevronLeft size={18} /> Back</button></div>
      <div className="scr" style={{ paddingTop: 4 }}>
        <div className="m-title">Recurring &amp; bills</div>
        <p className="plan-intro">Salary, rent, EMIs, DPS — anything that repeats. They post automatically on their date, and feed the “upcoming” list on your home screen.{nativeReminders ? " Reminders are on for this device." : ""}</p>

        <button className="m-create" onClick={() => setDraft(blank())}><Plus size={18} /> Add a recurring item</button>

        {sorted.length === 0 && <p className="m-empty">Nothing recurring yet.</p>}
        <div className="m-list">
          {sorted.map((r) => {
            const c = catOf(r.category);
            return (
              <div className={"rc-card" + (r.active ? "" : " off")} key={r.id}>
                <span className="m-txic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={20} strokeWidth={2.2} /></span>
                <div className="rc-meta">
                  <div className="rc-name">{r.note || c.label}</div>
                  <div className="rc-sub"><CalendarClock size={12} /> {FREQ_LABEL[r.freq]} · next {niceDate(r.nextDate)}</div>
                </div>
                <div className="rc-right">
                  <div className={"rc-amt " + (r.type === "income" ? "pos" : "neg")}>{r.type === "income" ? "+" : "-"}{tk(r.amount)}</div>
                  <div className="rc-btns">
                    <button onClick={() => onUpdate(r.id, { active: !r.active })} title={r.active ? "Pause" : "Resume"}>{r.active ? <Pause size={15} /> : <Play size={15} />}</button>
                    <button onClick={() => onDelete(r.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="m-note">Past-due items are caught up automatically the next time you open the app. To stop one without losing its history, pause it.</p>
      </div>

      {draft && (
        <div className="sheet-overlay" onClick={() => setDraft(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-top"><span style={{ width: 36 }} /><span className="sheet-title">Add recurring item</span><button className="sheet-ok" onClick={save}>✓</button></div>
            <div className="sheet-amt"><span>৳</span><input autoFocus inputMode="numeric" value={draft.amount || ""} placeholder="0" onChange={(e) => setDraft({ ...draft, amount: e.target.value.replace(/[^0-9.]/g, "") })} /></div>
            <div className="sheet-types">
              {["expense", "income"].map((t) => (
                <button key={t} className={"st" + (draft.type === t ? " on" : "")} onClick={() => setDraft({ ...draft, type: t, category: t === "income" ? "salary" : "bills" })}>{t[0].toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            <div className="sheet-body" style={{ paddingTop: 12 }}>
              <label className="sheet-row">Category
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{(draft.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
              </label>
              <label className="sheet-row">Wallet
                <select value={draft.walletId} onChange={(e) => setDraft({ ...draft, walletId: e.target.value })}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              </label>
              <label className="sheet-row">Repeats
                <select value={draft.freq} onChange={(e) => setDraft({ ...draft, freq: e.target.value })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
              </label>
              <label className="sheet-row">Next date
                <input type="date" value={draft.nextDate} onChange={(e) => setDraft({ ...draft, nextDate: e.target.value })} />
              </label>
              <input className="sheet-note" placeholder="Name it (e.g. House rent)" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </div>
            <button className="sheet-save" onClick={save}>Add recurring item</button>
          </div>
        </div>
      )}
    </div>
  );
}
