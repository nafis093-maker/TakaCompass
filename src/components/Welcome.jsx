import React from "react";
import { Compass, Mic, PieChart, ShieldCheck, ChevronRight } from "lucide-react";
import { t, getLang, setLang } from "../money/i18n.js";

const FEATURES = [
  { Icon: PieChart, k: "f1" },
  { Icon: Mic, k: "f2" },
  { Icon: Compass, k: "f3" },
  { Icon: ShieldCheck, k: "f4" },
];

export default function Welcome({ onStart }) {
  return (
    <div className="wel">
      <div className="wel-langbar">
        <button className={getLang() === "en" ? "on" : ""} onClick={() => setLang("en")}>English</button>
        <button className={getLang() === "bn" ? "on" : ""} onClick={() => setLang("bn")}>বাংলা</button>
      </div>

      <div className="wel-top">
        <div className="wel-logo"><Compass size={34} strokeWidth={2.4} /></div>
        <h1 className="wel-name">{t("app.name")}</h1>
        <p className="wel-tag">{t("welcome.tag")}</p>
      </div>

      <div className="wel-feats">
        {FEATURES.map(({ Icon, k }) => (
          <div key={k} className="wel-feat">
            <span className="wel-fic"><Icon size={20} /></span>
            <span className="wel-ftx"><b>{t("welcome." + k + ".t")}</b><i>{t("welcome." + k + ".s")}</i></span>
          </div>
        ))}
      </div>

      <button className="wel-cta" onClick={onStart}>{t("welcome.cta")} <ChevronRight size={20} /></button>
      <p className="wel-note">{t("welcome.note")}</p>
    </div>
  );
}
