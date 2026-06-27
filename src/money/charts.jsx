import React from "react";
import { monthLabel, big, tk, lastMonths, monthKey } from "./lib.js";

// income (green) vs expense (red) bars per month
export function CashflowBars({ data }) {
  const W = 380, H = 150, PB = 22, PT = 8;
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const n = data.length;
  const slot = (W - 16) / n;
  const bw = Math.min(14, slot / 3);
  const zero = H - PB;
  const h = (v) => (v / max) * (zero - PT);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="m-bars" preserveAspectRatio="xMidYMid meet">
      <line x1="0" y1={zero} x2={W} y2={zero} className="m-axis" />
      {data.map((d, i) => {
        const cx = 8 + slot * i + slot / 2;
        return (
          <g key={d.month}>
            <rect x={cx - bw - 2} y={zero - h(d.income)} width={bw} height={h(d.income)} rx="3" fill="#10b981" />
            <rect x={cx + 2} y={zero - h(d.expense)} width={bw} height={h(d.expense)} rx="3" fill="#fa5a7d" />
            <text x={cx} y={H - 6} className="m-xtk" textAnchor="middle">{monthLabel(d.month)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function WealthLine({ data }) {
  const W = 380, H = 170, PL = 6, PR = 6, PT = 14, PB = 24;
  const vals = data.map((d) => d.value);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const n = data.length;
  const xx = (i) => PL + (n <= 1 ? 0.5 : i / (n - 1)) * (W - PL - PR);
  const yy = (v) => PT + (1 - (v - min) / (max - min || 1)) * (H - PT - PB);
  const line = data.map((d, i) => (i ? "L" : "M") + xx(i).toFixed(1) + " " + yy(d.value).toFixed(1)).join(" ");
  const area = line + ` L${xx(n - 1)},${H - PB} L${xx(0)},${H - PB} Z`;
  const last = data[n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="m-line" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="mlg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mlg)" />
      <path d={line} className="m-lpath" />
      {data.map((d, i) => (
        <text key={d.month} x={xx(i)} y={H - 6} className="m-xtk" textAnchor="middle">{monthLabel(d.month)}</text>
      ))}
      {last && <circle cx={xx(n - 1)} cy={yy(last.value)} r="4.5" className="m-ldot" />}
    </svg>
  );
}

export function Donut({ slices, centerLabel }) {
  const R = 60, r = 36, C = 80;
  const visible = slices.filter((s) => s.amount > 0);
  const total = visible.reduce((s, x) => s + x.amount, 0) || 1;
  if (visible.length === 1) {
    return (
      <svg viewBox="0 0 160 160" className="m-donut anim">
        <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke={visible[0].color} strokeWidth={R - r} className="m-arc" />
        {centerLabel && <text x="80" y="85" className="m-dlabel" textAnchor="middle">{centerLabel}</text>}
      </svg>
    );
  }
  let a = -Math.PI / 2;
  const arcs = visible.map((s) => {
    const frac = s.amount / total;
    const a0 = a, a1 = a + frac * Math.PI * 2;
    a = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (ang, rad) => [C + rad * Math.cos(ang), C + rad * Math.sin(ang)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
    const [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    return { d: `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`, color: s.color, key: s.key };
  });
  return (
    <svg viewBox="0 0 160 160" className="m-donut anim">
      {arcs.map((arc, i) => <path key={arc.key} className="m-arc" style={{ animationDelay: i * 70 + "ms" }} d={arc.d} fill={arc.color} />)}
      {centerLabel && <text x="80" y="85" className="m-dlabel" textAnchor="middle">{centerLabel}</text>}
    </svg>
  );
}

// ---- Half-donut gauge (rounded segments + gaps), total in the centre ----
export function HalfDonut({ slices, centerLabel, caption }) {
  const cx = 100, cy = 104, R = 82, sw = 20;
  const visible = (slices || []).filter((s) => s.amount > 0);
  const total = visible.reduce((s, x) => s + x.amount, 0) || 1;
  const pt = (ang) => [cx + R * Math.cos(ang), cy - R * Math.sin(ang)];
  const GAP = 0.05; // radians between segments
  let a = Math.PI; // start at left, sweep over the top to the right
  const segs = visible.map((s) => {
    const span = (s.amount / total) * Math.PI;
    const a0 = a - GAP / 2, a1 = a - span + GAP / 2;
    a -= span;
    if (a1 >= a0) return null;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    return <path key={s.key} d={`M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round" />;
  });
  const [tx0, ty0] = pt(Math.PI), [tx1, ty1] = pt(0);
  return (
    <svg viewBox="0 0 200 124" className="m-half">
      <path d={`M${tx0} ${ty0} A${R} ${R} 0 0 1 ${tx1} ${ty1}`} fill="none" stroke="#eef1f5" strokeWidth={sw} strokeLinecap="round" />
      {segs}
      <text x="100" y="96" textAnchor="middle" className="m-half-big">{centerLabel}</text>
      {caption && <text x="100" y="116" textAnchor="middle" className="m-half-cap">{caption}</text>}
    </svg>
  );
}

// ---- Smooth dual-area "expense overview" (income vs expense) ----
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function ExpenseOverview({ data }) {
  const W = 360, H = 188, PL = 8, PR = 8, PT = 16, PB = 26;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const xx = (i) => PL + (n <= 1 ? 0.5 : i / (n - 1)) * (W - PL - PR);
  const yy = (v) => PT + (1 - v / max) * (H - PT - PB);
  const series = (key) => data.map((d, i) => [xx(i), yy(d[key])]);
  const ePts = series("expense"), iPts = series("income");
  const areaOf = (pts) => smooth(pts) + ` L${xx(n - 1).toFixed(1)} ${H - PB} L${xx(0).toFixed(1)} ${H - PB} Z`;
  const last = data[n - 1] || { income: 0, expense: 0 };
  const bubble = (x, y, val, cls) => (
    <g>
      <rect x={Math.min(x - 30, W - 64)} y={y - 26} width="60" height="20" rx="10" className={"m-eo-bub " + cls} />
      <text x={Math.min(x, W - 34)} y={y - 12} textAnchor="middle" className="m-eo-bubtx">{big(val)}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="m-eo" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="eoE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.28" /><stop offset="100%" stopColor="#60a5fa" stopOpacity="0" /></linearGradient>
        <linearGradient id="eoI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.22" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
      </defs>
      {[0.5, 1].map((f) => <line key={f} x1={PL} x2={W - PR} y1={yy(max * f)} y2={yy(max * f)} className="m-eo-grid" />)}
      <path d={areaOf(ePts)} fill="url(#eoE)" />
      <path d={areaOf(iPts)} fill="url(#eoI)" />
      <path d={smooth(ePts)} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
      <path d={smooth(iPts)} fill="none" stroke="#0ea372" strokeWidth="3" strokeLinecap="round" />
      {data.map((d, i) => <text key={d.month} x={xx(i)} y={H - 8} className="m-xtk" textAnchor="middle">{monthLabel(d.month)}</text>)}
      {n > 0 && <circle cx={xx(n - 1)} cy={yy(last.expense)} r="4" fill="#3b82f6" />}
      {n > 0 && <circle cx={xx(n - 1)} cy={yy(last.income)} r="4" fill="#0ea372" />}
      {n > 0 && last.expense > 0 && bubble(xx(n - 1), yy(last.expense), last.expense, "e")}
    </svg>
  );
}

// ---- Dot-grid "payment history": a row of dots per recent month ----
export function ActivityDots({ txns }) {
  const months = lastMonths(6);
  const COLS = 7;
  const counts = months.map((m) => {
    const bins = new Array(COLS).fill(0);
    for (const t of txns) {
      if (monthKey(t.date) !== m) continue;
      const day = parseInt(t.date.slice(8, 10), 10) || 1;
      const b = Math.min(COLS - 1, Math.floor((day - 1) / (31 / COLS)));
      bins[b] += 1;
    }
    return bins;
  });
  const peak = Math.max(1, ...counts.flat());
  const x0 = 6, gap = 30, r = 8, rowH = 26, y0 = 12;
  const W = x0 + COLS * gap + 40, H = y0 + months.length * rowH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="m-dots" preserveAspectRatio="xMidYMid meet">
      {months.map((m, ri) => {
        const cy = y0 + ri * rowH + r;
        return (
          <g key={m}>
            {counts[ri].map((c, ci) => {
              const op = c === 0 ? 0.10 : 0.30 + 0.70 * Math.min(1, c / peak);
              return <circle key={ci} cx={x0 + r + ci * gap} cy={cy} r={r} fill="#0ea372" fillOpacity={op} />;
            })}
            <text x={x0 + COLS * gap + 6} y={cy + 4} className="m-dots-lb">{monthLabel(m)}</text>
          </g>
        );
      })}
    </svg>
  );
}
