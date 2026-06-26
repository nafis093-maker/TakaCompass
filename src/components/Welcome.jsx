import React from "react";
import { Compass, Mic, MessageSquareText, PieChart, ShieldCheck, ChevronRight } from "lucide-react";

const FEATURES = [
  { Icon: PieChart, t: "See where it goes", s: "Wallets, budgets and clear charts of your spending." },
  { Icon: Mic, t: "Add in seconds", s: "Speak it, snap a receipt, or pull it from an SMS." },
  { Icon: Compass, t: "Plan ahead", s: "Goals, bills, Zakat and deposit maturities in one place." },
  { Icon: ShieldCheck, t: "Stays on your device", s: "Your money data is kept locally, not on our servers." },
];

export default function Welcome({ onStart }) {
  return (
    <div className="wel">
      <div className="wel-top">
        <div className="wel-logo"><Compass size={34} strokeWidth={2.4} /></div>
        <h1 className="wel-name">Taka Compass</h1>
        <p className="wel-tag">Your money, in taka, made simple.</p>
      </div>

      <div className="wel-feats">
        {FEATURES.map(({ Icon, t, s }) => (
          <div key={t} className="wel-feat">
            <span className="wel-fic"><Icon size={20} /></span>
            <span className="wel-ftx"><b>{t}</b><i>{s}</i></span>
          </div>
        ))}
      </div>

      <button className="wel-cta" onClick={onStart}>Get started <ChevronRight size={20} /></button>
      <p className="wel-note">No account needed - you can continue as a guest.</p>
    </div>
  );
}
