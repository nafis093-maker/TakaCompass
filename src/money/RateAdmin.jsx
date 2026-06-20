import React, { useState } from "react";
import { ChevronLeft, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { BORROW_CATS, SAVE_CATS } from "../data/products.js";
import { loadSources, saveSources, checkSource } from "./rateadmin.js";
import { uid } from "./lib.js";

const CATS = [...BORROW_CATS, ...SAVE_CATS];
const catLabel = (k) => CATS.find((c) => c.key === k)?.label || k;
const blank = () => ({ id: uid(), instName: "", instType: "Bank", cat: "home-loan", name: "", rate: "", fee: "", tenureMax: "", url: "", sponsored: false, lastChecked: "", status: "" });

export default function RateAdmin({ onClose }) {
  const [sources, setSources] = useState(() => loadSources());
  const [draft, setDraft] = useState(null); // editing object or null
  const [busy, setBusy] = useState("");

  const persist = (list) => { setSources(list); saveSources(list); };
  const save = () => {
    if (!draft.instName.trim() || !draft.rate) return;
    const list = sources.some((s) => s.id === draft.id) ? sources.map((s) => (s.id === draft.id ? draft : s)) : [...sources, draft];
    persist(list); setDraft(null);
  };
  const remove = (id) => persist(sources.filter((s) => s.id !== id));

  const check = async (s) => {
    setBusy(s.id);
    const r = await checkSource(s.url, catLabel(s.cat).toLowerCase());
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const updated = sources.map((x) => x.id === s.id ? {
      ...x,
      rate: r.ok ? r.rate : x.rate,
      lastChecked: now,
      status: r.ok ? (r.confident ? "auto-updated" : "found a rate — verify") : r.reason,
    } : x);
    persist(updated);
    setBusy("");
  };
  const refreshAll = async () => { for (const s of sources) if (s.url) await check(s); };

  return (
    <div className="m-app">
      <div className="ra-bar"><button className="planner-back" onClick={onClose}><ChevronLeft size={18} /> Back</button></div>
      <div className="scr" style={{ paddingTop: 4 }}>
        <div className="m-title">Rate sources</div>
        <p className="plan-intro">Add the banks/NBFIs you want to track and a link to their rate page. These feed into the loan &amp; deposit marketplace.</p>

        <div className="ra-actions">
          <button className="m-create" onClick={() => setDraft(blank())}><Plus size={18} /> Add a source</button>
          {sources.some((s) => s.url) && <button className="ra-refresh" onClick={refreshAll} disabled={!!busy}><RefreshCw size={16} /> Check all</button>}
        </div>

        {sources.length === 0 && <p className="m-empty">No sources yet. Add a bank's rate page to start tracking it.</p>}
        <div className="m-list">
          {sources.map((s) => (
            <div className="ra-card" key={s.id}>
              <div className="ra-top">
                <div>
                  <div className="ra-name">{s.instName} <span className="ra-cat">{catLabel(s.cat)}</span></div>
                  <div className="ra-rate">{s.rate ? s.rate + "%" : "—"}{s.sponsored ? " · sponsored" : ""}</div>
                </div>
                <div className="ra-btns">
                  <button onClick={() => setDraft({ ...s })}>Edit</button>
                  <button onClick={() => remove(s.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              {s.url && (
                <div className="ra-srcrow">
                  <a href={s.url} target="_blank" rel="noreferrer" className="ra-link"><ExternalLink size={13} /> source</a>
                  <button className="ra-check" onClick={() => check(s)} disabled={busy === s.id}>{busy === s.id ? "Checking…" : "Check now"}</button>
                  {s.lastChecked && <span className="ra-checked">{s.status} · {s.lastChecked}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="m-note">Browsers can't read most bank websites directly (the sites block cross-site requests), so "Check now" often can't auto-read a rate — when that happens, type the rate in yourself. For hands-off monitoring, the project's daily GitHub Action (<code>scripts/sync-rates.mjs</code>) can fetch these same sources server-side, where that block doesn't apply.</p>
      </div>

      {draft && (
        <div className="sheet-overlay" onClick={() => setDraft(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-top"><span style={{ width: 36 }} /><span className="sheet-title">{sources.some((s) => s.id === draft.id) ? "Edit" : "Add"} source</span><button className="sheet-ok" onClick={save}>✓</button></div>
            <div className="sheet-body" style={{ paddingTop: 14 }}>
              <input className="sheet-note" placeholder="Institution (e.g. BRAC Bank)" value={draft.instName} onChange={(e) => setDraft({ ...draft, instName: e.target.value })} />
              <div className="ra-form2">
                <select value={draft.instType} onChange={(e) => setDraft({ ...draft, instType: e.target.value })}><option>Bank</option><option>NBFI</option></select>
                <select value={draft.cat} onChange={(e) => setDraft({ ...draft, cat: e.target.value })}>{CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
              </div>
              <input className="sheet-note" placeholder="Product name (e.g. Home Loan)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <div className="ra-form2">
                <span className="m-money sm"><input inputMode="decimal" placeholder="Rate" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value.replace(/[^0-9.]/g, "") })} />%</span>
                <span className="m-money sm"><input inputMode="decimal" placeholder="Fee %" value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value.replace(/[^0-9.]/g, "") })} />%</span>
                <span className="m-money sm"><input inputMode="numeric" placeholder="Max yrs" value={draft.tenureMax} onChange={(e) => setDraft({ ...draft, tenureMax: e.target.value.replace(/[^0-9]/g, "") })} /></span>
              </div>
              <input className="sheet-note" placeholder="Rate page URL (https://…)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
              <label className="ra-spon"><input type="checkbox" checked={draft.sponsored} onChange={(e) => setDraft({ ...draft, sponsored: e.target.checked })} /> Sponsored (pin to top with a label)</label>
            </div>
            <button className="sheet-save" onClick={save}>Save source</button>
          </div>
        </div>
      )}
    </div>
  );
}
