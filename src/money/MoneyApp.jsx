import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt, Wallet as WalletIcon, PiggyBank, Sparkles, MoreHorizontal,
  Plus, ChevronRight, Banknote, Download, LogOut, MessageSquareText,
} from "lucide-react";
import {
  EXPENSE_CATS, catOf, kindOf, tk, signed, big, uid, today, monthKey, monthLabel, niceDate,
  loadMoney, saveMoney, walletBalance, totalWealth, cashflowMonths, wealthSeries, budgetSpent, categoryBreakdown,
} from "./lib.js";
import { CashflowBars, WealthLine, Donut } from "./charts.jsx";
import AddTxn from "./AddTxn.jsx";
import AddAccount from "./AddAccount.jsx";
import ImportSms from "./ImportSms.jsx";
import Plan from "./Plan.jsx";

const NAV = [
  { key: "timeline", label: "Timeline", Icon: Receipt },
  { key: "wallets", label: "Wallets", Icon: WalletIcon },
  { key: "budgets", label: "Budgets", Icon: PiggyBank },
  { key: "plan", label: "Plan", Icon: Sparkles },
  { key: "more", label: "More", Icon: MoreHorizontal },
];

export default function MoneyApp({ user, onSignOut }) {
  const [data, setData] = useState(() => loadMoney(user.email));
  const [tab, setTab] = useState("timeline");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addAcct, setAddAcct] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => { saveMoney(user.email, data); }, [user.email, data]);
  const { wallets, txns, budgets, loans = [], goals = [] } = data;

  const importTxns = (list) => {
    if (list && list.length) setData((d) => ({ ...d, txns: [...d.txns, ...list] }));
    setImporting(false);
  };

  const saveTxn = (t) => {
    setData((d) => ({ ...d, txns: d.txns.some((x) => x.id === t.id) ? d.txns.map((x) => (x.id === t.id ? t : x)) : [...d.txns, t] }));
    setAdding(false); setEditing(null);
  };
  const delTxn = (id) => setData((d) => ({ ...d, txns: d.txns.filter((t) => t.id !== id) }));
  const addWallet = (w) => setData((d) => ({ ...d, wallets: [...d.wallets, w] }));
  const delWallet = (id) => setData((d) => ({ ...d, wallets: d.wallets.filter((w) => w.id !== id) }));
  const addLoan = (l) => setData((d) => ({ ...d, loans: [...(d.loans || []), l] }));
  const delLoan = (id) => setData((d) => ({ ...d, loans: (d.loans || []).filter((l) => l.id !== id) }));
  const addBudget = (b) => setData((d) => ({ ...d, budgets: [...d.budgets, { ...b, id: uid() }] }));
  const delBudget = (id) => setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }));
  const addGoal = (g) => setData((d) => ({ ...d, goals: [...(d.goals || []), { ...g, id: uid() }] }));
  const delGoal = (id) => setData((d) => ({ ...d, goals: (d.goals || []).filter((g) => g.id !== id) }));

  return (
    <div className="m-app">
      <div className="m-screen">
        {tab === "timeline" && <Timeline data={data} onEdit={(t) => { setEditing(t); setAdding(true); }} goPlan={() => setTab("plan")} openImport={() => setImporting(true)} />}
        {tab === "wallets" && <Wallets data={data} onAdd={() => setAddAcct(true)} delWallet={delWallet} delLoan={delLoan} />}
        {tab === "budgets" && <Budgets data={data} addBudget={addBudget} delBudget={delBudget} />}
        {tab === "plan" && <Plan data={data} addGoal={addGoal} delGoal={delGoal} />}
        {tab === "more" && <More data={data} user={user} onSignOut={onSignOut} />}
      </div>

      {tab === "timeline" && (
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
      {addAcct && <AddAccount onClose={() => setAddAcct(false)} onAddWallet={(w) => { addWallet(w); setAddAcct(false); }} onAddLoan={(l) => { addLoan(l); setAddAcct(false); }} />}
      {importing && <ImportSms wallets={wallets} onClose={() => setImporting(false)} onImport={importTxns} />}
    </div>
  );
}

function Timeline({ data, onEdit, goPlan, openImport }) {
  const { txns, wallets } = data;
  const mk = today().slice(0, 7);
  const month = txns.filter((t) => monthKey(t.date) === mk);
  const spent = month.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const cats = useMemo(() => categoryBreakdown(txns, "expense", mk), [txns, mk]);
  const wname = (id) => wallets.find((w) => w.id === id)?.name || "Wallet";

  const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const groups = [];
  sorted.forEach((t) => {
    const g = groups.find((x) => x.date === t.date);
    (g || groups[groups.push({ date: t.date, items: [] }) - 1]).items.push(t);
  });

  return (
    <div className="scr">
      <div className="m-head"><div className="m-bignum">{tk(spent)}</div><div className="m-sublabel">Spent · {monthLabel(mk)}</div></div>
      {cats.length > 0 ? (
        <div className="m-spendov">
          <Donut slices={cats} centerLabel={big(spent)} />
          <div className="m-spendleg">
            {cats.slice(0, 5).map((c) => (
              <div key={c.key}><span className="sl-dot" style={{ background: c.color }} /><span className="sl-name">{c.label}</span><b>{Math.round(c.pct)}%</b></div>
            ))}
          </div>
        </div>
      ) : <p className="m-empty">No spending logged this month yet.</p>}
      <div className="m-overrow">
        <button className="m-overview" onClick={goPlan}><Sparkles size={16} /> Full breakdown <ChevronRight size={16} /></button>
        <button className="m-overview alt" onClick={openImport}><MessageSquareText size={16} /> Import SMS</button>
      </div>

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

function Wallets({ data, onAdd, delWallet, delLoan }) {
  const { wallets, txns, loans = [] } = data;
  const assets = totalWealth(wallets, txns);
  const owed = loans.reduce((s, l) => s + l.bal, 0);
  const net = assets - owed;
  const series = useMemo(() => wealthSeries(wallets, txns, 6), [wallets, txns]);
  return (
    <div className="scr">
      <div className="m-head"><div className="m-bignum">{tk(net)}</div><div className="m-sublabel">Net worth · {tk(assets)} assets − {tk(owed)} loans</div></div>
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

function More({ data, user, onSignOut }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "taka-compass-data.json"; a.click();
  };
  return (
    <div className="scr">
      <div className="m-title">More</div>
      <div className="m-profile">
        {user.picture ? <img src={user.picture} alt="" /> : <span className="m-pava">{(user.name || "U")[0]}</span>}
        <div><div className="m-pname">{user.name}</div><div className="m-pmail">{user.email}</div></div>
      </div>
      <div className="m-menu">
        <button onClick={exportData}><span className="mm-ic" style={{ color: "#0891b2" }}><Download size={20} /></span><span className="mm-txt"><b>Export my data</b><i>Download everything as JSON</i></span><ChevronRight size={18} /></button>
        <button onClick={onSignOut}><span className="mm-ic" style={{ color: "#fa5a7d" }}><LogOut size={20} /></span><span className="mm-txt"><b>Sign out</b></span><ChevronRight size={18} /></button>
      </div>
      <p className="m-note">One app: log income, spending, wallets, loans and goals the simple way — the Plan tab turns it all into net worth, budgets, tax, projections and live loan/deposit rates automatically. Your data stays in this browser; there's no bank auto-sync (Bangladesh has no open-banking feed yet), which also keeps it fully private to you.</p>
    </div>
  );
}
