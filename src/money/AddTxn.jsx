import { srLang, t, catLabel } from "./i18n.js";
import React, { useState, useEffect } from "react";
import { X, Check, Repeat, Paperclip, Mic } from "lucide-react";
import { EXPENSE_CATS, INCOME_CATS, uid, today, niceDate } from "./lib.js";
import { voiceAvailable, listenOnce } from "./voice.js";
import { parseSpeech } from "./voiceparse.js";

export default function AddTxn({ wallets, onClose, onSave, initial, quick = [] }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount || 0);
  const [category, setCategory] = useState(initial?.category || "food");
  const [walletId, setWalletId] = useState(initial?.walletId || wallets[0]?.id);
  const [toWalletId, setToWalletId] = useState(initial?.toWalletId || wallets[1]?.id || wallets[0]?.id);
  const [date, setDate] = useState(initial?.date || today());
  const [note, setNote] = useState(initial?.note || "");
  const [repeat, setRepeat] = useState("none");
  const [receipt, setReceipt] = useState(initial?.receipt || "");
  const [canVoice, setCanVoice] = useState(false);
  const [voice, setVoice] = useState("idle"); // idle | listening | error
  const [heard, setHeard] = useState("");

  useEffect(() => { voiceAvailable().then(setCanVoice); }, []);

  const speak = async () => {
    setHeard(""); setVoice("listening");
    try {
      const transcript = await listenOnce({ lang: srLang() });
      setHeard(transcript);
      const p = parseSpeech(transcript);
      if (!p) { setVoice("error"); return; }
      setType(p.type);
      setAmount(p.amount);
      setCategory(p.category);
      if (p.note) setNote(p.note);
      setVoice("idle");
    } catch { setVoice("error"); }
  };

  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const canSave = amount > 0 && (type !== "transfer" || walletId !== toWalletId);

  const pickReceipt = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900, scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = img.width * scale; cv.height = img.height * scale;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        setReceipt(cv.toDataURL("image/jpeg", 0.6));
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };

  const save = () => {
    if (!canSave) return;
    const t = { id: initial?.id || uid(), type, amount: +amount, walletId, date, note };
    if (type === "transfer") t.toWalletId = toWalletId;
    else t.category = type === "income" ? (INCOME_CATS.find((c) => c.key === category) ? category : "salary") : category;
    if (receipt) t.receipt = receipt;
    if (initial?.recurringId) t.recurringId = initial.recurringId;
    onSave(t, repeat !== "none" ? { freq: repeat } : null);
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <button className="sheet-x" onClick={onClose}><X size={22} /></button>
          <span className="sheet-title">{initial ? t("add.edit") : t("add.add")}</span>
          <button className="sheet-ok" onClick={save} disabled={!canSave}><Check size={22} /></button>
        </div>

        <div className="sheet-amt">
          <span>৳</span>
          <input autoFocus inputMode="numeric" value={amount || ""} placeholder="0"
            onChange={(e) => setAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)} />
        </div>

        {!initial && canVoice && (
          <div className="vc-wrap">
            <button className={"vc-btn" + (voice === "listening" ? " on" : "")} onClick={speak} disabled={voice === "listening"}>
              <Mic size={16} /> {voice === "listening" ? t("add.listening") : t("add.speak")}
            </button>
            {voice === "listening" && <span className="vc-pulse"><i /><i /><i /></span>}
            {heard && voice !== "listening" && <span className="vc-heard">“{heard}”</span>}
            {voice === "error" && !heard && <span className="vc-err">{t("add.verr1")}</span>}
            {voice === "error" && heard && <span className="vc-err">{t("add.verr2")}</span>}
          </div>
        )}

        {!initial && (
          <div className="qa-amts">
            {[100, 200, 500, 1000, 2000].map((a) => (
              <button key={a} className="qa-amt" onClick={() => setAmount(a)}>৳{a >= 1000 ? a / 1000 + "k" : a}</button>
            ))}
          </div>
        )}

        {!initial && quick.length > 0 && type !== "transfer" && (
          <div className="qa-chips">
            {quick.map((s, i) => {
              const c = (INCOME_CATS.find((x) => x.key === s.category) || EXPENSE_CATS.find((x) => x.key === s.category));
              if (!c) return null;
              return (
                <button key={i} className="qa-chip" onClick={() => { setType(s.type || "expense"); setCategory(s.category); setAmount(s.amount); }}>
                  <span className="qac-ic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={15} strokeWidth={2.4} /></span>
                  {catLabel(c.key, c.label)} · ৳{s.amount >= 1000 ? (s.amount / 1000).toFixed(s.amount % 1000 ? 1 : 0) + "k" : s.amount}
                </button>
              );
            })}
          </div>
        )}

        <div className="sheet-types">
          {["expense", "income", "transfer"].map((ty) => (
            <button key={ty} className={"st" + (type === ty ? " on" : "")} onClick={() => setType(ty)}>{t("type." + ty)}</button>
          ))}
        </div>

        <div className="sheet-body">
          {type === "transfer" ? (
            <div className="sheet-transfer">
              <label>{t("add.from")}<select value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
              <label>{t("add.to")}<select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            </div>
          ) : (
            <>
              <div className="sheet-cats">
                {cats.map((c) => (
                  <button key={c.key} className={"catbtn" + (category === c.key ? " on" : "")} onClick={() => setCategory(c.key)}>
                    <span className="catic" style={{ background: c.color + "22", color: c.color }}><c.Icon size={20} strokeWidth={2.2} /></span>
                    <span className="catlbl">{catLabel(c.key, c.label)}</span>
                  </button>
                ))}
              </div>
              <label className="sheet-row">{t("add.wallet")}
                <select value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              </label>
            </>
          )}

          <label className="sheet-row">{t("add.date")}
            <span className="daterow">
              <button className={"dtbtn" + (date === today() ? " on" : "")} onClick={() => setDate(today())}>{t("add.today")}</button>
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            </span>
          </label>
          <input className="sheet-note" placeholder={t("add.note")} value={note} onChange={(e) => setNote(e.target.value)} />

          {!initial && (
            <label className="sheet-row"><span className="rr-lbl"><Repeat size={15} /> {t("add.repeat")}</span>
              <span className="daterow">
                {["none", "weekly", "monthly"].map((f) => (
                  <button key={f} className={"dtbtn" + (repeat === f ? " on" : "")} onClick={() => setRepeat(f)}>{f === "none" ? t("add.off") : t("freq." + f)}</button>
                ))}
              </span>
            </label>
          )}

          <div className="rcpt-row">
            {receipt ? (
              <div className="rcpt-has">
                <img src={receipt} alt="receipt" />
                <button onClick={() => setReceipt("")}>{t("add.rmRcpt")}</button>
              </div>
            ) : (
              <label className="rcpt-add"><Paperclip size={15} /> {t("add.addRcpt")}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={pickReceipt} />
              </label>
            )}
          </div>
        </div>

        <button className="sheet-save" onClick={save} disabled={!canSave}>{initial ? t("add.saveChanges") : t("add.add")}</button>
      </div>
    </div>
  );
}
