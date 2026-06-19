import React from "react";
import { monthLabel, big } from "./lib.js";

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
      <svg viewBox="0 0 160 160" className="m-donut">
        <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke={visible[0].color} strokeWidth={R - r} />
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
    <svg viewBox="0 0 160 160" className="m-donut">
      {arcs.map((arc) => <path key={arc.key} d={arc.d} fill={arc.color} />)}
      {centerLabel && <text x="80" y="85" className="m-dlabel" textAnchor="middle">{centerLabel}</text>}
    </svg>
  );
}
