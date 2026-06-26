import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Receipt, Wallet as WalletIcon, PiggyBank, Sparkles, MoreHorizontal,
  Plus, ChevronRight, Banknote, Download, LogOut, MessageSquareText, FileText, Trash2, Landmark, Upload,
  CalendarClock, Moon, UploadCloud, Search, Bell, Cloud, Mic,
} from "lucide-react";
import {
  EXPENSE_CATS, catOf, kindOf, tk, signed, big, uid, today, monthKey, monthLabel, niceDate,
  loadMoney, saveMoney, emptyData, sampleData, walletBalance, totalWealth, cashflowMonths, wealthSeries, budgetSpent, categoryBreakdown, txnFingerprint,
} from "./lib.js";
import { CashflowBars, WealthLine, Donut } from "./charts.jsx";
import AddTxn from "./AddTxn.jsx";
import AddAccount from "./AddAccount.jsx";
import ImportSms from "./ImportSms.jsx";
import StatementImport from "./StatementImport.jsx";
import RateAdmin from "./RateAdmin.jsx";
import Recurring from "./Recurring.jsx";
import Zakat from "./Zakat.jsx";
import Wrapped from "./Wrapped.jsx";
import Sync from "./Sync.jsx";
import Review from "./Review.jsx";
import VoiceQuickAdd from "./VoiceQuickAdd.jsx";
import Plan from "./Plan.jsx";
import { CountUp } from "./anim.jsx";
import { voiceAvailable } from "./voice.js";
import { warmTts } from "./tts.js";
import { t, useLang, setLang, getLang } from "./i18n.js";
import { syncConfigured, pull as syncPull, push as syncPush, loadMeta as loadSyncMeta, saveMeta as saveSyncMeta } from "./sync.js";
import { derive } from "./derive.js";
import { buildInsights } from "./planlib.js";
import { materializeDue, nextAfter, upcoming, makeRule } from "./recurring.js";
import { parseOne } from "./smsparse.js";
import { isNative, smsSupported, watchSms, stopWatch, scheduleReminders, remindersAvailable } from "./native.js";

const NAV = [
  { key: "timeline", label: "Timeline", Icon: Receipt },
  { key: "wallets", label: "Wallets", Icon: WalletIcon },
  { key: "budgets", label: "Budgets", Icon: PiggyBank },
  { key: "plan", label: "Plan", Icon: Sparkles },
  { key: "more", label: "More", Icon: MoreHorizontal },
];

