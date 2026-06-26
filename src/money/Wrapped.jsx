import React, { useMemo, useRef, useState, useEffect } from "react";
import { X, Share2, Download, ChevronRight } from "lucide-react";
import { tk, big, monthLabel, monthKey, catOf, today, walletBalance, wealthSeries } from "./lib.js";
import { burst } from "./confetti.js";

const CAT_EMOJI = { food: "🍔", shopping: "🛍️", transport: "🚌", home: "🏠", bills: "🧾", fun: "🎉", car: "🚗", travel: "✈️", family: "👨‍👩‍👧", health: "💊", education: "🎓", groceries: "🛒", other: "💸" };

export default function Wrapped({ data, onClose }) {
  const { txns, wallets } = data;
  const mk = today().slice(0, 7);
  const month = monthLabel(mk);

  const stats = useMemo(() => {
    const m = txns.filter((t) => monthKey(t.date) === mk);
    const exp = m.filter((t) => t.type === "expense");
    const spent = exp.reduce((s, t) => s + t.amount, 0);
    const earned = m.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const byCat = {};
    exp.forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount));
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const byDay = {};
    exp.forEach((t) => (byDay[t.date] = (byDay[t.date] || 0) + t.amount));
    const bigDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const savingsRate = earned > 0 ? Math.max(0, ((earned - spent) / earned) * 100) : 0;
    const series = wealthSeries(wallets, txns, 2);
    const nwChange = series.length >= 2 ? series[1].value - series[0].value : 0;
    let personality = "The Balancer", vibe = "steady hands, steady stacks";
    if (savingsRate >= 35) { personality = "The Stacker"; vibe = "future you is so proud rn"; }
    else if (savingsRate < 10 && spent > 0) { personality = "The Treat-Yourself"; vibe = "you lived, no notes"; }
    else if (top && top[0] === "food") { personality = "The Foodie"; vibe = "every taka was a flavour"; }
    return { spent, earned, count: exp.length, top, bigDay, savingsRate, nwChange, personality, vibe };
  }, [txns, wallets, mk]);

  const topKey = stats.top?.[0];
  const cards = [
    { bg: "linear-gradient(160deg,#0ea372,#065f46)", kicker: "Taka Wrapped", big: `Your ${month}`, sub: "in money ✨", emoji: "🧭" },
    { bg: "linear-gradient(160deg,#fa5a7d,#7c2d4b)", kicker: "You spent", big: tk(stats.spent), sub: `across ${stats.count} transaction${stats.count === 1 ? "" : "s"}`, emoji: "💸" },
    topKey && { bg: "linear-gradient(160deg,#8b5cf6,#4c1d95)", kicker: "Your main character", big: catOf(topKey).label, sub: `${tk(stats.top[1])} — ${Math.round((stats.top[1] / (stats.spent || 1)) * 100)}% of spending`, emoji: CAT_EMOJI[topKey] || "💸" },
    stats.bigDay && { bg: "linear-gradient(160deg,#f59f0a,#92400e)", kicker: "Biggest day", big: tk(stats.bigDay[1]), sub: `on ${new Date(stats.bigDay[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — that one hit different`, emoji: "🔥" },
    { bg: "linear-gradient(160deg,#0891b2,#0e3a4f)", kicker: "You kept", big: `${Math.round(stats.savingsRate)}%`, sub: stats.nwChange >= 0 ? `net worth up ${big(stats.nwChange)} 📈` : "of what you earned", emoji: "🪙" },
    { final: true, bg: "linear-gradient(160deg,#0ea372,#0891b2)", kicker: "Your money personality", big: stats.personality, sub: stats.vibe, emoji: "🌟" },
  ].filter(Boolean);

  const scroller = useRef(null);
  const cardRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const burned = useRef(false);

  const onScroll = () => {
    const el = scroller.current; if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };
  useEffect(() => {
    if (cards[idx]?.final && !burned.current) { burned.current = true; setTimeout(() => burst({ originY: 0.4 }), 250); }
  }, [idx, cards]);

  const go = (n) => { const el = scroller.current; if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" }); };

  const share = async () => {
    const text = `My ${month} in money 💸\nSpent ${tk(stats.spent)} · kept ${Math.round(stats.savingsRate)}%\nMain character: ${topKey ? catOf(topKey).label : "—"}\nMoney personality: ${stats.personality}\n— via Hisab`;
    try { if (navigator.share) await navigator.share({ title: "Taka Wrapped", text }); else { await navigator.clipboard.writeText(text); alert("Copied to clipboard!"); } } catch {}
  };
  const saveImg = async () => {
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a"); a.href = url; a.download = "taka-wrapped.png"; a.click();
    } catch { share(); }
  };

  return (
    <div className="wr-overlay">
      <button className="wr-close" onClick={onClose}><X size={22} /></button>
      <div className="wr-scroll" ref={scroller} onScroll={onScroll}>
        {cards.map((c, i) => (
          <div className="wr-card" key={i} style={{ background: c.bg }} ref={c.final ? cardRef : null}>
            <div className="wr-inner" data-active={idx === i}>
              <div className="wr-emoji">{c.emoji}</div>
              <div className="wr-kicker">{c.kicker}</div>
              <div className="wr-big">{c.big}</div>
              <div className="wr-sub">{c.sub}</div>
              {c.final && (
                <div className="wr-actions">
                  <button className="wr-share" onClick={share}><Share2 size={17} /> Share</button>
                  <button className="wr-save" onClick={saveImg}><Download size={17} /> Save card</button>
                </div>
              )}
              {c.final && <div className="wr-brand">🧭 Hisab</div>}
            </div>
            {!c.final && <button className="wr-next" onClick={() => go(i + 1)} aria-label="Next"><ChevronRight size={26} /></button>}
          </div>
        ))}
      </div>
      <div className="wr-dots">{cards.map((_, i) => <span key={i} className={idx === i ? "on" : ""} onClick={() => go(i)} />)}</div>
    </div>
  );
}
