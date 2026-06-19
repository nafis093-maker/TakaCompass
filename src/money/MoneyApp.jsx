import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt, Wallet as WalletIcon, PiggyBank, BarChart3, MoreHorizontal,
  Plus, ChevronRight, ChevronLeft, PieChart, Sparkles, Store, Download, LogOut, Search,
} from "lucide-react";
import {
  EXPENSE_CATS, catOf, tk, signed, big, uid, today, monthKey, monthLabel, niceDate,
  loadMoney, saveMoney, walletBalance, totalWealth, cashflowMonths, wealthSeries,
  categoryBreakdown, budgetSpent,
} from "./lib.js";
import { CashflowBars, WealthLine, Donut } from "./charts.jsx";
import AddTxn from "./AddTxn.jsx";
import Dashboard from "../Dashboard.jsx";
import { loadData, saveData } from "../lib/storage.js";

const NAV = [
  { key: "timeline", label: "Timeline", Icon: Receipt },
  { key: "wallets", label: "Wallets", Icon: WalletIcon },
  { key: "budgets", label: "Budgets", Icon: PiggyBank },
  { key: "stats", label: "Stats", Icon: BarChart3 },
  { key: "more", label: "More", Icon: MoreHorizontal },
];

export default function MoneyApp({ user, onSignOut }) {
  const [data, setData] = useState(() => loadMoney(user.email));
  const [tab, setTab] = useState("timeline");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [subview, setSubview] = useState(null);

  useEffect(() => { saveMoney(user.email, data); }, [user.email, data]);

  const { wallets, txns, budgets } = data;
  const saveTxn = (t) => {
    setData((d) => ({ ...d, txns: d.txns.some((x) => x.id === t.id) ? d.txns.map((x) => (x.id === t.id ? t : x)) : [...d.txns, t] }));
    setAdding(false); setEditing(null);
  };
  const delTxn = (id) => setData((d) => ({ ...d, txns: d.txns.filter((t) => t.id !== id) }));
  const addWallet = (name) => name && setData((d) => ({ ...d, wallets: [...d.wallets, { id: uid(), name, opening: 0, color: "#0ea372" }] }));
  const addBudget = (b) => setData((d) => ({ ...d, budgets: [...d.budgets, { ...b, id: uid() }] }));
  const delBudget = (id) => setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));

  if (subview === "planner") {
    return (
      <div className="planner-wrap">
        <button className="planner-back" onClick={() => setSubview(null)}><ChevronLeft size={18} /> Back to money</button>
        <Dashboard initial={loadData(user.email)} onPersist={(d) => saveData(user.email, d)} user={user} onSignOut={onSignOut} />
      </div>
    );
  }

  return (
    <div className="m-app">
      <div className="m-screen">
        {tab === "timeline" && <Timeline data={data} onEdit={(t) => { setEditing(t); setAdding(true); }} onDel={delTxn} goStats={() => setTab("stats")} />}
        {tab === "wallets" && <Wallets data={data} addWallet={addWallet} />}
        {tab === "budgets" && <Budgets data={data} addBudget={addBudget} delBudget={delBudget} />}
        {tab === "stats" && <Stats data={data} />}
        {tab === "more" && <More data={data} user={user} onSignOut={onSignOut} openPlanner={() => setSubview("planner")} />}
      </div>

      {tab !== "more" && (
        <button className="m-fab" onClick={() => { setEditing(null); setAdding(true); }} aria-label="Add transaction"><Plus size={26} strokeWidth={2.6} /></button>
      )}

      <nav className="m-nav">
        {NAV.map((n) => (
          <button key={n.key} className={"m-navi" + (tab === n.key ? " on" : "")} onClick={() => setTab(n.key)}>
            <n.Icon size={21} strokeWidth={tab === n.key ? 2.6 : 2} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {adding && <AddTxn wallets={wallets} initial={editing} onClose={() => { setAdding(false); setEditing(null); }} onSave={saveTxn} />}
    </div>
  );
}

// ---------------- Timeline ----------------
function Timeline({ data, onEdit, onDel, goStats }) {
  const { txns, wallets } = data;
  const mk = today().slice(0, 7);
  const month = txns.filter((t) => monthKey(t.date) === mk);
  const net = month.reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0);
  const bars = useMemo(() => cashflowMonths(txns, 6), [txns]);
  const wname = (id) => wallets.find((w) => w.id === id)?.name || "Wallet";

  const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const groups = [];
  sorted.forEach((t) => {
    const g = groups.find((x) => x.date === t.date);
    (g || groups[groups.push({ date: t.date, items: [] }) - 1]).items.push(t);
  });

  return (
    <div className="scr">
      <div className="m-head">
        <div className="m-bignum">{tk(net)}</div>
        <div className="m-sublabel">Cash flow · {monthLabel(mk)}</div>
      </div>
      <CashflowBars data={bars} />
      <button className="m-overview" onClick={goStats}><PieChart size={16} /> Spending overview <ChevronRight size={16} /></button>

      {groups.length === 0 && <p className="m-empty">No transactions yet. Tap + to add your first one.</p>}
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
                    <div className="m-txname">{isT ? "Transfer" : c.label}</div>
                    <div className="m-txwallet">{wname(t.walletId)}{t.note ? " · " + t.note : ""}</div>
                  </div>
                  <div className={"m-txamt " + (t.type === "income" ? "pos" : t.type === "expense" ? "neg" : "")}>
                    {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}{tk(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Wallets ----------------
function Wallets({ data, addWallet }) {
  const { wallets, txns } = data;
  const total = totalWealth(wallets, txns);
  const series = useMemo(() => wealthSeries(wallets, txns, 6), [wallets, txns]);
  return (
    <div className="scr">
      <div className="m-head">
        <div className="m-bignum">{tk(total)}</div>
        <div className="m-sublabel">Total wealth</div>
      </div>
      <WealthLine data={series} />
      <div className="m-list">
        {wallets.map((w) => (
          <div className="m-wallet" key={w.id}>
            <span className="m-wic" style={{ background: w.color + "22", color: w.color }}><WalletIcon size={20} /></span>
            <div className="m-wmeta"><div className="m-wname">{w.name}</div></div>
            <div className="m-wbal">{tk(walletBalance(w, txns))}</div>
          </div>
        ))}
      </div>
      <button className="m-addrow" onClick={() => { const n = prompt("Wallet name (e.g. bKash, Bank, Savings)"); addWallet(n && n.trim()); }}>
        <Plus size={18} /> Add a wallet
      </button>
    </div>
  );
}

// ---------------- Budgets ----------------
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
              <div className="m-budgethd">
                <span className="m-bname">{b.name}</span>
                <span className="m-bcat">{b.category === "all" ? "All expenses" : catOf(b.category).label}</span>
              </div>
              <div className={"m-bleft " + (over ? "neg" : "pos")}>
                {over ? tk(-left) + " over" : tk(left) + " left"} <small>of {tk(b.amount)}</small>
              </div>
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
          <div className="m-bform-actions">
            <button className="ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="primary" onClick={create}>Create budget</button>
          </div>
        </div>
      ) : (
        <button className="m-create" onClick={() => setOpen(true)}><Plus size={18} /> Create a new budget</button>
      )}
    </div>
  );
}

// ---------------- Stats / Overview ----------------
function Stats({ data }) {
  const { wallets, txns } = data;
  const [view, setView] = useState("cashflow");
  const [ctype, setCtype] = useState("expense");
  const mk = today().slice(0, 7);
  const bars = useMemo(() => cashflowMonths(txns, 6), [txns]);
  const series = useMemo(() => wealthSeries(wallets, txns, 6), [wallets, txns]);
  const breakdown = useMemo(() => categoryBreakdown(txns, ctype, mk), [txns, ctype, mk]);
  const month = txns.filter((t) => monthKey(t.date) === mk);
  const income = month.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = month.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="scr">
      <div className="m-title">Overview</div>
      <div className="m-toggle">
        <button className={view === "cashflow" ? "on" : ""} onClick={() => setView("cashflow")}>Cash flow</button>
        <button className={view === "wealth" ? "on" : ""} onClick={() => setView("wealth")}>Total wealth</button>
      </div>

      {view === "wealth" ? (
        <>
          <div className="m-statbig">{tk(totalWealth(wallets, txns))}<small>total wealth</small></div>
          <WealthLine data={series} />
          <div className="m-list">
            {wallets.map((w) => (
              <div className="m-wallet" key={w.id}>
                <span className="m-wic" style={{ background: w.color + "22", color: w.color }}><WalletIcon size={18} /></span>
                <div className="m-wmeta"><div className="m-wname">{w.name}</div></div>
                <div className="m-wbal">{tk(walletBalance(w, txns))}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="m-cfsplit">
            <div className="cf in"><span>Income</span><b>{tk(income)}</b></div>
            <div className="cf out"><span>Expenses</span><b>{tk(expense)}</b></div>
          </div>
          <CashflowBars data={bars} />
          <div className="m-cathd">
            <span>Categories · {monthLabel(mk)}</span>
            <div className="m-cattoggle">
              <button className={ctype === "expense" ? "on" : ""} onClick={() => setCtype("expense")}>Expenses</button>
              <button className={ctype === "income" ? "on" : ""} onClick={() => setCtype("income")}>Income</button>
            </div>
          </div>
          {breakdown.length === 0 ? <p className="m-empty">Nothing here for {monthLabel(mk)} yet.</p> : (
            <>
              <div className="m-donutwrap"><Donut slices={breakdown} /></div>
              <div className="m-list">
                {breakdown.map((c) => (
                  <div className="m-catline" key={c.key}>
                    <span className="m-txic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={18} strokeWidth={2.2} /></span>
                    <div className="m-catmeta"><div className="m-txname">{c.label}</div><div className="m-txwallet">{Math.round(c.pct)}%</div></div>
                    <div className="m-txamt">{tk(c.amount)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- More ----------------
function More({ data, user, onSignOut, openPlanner }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "taka-compass-data.json";
    a.click();
  };
  return (
    <div className="scr">
      <div className="m-title">More</div>
      <div className="m-profile">
        {user.picture ? <img src={user.picture} alt="" /> : <span className="m-pava">{(user.name || "U")[0]}</span>}
        <div><div className="m-pname">{user.name}</div><div className="m-pmail">{user.email}</div></div>
      </div>
      <div className="m-menu">
        <button onClick={openPlanner}><span className="mm-ic" style={{ color: "#0ea372" }}><Sparkles size={20} /></span>
          <span className="mm-txt"><b>Advanced planner & insights</b><i>Net worth, goals, tax, projections + loan/deposit rate marketplace</i></span><ChevronRight size={18} /></button>
        <button onClick={exportData}><span className="mm-ic" style={{ color: "#0891b2" }}><Download size={20} /></span>
          <span className="mm-txt"><b>Export my data</b><i>Download everything as JSON</i></span><ChevronRight size={18} /></button>
        <button onClick={onSignOut}><span className="mm-ic" style={{ color: "#fa5a7d" }}><LogOut size={20} /></span>
          <span className="mm-txt"><b>Sign out</b></span><ChevronRight size={18} /></button>
      </div>
      <p className="m-note">Your data lives in this browser, tied to your sign-in. There's no bank auto-sync — Bangladesh has no open-banking feed yet, so transactions are added manually (which also keeps your data fully private to you).</p>
    </div>
  );
}