export default function MoneyApp({ user, onSignOut, onReauth }) {
  useLang();
  const [data, setData] = useState(() => loadMoney(user.email));
  const [tab, setTab] = useState("timeline");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addAcct, setAddAcct] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [zakatOpen, setZakatOpen] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  useEffect(() => { voiceAvailable().then(setCanVoice); }, []);
  const [editPendId, setEditPendId] = useState(null);

  const fp = (parsed) => txnFingerprint(parsed);
  const enqueueOne = (raw) => setData((d) => {
    const p = parseOne(raw || ""); if (!p || !(p.amount > 0)) return d;
    const parsed = { ...p, walletId: d.wallets[0]?.id };
    const f = fp(parsed);
    if (d.txns.some((t) => fp(t) === f) || (d.pending || []).some((x) => fp(x.parsed) === f)) return d;
    return { ...d, pending: [...(d.pending || []), { id: uid(), raw: p.raw || raw, parsed, ts: Date.now() }] };
  });
  const enqueueMany = (rawList) => {
    const existing = new Set(txns.map(fp));
    const pend = data.pending || [];
    const seen = new Set(pend.map((x) => fp(x.parsed)));
    const add = [];
    rawList.forEach((raw) => {
      const p = parseOne(raw || ""); if (!p || !(p.amount > 0)) return;
      const parsed = { ...p, walletId: wallets[0]?.id };
      const f = fp(parsed);
      if (existing.has(f) || seen.has(f)) return;
      seen.add(f); add.push({ id: uid(), raw: p.raw || raw, parsed, ts: Date.now() });
    });
    if (add.length) setData((d) => ({ ...d, pending: [...(d.pending || []), ...add] }));
    return add.length;
  };
  const confirmPending = (id, patch = {}) => setData((d) => {
    const it = (d.pending || []).find((p) => p.id === id); if (!it) return d;
    const t = { id: uid(), type: it.parsed.type, amount: it.parsed.amount, category: patch.category || it.parsed.category, walletId: patch.walletId || it.parsed.walletId || d.wallets[0]?.id, date: it.parsed.date, note: it.parsed.note, ref: it.parsed.ref };
    return { ...d, txns: [...d.txns, t], pending: d.pending.filter((p) => p.id !== id) };
  });
  const dismissPending = (id) => setData((d) => ({ ...d, pending: (d.pending || []).filter((p) => p.id !== id) }));
  const editPending = (item) => {
    setReviewOpen(false);
    setEditing({ type: item.parsed.type, amount: item.parsed.amount, category: item.parsed.category, walletId: item.parsed.walletId || wallets[0]?.id, date: item.parsed.date, note: item.parsed.note });
    setEditPendId(item.id);
    setAdding(true);
  };

  useEffect(() => { saveMoney(user.email, data); }, [user.email, data]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 3500); return () => clearTimeout(id); }, [toast]);

  // On native Android: capture new transaction SMS into the review queue.
  useEffect(() => {
    if (!smsSupported()) return;
    let sub;
    watchSms((ev) => enqueueOne(ev.body || "")).then((s) => { sub = s; });
    return () => { if (sub && sub.remove) sub.remove(); stopWatch(); };
  }, []);

  const { wallets, txns, budgets, loans = [], goals = [], recurring = [] } = data;

  // Most-used (category, amount) combos for one-tap entry.
  const quickSuggest = useMemo(() => {
    const map = {};
    txns.filter((t) => t.type === "expense").forEach((t) => {
      const k = t.category + "|" + Math.round(t.amount);
      (map[k] = map[k] || { category: t.category, amount: Math.round(t.amount), n: 0 }).n++;
    });
    return Object.values(map).sort((a, b) => b.n - a.n).slice(0, 5);
  }, [txns]);

  // Catch up any due recurring transactions when the app opens.
  useEffect(() => {
    setData((d) => {
      const res = materializeDue(d);
      if (!res.txns.length) return d;
      return { ...d, txns: [...d.txns, ...res.txns], recurring: res.recurring };
    });
  }, []);

  // Keep device reminders in sync with upcoming bills (native only).
  useEffect(() => { if (isNative()) scheduleReminders(upcoming(data.recurring, 31)); }, [data.recurring]);

  // Receive shared text (iOS Shortcuts / share sheet, or any takacompass://add link)
  // → parse → drop into the review queue. Works on iOS where SMS can't be read.
  useEffect(() => {
    if (!isNative()) return;
    let sub;
    const handle = (url) => {
      if (!url) return;
      let text = "";
      try { const u = new URL(url); if (u.host === "add" || /(^|\/)add/.test(u.pathname)) text = u.searchParams.get("text") || ""; }
      catch { const m = /[?&]text=([^&]+)/.exec(url); if (m) text = decodeURIComponent(m[1]); }
      if (!text) return;
      const p = parseOne(text);
      if (!p || !(p.amount > 0)) { setToast("Couldn't find a transaction in that message"); return; }
      enqueueOne(text);
      setReviewOpen(true);
      setToast("Added to review from share");
    };
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        try { const l = await App.getLaunchUrl(); if (l && l.url) handle(l.url); } catch {}
        sub = await App.addListener("appUrlOpen", (e) => handle(e.url));
      } catch {}
    })();
    return () => { if (sub && sub.remove) sub.remove(); };
  }, []);

  // Opt-in cloud auto-sync: pull on open if remote is newer, push on change.
  const syncTimer = useRef(null);
  useEffect(() => {
    if (!syncConfigured() || !user.token) return;
    const meta = loadSyncMeta(user.email);
    if (!meta.auto) return;
    (async () => {
      try {
        const res = await syncPull(user.token);
        if (res && res.data && Array.isArray(res.data.wallets) && (res.updatedAt || 0) > (meta.lastPush || 0)) {
          setData(res.data);
          saveSyncMeta(user.email, { ...meta, lastPull: Date.now(), remoteAt: res.updatedAt });
        }
      } catch {}
    })();
  }, []);
  useEffect(() => {
    if (!syncConfigured() || !user.token) return;
    const meta = loadSyncMeta(user.email);
    if (!meta.auto) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try { const at = Date.now(); await syncPush(user.token, data, at); saveSyncMeta(user.email, { ...loadSyncMeta(user.email), lastPush: at, remoteAt: at }); } catch {}
    }, 2500);
    return () => clearTimeout(syncTimer.current);
  }, [data]);

  const importTxns = (list, skipped = 0) => {
    if (list && list.length) setData((d) => ({ ...d, txns: [...d.txns, ...list] }));
    setImporting(false);
    const n = list ? list.length : 0;
    const parts = [`Imported ${n} transaction${n === 1 ? "" : "s"}`];
    if (skipped) parts.push(`${skipped} duplicate${skipped === 1 ? "" : "s"} skipped`);
    setToast(n || skipped ? parts.join(" · ") : "Nothing to import");
  };
  const importStatement = ({ txns = [], skipped = 0, newWallets = [], newLoans = [] }) => {
    setData((d) => ({
      ...d,
      wallets: newWallets.length ? [...d.wallets, ...newWallets] : d.wallets,
      loans: newLoans.length ? [...(d.loans || []), ...newLoans] : (d.loans || []),
      txns: txns.length ? [...d.txns, ...txns] : d.txns,
    }));
    setUploading(false);
    const created = newWallets.length + newLoans.length;
    const parts = [];
    if (created) parts.push(`${created} account${created === 1 ? "" : "s"} added`);
    parts.push(`${txns.length} transaction${txns.length === 1 ? "" : "s"} imported`);
    if (skipped) parts.push(`${skipped} duplicate${skipped === 1 ? "" : "s"} skipped`);
    setToast(parts.join(" · "));
  };
  const clearData = () => { setData(emptyData()); setTab("timeline"); setToast("All data cleared"); };
  const loadSample = () => { setData(sampleData()); setTab("timeline"); setToast("Sample data loaded — clear it anytime from More"); };
  const restoreData = (obj) => {
    if (!obj || !Array.isArray(obj.wallets)) { setToast("That file isn't a Hisab backup"); return; }
    setData({ wallets: obj.wallets, txns: obj.txns || [], budgets: obj.budgets || [], loans: obj.loans || [], goals: obj.goals || [], recurring: obj.recurring || [] });
    setTab("timeline"); setToast("Backup restored");
  };
  const exportCsv = () => {
    const wn = (id) => wallets.find((w) => w.id === id)?.name || "";
    const rows = [["Date", "Type", "Category", "Amount", "Wallet", "Note"]];
    [...txns].sort((a, b) => a.date.localeCompare(b.date)).forEach((t) => rows.push([t.date, t.type, t.category || "", t.amount, wn(t.walletId), t.note || ""]));
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "taka-compass-transactions.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const saveTxn = (t, repeat) => {
    setData((d) => {
      const txns = d.txns.some((x) => x.id === t.id) ? d.txns.map((x) => (x.id === t.id ? t : x)) : [...d.txns, t];
      let recurring = d.recurring || [];
      if (repeat && repeat.freq && !t.recurringId && !d.txns.some((x) => x.id === t.id)) {
        recurring = [...recurring, makeRule({ ...t, freq: repeat.freq, nextDate: nextAfter(t.date, repeat.freq, t.date) })];
      }
      const pending = editPendId ? (d.pending || []).filter((p) => p.id !== editPendId) : d.pending;
      return { ...d, txns, recurring, pending };
    });
    setEditPendId(null);
    setAdding(false); setEditing(null);
  };
  const addRule = (r) => setData((d) => ({ ...d, recurring: [...(d.recurring || []), r] }));
  const updRule = (id, patch) => setData((d) => ({ ...d, recurring: (d.recurring || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const delRule = (id) => setData((d) => ({ ...d, recurring: (d.recurring || []).filter((r) => r.id !== id) }));
  const delTxn = (id) => setData((d) => ({ ...d, txns: d.txns.filter((t) => t.id !== id) }));
  const addWallet = (w) => setData((d) => ({ ...d, wallets: [...d.wallets, w] }));
  const delWallet = (id) => {
    if (wallets.length <= 1) { setToast("Keep at least one wallet"); return; }
    if (txns.some((t) => t.walletId === id || t.toWalletId === id)) { setToast("This wallet still has transactions — remove or reassign them first"); return; }
    setData((d) => ({ ...d, wallets: d.wallets.filter((w) => w.id !== id) }));
  };
  const addLoan = (l) => setData((d) => ({ ...d, loans: [...(d.loans || []), l] }));
  const delLoan = (id) => setData((d) => ({ ...d, loans: (d.loans || []).filter((l) => l.id !== id) }));
  const addBudget = (b) => setData((d) => ({ ...d, budgets: [...d.budgets, { ...b, id: uid() }] }));
  const delBudget = (id) => setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
  const addGoal = (g) => setData((d) => ({ ...d, goals: [...(d.goals || []), { ...g, id: uid() }] }));
  const delGoal = (id) => setData((d) => ({ ...d, goals: (d.goals || []).filter((g) => g.id !== id) }));

  if (adminOpen) return <RateAdmin onClose={() => setAdminOpen(false)} />;
  if (recurringOpen) return <Recurring wallets={wallets} recurring={recurring} onAdd={addRule} onUpdate={updRule} onDelete={delRule} nativeReminders={remindersAvailable()} onClose={() => setRecurringOpen(false)} />;
  if (zakatOpen) return <Zakat wallets={wallets} txns={txns} onClose={() => setZakatOpen(false)} />;
  if (syncOpen) return <Sync user={user} data={data} onReauth={onReauth} onApply={(d) => { setData(d); setTab("timeline"); setToast("Synced from cloud"); }} onClose={() => setSyncOpen(false)} />;
  if (reviewOpen) return <Review pending={data.pending || []} wallets={wallets} onConfirm={confirmPending} onDismiss={dismissPending} onEdit={editPending} onScan={enqueueMany} onClose={() => setReviewOpen(false)} />;

  return (
    <div className="m-app">
      <div className="m-screen">
        {tab === "timeline" && <Timeline data={data} userName={user.name} onEdit={(t) => { setEditing(t); setAdding(true); }} goPlan={() => setTab("plan")} openImport={() => setImporting(true)} openUpload={() => setUploading(true)} openAdd={() => { setEditing(null); setAdding(true); }} onAddAccount={() => setAddAcct(true)} onSample={loadSample} onCsv={exportCsv} openRecurring={() => setRecurringOpen(true)} openWrapped={() => setWrappedOpen(true)} openReview={() => setReviewOpen(true)} />}
        {tab === "wallets" && <Wallets data={data} onAdd={() => setAddAcct(true)} delWallet={delWallet} delLoan={delLoan} />}
        {tab === "budgets" && <Budgets data={data} addBudget={addBudget} delBudget={delBudget} />}
        {tab === "plan" && <Plan data={data} addGoal={addGoal} delGoal={delGoal} />}
        {tab === "more" && <More data={data} user={user} onSignOut={onSignOut} onClear={clearData} onAdmin={() => setAdminOpen(true)} onRecurring={() => setRecurringOpen(true)} onZakat={() => setZakatOpen(true)} onRestore={restoreData} onSample={loadSample} onWrapped={() => setWrappedOpen(true)} onSync={() => setSyncOpen(true)} onReview={() => setReviewOpen(true)} />}
      </div>

      {tab === "timeline" && (
        <button className="m-fab" onClick={() => { setEditing(null); setAdding(true); }} aria-label="Add transaction"><Plus size={26} strokeWidth={2.6} /></button>
      )}
      {tab === "timeline" && (
        <button className="m-fab-mic" onClick={() => { warmTts(); setVoiceOpen(true); }} aria-label="Quick add by voice or text" title="Quick add"><Mic size={24} strokeWidth={2.4} /></button>
      )}
      <button className={"m-fab2" + (tab === "timeline" ? " stacked" : "")} onClick={() => setUploading(true)} aria-label="Upload bank statement" title="Upload statement">
        <Upload size={20} strokeWidth={2.4} />
      </button>

      {voiceOpen && <VoiceQuickAdd onClose={() => setVoiceOpen(false)} onDone={(p) => { setVoiceOpen(false); setEditing({ type: p.type, amount: p.amount, category: p.category, walletId: wallets[0]?.id, date: today(), note: p.note }); setAdding(true); }} />}

      {toast && <div className="m-toast">{toast}</div>}

      <nav className="m-nav">
        {NAV.map((n) => (
          <button key={n.key} className={"m-navi" + (tab === n.key ? " on" : "")} onClick={() => setTab(n.key)}>
            <n.Icon size={21} strokeWidth={tab === n.key ? 2.6 : 2} />
            <span>{t("nav." + n.key)}</span>
          </button>
        ))}
      </nav>

      {adding && <AddTxn wallets={wallets} initial={editing} quick={quickSuggest} onClose={() => { setAdding(false); setEditing(null); }} onSave={saveTxn} />}
      {addAcct && <AddAccount onClose={() => setAddAcct(false)} onAddWallet={(w) => { addWallet(w); setAddAcct(false); }} onAddLoan={(l) => { addLoan(l); setAddAcct(false); }} />}
      {importing && <ImportSms wallets={wallets} existing={txns} onClose={() => setImporting(false)} onImport={importTxns} />}
      {uploading && <StatementImport wallets={wallets} loans={loans} existing={txns} onClose={() => setUploading(false)} onImport={importStatement} />}
      {wrappedOpen && <Wrapped data={data} onClose={() => setWrappedOpen(false)} />}
    </div>
  );
}

function Timeline({ data, userName, onEdit, goPlan, openImport, openUpload, openAdd, onAddAccount, onSample, onCsv, openRecurring, openWrapped, openReview }) {
  const { txns, wallets, recurring = [], pending = [] } = data;
  const first = (userName || "").trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greetWord = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const mk = today().slice(0, 7);
  const month = txns.filter((t) => monthKey(t.date) === mk);
  const spent = month.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const cats = useMemo(() => categoryBreakdown(txns, "expense", mk), [txns, mk]);
  const d = useMemo(() => derive(data), [data]);
  const insights = useMemo(() => buildInsights(d, Math.min(0.2 * d.monthlyIncome * 12, 1000000) * 0.5), [d]);
  const hero = insights[0];
  const [seg, setSeg] = useState("spend");
  const [q, setQ] = useState("");
  const soon = useMemo(() => upcoming(recurring, 14), [recurring]);
  const wname = (id) => wallets.find((w) => w.id === id)?.name || "Wallet";

  const ql = q.trim().toLowerCase();
  const shown = ql
    ? txns.filter((t) => (t.note || "").toLowerCase().includes(ql) || catOf(t.category).label.toLowerCase().includes(ql) || String(t.amount).includes(ql) || wname(t.walletId).toLowerCase().includes(ql))
    : txns;
  const sorted = [...shown].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  const groups = [];
  sorted.forEach((t) => {
    const g = groups.find((x) => x.date === t.date);
    (g || groups[groups.push({ date: t.date, items: [] }) - 1]).items.push(t);
  });

  if (txns.length === 0) {
    return (
      <div className="scr">
        <div className="m-onb">
          <div className="m-onb-badge">৳</div>
          <h2>{t("app.name")}</h2>
          <p>Track your money, see where it goes, and get plain-English suggestions tuned for Bangladesh. Pick a way to start:</p>
          <button className="m-onb-act" onClick={openAdd}><span className="oa-ic" style={{ background: "#eefaf4", color: "#0ea372" }}><Plus size={18} /></span><span className="oa-tx"><b>Add income or an expense</b><i>Log your first transaction by hand</i></span><ChevronRight size={18} /></button>
          <button className="m-onb-act" onClick={openUpload}><span className="oa-ic" style={{ background: "#e9f5fa", color: "#0891b2" }}><FileText size={18} /></span><span className="oa-tx"><b>Import a bank statement</b><i>Upload a PDF — we read the account &amp; transactions</i></span><ChevronRight size={18} /></button>
          <button className="m-onb-act" onClick={onAddAccount}><span className="oa-ic" style={{ background: "#f3f0fb", color: "#8b5cf6" }}><WalletIcon size={18} /></span><span className="oa-tx"><b>Add a wallet or account</b><i>Cash, bank, FDR, Sanchayapatra, gold…</i></span><ChevronRight size={18} /></button>
          <button className="m-onb-sample" onClick={onSample}>Just exploring? Load sample data</button>
        </div>
      </div>
    );
  }

  const PRIORITY = hero && (hero.level === "alert" || hero.level === "warn");

  return (
    <div className="scr">
      <div className="m-head">
        <div className="m-greet">{greetWord}{first ? ", " + first : ""} <span className="m-wave">👋</span></div>
        <div className="m-headcard">
          <div className="m-headtop">
            <span className="m-headlbl">Total wealth</span>
            <span className="m-pill" onClick={openWrapped} role="button">{monthLabel(mk)} ↗</span>
          </div>
          <div className="m-bignum"><CountUp value={totalWealth(wallets, txns)} format={tk} /></div>
          <div className="m-sublabel">{tk(spent)} spent in {monthLabel(mk)}</div>
        </div>
      </div>

      {pending.length > 0 && (
        <button className="m-review-banner" onClick={openReview}>
          <span className="mrb-dot">{pending.length}</span>
          <span className="mrb-tx"><b>{pending.length} transaction{pending.length === 1 ? "" : "s"} to review</b> from your SMS</span>
          <ChevronRight size={18} />
        </button>
      )}

      {hero && (
        <button className={"m-hero " + hero.level} onClick={goPlan}>
          <span className="mh-tag">{hero.tagText}{PRIORITY ? " · top priority" : ""}</span>
          <b>{hero.title}</b>
          <p>{hero.body}</p>
          {hero.action && <p className="mh-fix">{hero.action}</p>}
          <span className="mh-go">Open plan <ChevronRight size={14} /></span>
        </button>
      )}

      <div className="m-toggle home-seg">
        <button className={seg === "spend" ? "on" : ""} onClick={() => setSeg("spend")}>Spending</button>
        <button className={seg === "ins" ? "on" : ""} onClick={() => setSeg("ins")}>Insights{insights.length > 1 ? ` (${insights.length})` : ""}</button>
        <button className={seg === "act" ? "on" : ""} onClick={() => setSeg("act")}>Activity</button>
      </div>

      {seg === "spend" && (
        cats.length > 0 ? (
          <>
            <div className="m-spendcard">
              <Donut slices={cats} centerLabel={big(spent)} />
              <div className="m-catlist">
                {cats.slice(0, 5).map((c) => (
                  <div key={c.key} className="m-catrow" onClick={goPlan}>
                    <span className="m-catic" style={{ background: c.color + "1f", color: c.color }}><c.Icon size={19} strokeWidth={2.2} /></span>
                    <div className="m-catmeta">
                      <div className="m-catname">{c.label}</div>
                      <div className="m-catsub">{tk(c.amount)}</div>
                    </div>
                    <div className="m-catpct">{Math.round(c.pct)}%</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="m-overview" onClick={goPlan}><Sparkles size={16} /> Full breakdown <ChevronRight size={16} /></button>
          </>
        ) : <p className="m-empty">No spending logged this month yet.</p>
      )}

      {seg === "ins" && (
        <div className="plan-cards" style={{ marginTop: 4 }}>
          {insights.map((c, i) => (
            <div className={"pcard " + c.level} key={i}>
              <span className="pc-tag">{c.tagText}</span>
              <b>{c.title}</b>
              <p>{c.body}</p>
              {c.action && <p className="pc-fix"><span>Suggestion</span>{c.action}</p>}
            </div>
          ))}
          <button className="m-overview" style={{ alignSelf: "center" }} onClick={goPlan}><Sparkles size={16} /> Goals, tax &amp; projections <ChevronRight size={16} /></button>
        </div>
      )}

      {seg === "act" && (
        <>
          {soon.length > 0 && (
            <button className="m-upcoming" onClick={openRecurring}>
              <span className="mu-ic"><Bell size={16} /></span>
              <span className="mu-tx"><b>{soon.length} upcoming</b> in the next 2 weeks · next {niceDate(soon[0].nextDate)} {soon[0].note ? "· " + soon[0].note : ""}</span>
              <ChevronRight size={16} />
            </button>
          )}
          <div className="m-overrow">
            <button className="m-overview alt" onClick={openUpload}><FileText size={16} /> Statement</button>
            <button className="m-overview alt" onClick={openImport}><MessageSquareText size={16} /> SMS</button>
            <button className="m-overview alt" onClick={onCsv} title="Export CSV"><Download size={16} /> CSV</button>
          </div>
          <div className="m-search">
            <Search size={16} />
            <input placeholder="Search transactions…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button onClick={() => setQ("")}>✕</button>}
          </div>
          {groups.length === 0 && <p className="m-empty">{ql ? "No matches." : "No transactions yet. Tap + to add your first one."}</p>}
          {groups.map((g) => {
            const dayTotal = g.items.reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0);
            return (
              <div className="m-group" key={g.date}>
                <div className="m-grouphd"><span>{niceDate(g.date)}</span><span className={dayTotal >= 0 ? "pos" : "neg"}>{signed(dayTotal)}</span></div>
                {g.items.map((t) => {
                  const c = catOf(t.category);
                  const isT = t.type === "transfer";
                  return (
                    <div className="m-txn" key={t.id} onClick={() => onEdit(t)}>
                      <span className="m-txic" style={{ background: (isT ? "#94a3b8" : c.color) + "22", color: isT ? "#64748b" : c.color }}>
                        {isT ? <ChevronRight size={20} /> : <c.Icon size={20} strokeWidth={2.2} />}
                      </span>
                      <div className="m-txmeta">
                        <div className="m-txname">{isT ? "Transfer" : c.label}{t.recurringId ? <span className="m-tag-rec">auto</span> : ""}</div>
                        <div className="m-txwallet">{wname(t.walletId)}{t.note ? " · " + t.note : ""}</div>
                      </div>
                      {t.receipt && <img className="m-txrcpt" src={t.receipt} alt="receipt" />}
                      <div className={"m-txamt " + (t.type === "income" ? "pos" : t.type === "expense" ? "neg" : "")}>
                        {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}{tk(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function Wallets({ data, onAdd, delWallet, delLoan }) {
  const { wallets, txns, loans = [] } = data;
  const assets = totalWealth(wallets, txns);
  const owed = loans.reduce((s, l) => s + l.bal, 0);
  const net = assets - owed;
  const series = useMemo(() => wealthSeries(wallets, txns, 6), [wallets, txns]);
  return (
    <div className="scr">
      <div className="m-head"><div className="m-bignum"><CountUp value={net} format={tk} /></div><div className="m-sublabel">Net worth · {tk(assets)} assets − {tk(owed)} loans</div></div>
      <WealthLine data={series} />
      <div className="plan-sec">Accounts</div>
      <div className="m-list">
        {wallets.map((w) => (
          <div className="m-wallet" key={w.id} onClick={() => { if (confirm("Remove " + w.name + "?")) delWallet(w.id); }}>
            <span className="m-wic" style={{ background: kindOf(w.kind).color + "22", color: kindOf(w.kind).color }}><WalletIcon size={20} /></span>
            <div className="m-wmeta"><div className="m-wname">{w.name}</div><div className="m-txwallet">{kindOf(w.kind).label}</div></div>
            <div className="m-wbal">{tk(walletBalance(w, txns))}</div>
          </div>
        ))}
      </div>
      {loans.length > 0 && (
        <>
          <div className="plan-sec">Loans (you owe)</div>
          <div className="m-list">
            {loans.map((l) => (
              <div className="m-wallet" key={l.id} onClick={() => { if (confirm("Remove " + l.name + "?")) delLoan(l.id); }}>
                <span className="m-wic" style={{ background: "#fa5a7d22", color: "#fa5a7d" }}><Banknote size={20} /></span>
                <div className="m-wmeta"><div className="m-wname">{l.name}</div><div className="m-txwallet">{l.rate}% · EMI {tk(l.emi)}</div></div>
                <div className="m-wbal neg">-{tk(l.bal)}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <button className="m-addrow" onClick={onAdd}><Plus size={18} /> Add account or loan</button>
    </div>
  );
}

function Budgets({ data, addBudget, delBudget }) {
  const { budgets, txns } = data;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("all");
  const mk = today().slice(0, 7);
  const create = () => {
    if (!name.trim() || amount <= 0) return;
    addBudget({ name: name.trim(), amount: +amount, category });
    setName(""); setAmount(0); setCategory("all"); setOpen(false);
  };
  return (
    <div className="scr">
      <div className="m-title">Budgets</div>
      {budgets.length === 0 && <p className="m-empty">No budgets yet. Create one to keep spending in check.</p>}
      <div className="m-list">
        {budgets.map((b) => {
          const spent = budgetSpent(b, txns, mk);
          const left = b.amount - spent;
          const pct = b.amount ? Math.min(100, (spent / b.amount) * 100) : 0;
          const over = spent > b.amount;
          return (
            <div className="m-budget" key={b.id} onClick={() => { if (confirm("Delete this budget?")) delBudget(b.id); }}>
              <div className="m-budgethd"><span className="m-bname">{b.name}</span><span className="m-bcat">{b.category === "all" ? "All expenses" : catOf(b.category).label}</span></div>
              <div className={"m-bleft " + (over ? "neg" : "pos")}>{over ? tk(-left) + " over" : tk(left) + " left"} <small>of {tk(b.amount)}</small></div>
              <div className="m-bbar"><span className={over ? "over" : ""} style={{ width: pct + "%" }}>{Math.round((spent / (b.amount || 1)) * 100)}%</span></div>
            </div>
          );
        })}
      </div>
      {open ? (
        <div className="m-bform">
          <input placeholder="Budget name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="m-bform-row">
            <span className="m-money"><i>৳</i><input inputMode="numeric" placeholder="Amount" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} /></span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All expenses</option>
              {EXPENSE_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="m-bform-actions"><button className="ghost" onClick={() => setOpen(false)}>Cancel</button><button className="primary" onClick={create}>Create budget</button></div>
        </div>
      ) : (
        <button className="m-create" onClick={() => setOpen(true)}><Plus size={18} /> Create a new budget</button>
      )}
    </div>
  );
}

function More({ data, user, onSignOut, onClear, onAdmin, onRecurring, onZakat, onRestore, onSample, onWrapped, onSync, onReview }) {
  const pendN = (data.pending || []).length;
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "taka-compass-data.json"; a.click();
  };
  const restore = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { onRestore(JSON.parse(r.result)); } catch { onRestore(null); } };
    r.readAsText(f); e.target.value = "";
  };
  const clear = () => {
    if (!confirm("Clear ALL data — every transaction, wallet, budget, loan and goal? This can't be undone.")) return;
    if (!confirm("Are you absolutely sure? Tip: export a backup first.")) return;
    onClear();
  };
  return (
    <div className="scr">
      <div className="m-title">{t("nav.more")}</div>
      <div className="m-profile">
        {user.picture ? <img src={user.picture} alt="" /> : <span className="m-pava">{(user.name || "U")[0]}</span>}
        <div><div className="m-pname">{user.name}</div><div className="m-pmail">{user.email}</div></div>
      </div>
      <div className="m-lang">
        <span className="m-lang-lb">{t("lang.label")}</span>
        <div className="m-lang-seg">
          <button className={getLang() === "en" ? "on" : ""} onClick={() => setLang("en")}>English</button>
          <button className={getLang() === "bn" ? "on" : ""} onClick={() => setLang("bn")}>বাংলা</button>
        </div>
      </div>
      <div className="m-menu">
        <button onClick={onWrapped}><span className="mm-ic" style={{ color: "#fff", background: "linear-gradient(135deg,#8b5cf6,#0ea372)" }}><Sparkles size={20} /></span><span className="mm-txt"><b>{t("more.wrapped.t")}</b><i>{t("more.wrapped.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={onReview}><span className="mm-ic" style={{ color: "#0891b2", background: "#e9f5fa" }}><MessageSquareText size={20} /></span><span className="mm-txt"><b>{t("more.review.t")}{pendN ? ` (${pendN})` : ""}</b><i>{t("more.review.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={onRecurring}><span className="mm-ic" style={{ color: "#f59f0a", background: "#fff5e0" }}><CalendarClock size={20} /></span><span className="mm-txt"><b>{t("more.recurring.t")}</b><i>{t("more.recurring.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={onZakat}><span className="mm-ic" style={{ color: "#10b981", background: "#eefaf4" }}><Moon size={20} /></span><span className="mm-txt"><b>{t("more.zakat.t")}</b><i>{t("more.zakat.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={exportData}><span className="mm-ic" style={{ color: "#0891b2" }}><Download size={20} /></span><span className="mm-txt"><b>{t("more.export.t")}</b><i>{t("more.export.s")}</i></span><ChevronRight size={18} /></button>
        <label className="mm-file"><span className="mm-ic" style={{ color: "#0891b2" }}><UploadCloud size={20} /></span><span className="mm-txt"><b>{t("more.restore.t")}</b><i>{t("more.restore.s")}</i></span><ChevronRight size={18} /><input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={restore} /></label>
        <button onClick={onSync}><span className="mm-ic" style={{ color: "#2563eb", background: "#eaf1fe" }}><Cloud size={20} /></span><span className="mm-txt"><b>{t("more.sync.t")}</b><i>{t("more.sync.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={onAdmin}><span className="mm-ic" style={{ color: "#0ea372" }}><Landmark size={20} /></span><span className="mm-txt"><b>{t("more.rates.t")}</b><i>{t("more.rates.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={onSample}><span className="mm-ic" style={{ color: "#8b5cf6", background: "#f3f0fb" }}><Sparkles size={20} /></span><span className="mm-txt"><b>{t("more.sample.t")}</b><i>{t("more.sample.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={clear}><span className="mm-ic" style={{ color: "#fa5a7d", background: "#fef0f3" }}><Trash2 size={20} /></span><span className="mm-txt"><b>{t("more.clear.t")}</b><i>{t("more.clear.s")}</i></span><ChevronRight size={18} /></button>
        <button onClick={onSignOut}><span className="mm-ic" style={{ color: "#fa5a7d" }}><LogOut size={20} /></span><span className="mm-txt"><b>{t("more.signout.t")}</b></span><ChevronRight size={18} /></button>
      </div>
      <p className="m-note">One app: log income, spending, wallets, loans and goals the simple way — the Plan tab turns it all into net worth, budgets, tax, projections and live loan/deposit rates automatically. Your data stays in this browser; there's no bank auto-sync (Bangladesh has no open-banking feed yet), which also keeps it fully private to you. Export a backup now and then so you don't lose it.</p>
    </div>
  );
}
