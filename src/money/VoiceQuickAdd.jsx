import React, { useState, useRef, useEffect } from "react";
import { Mic, X, ChevronRight, Keyboard } from "lucide-react";
import { listenOnce, voiceAvailable, webSpeechAvailable } from "./voice.js";
import { isNative } from "./native.js";
import { parseSpeech } from "./voiceparse.js";
import { speak } from "./tts.js";
import { t, ttsLang, srLang, catLabel } from "./i18n.js";
import { tk, catOf } from "./lib.js";

const EXAMPLES = ["spent 200 on lunch", "got 5,000 salary", "1500 electricity bill", "uber 350"];

export default function VoiceQuickAdd({ onDone, onClose }) {
  // Speech recognition doesn't exist in iPhone browsers (all use WebKit) or in
  // Firefox. Fall back to typing the same plain-language phrase there.
  const [mode] = useState(() => (isNative() || webSpeechAvailable()) ? "voice" : "type");
  const [phase, setPhase] = useState(mode === "type" ? "type" : "welcome"); // welcome | listening | thanks | error | type
  const [heard, setHeard] = useState("");
  const [parsed, setParsed] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [typed, setTyped] = useState("");
  const [typeErr, setTypeErr] = useState("");
  const busy = useRef(false);
  const EXAMPLES = [t("voice.eg1"), t("voice.eg2"), t("voice.eg3")];

  // Speak the prompt while the welcome page is up, so recognition itself can be
  // started straight from the Start tap (a fresh user gesture) without the TTS
  // audio overlapping it - that overlap/gesture-loss is what caused 'aborted'.
  useEffect(() => { if (mode === "voice") speak(t("voice.prompt"), { lang: ttsLang() }); }, [mode]);

  const finishWith = async (p) => {
    setParsed(p); setPhase("thanks");
    await speak(t("voice.thanks"), { lang: ttsLang() });
    busy.current = false;
    setTimeout(() => onDone(p), 700);
  };

  // Called directly from the Start / Try again tap. listenOnce starts the
  // recognizer synchronously within this gesture.
  const run = async () => {
    if (busy.current) return;
    busy.current = true;
    setHeard(""); setParsed(null); setErrMsg(""); setPhase("listening");
    let transcript = "";
    try {
      transcript = await listenOnce({ lang: srLang() });
    } catch (e) {
      const code = (e && e.code) || "error";
      const msg =
        code === "not-allowed" ? "Microphone is blocked. Click the lock/camera icon in the address bar, set Microphone to Allow, then Try again."
        : code === "unavailable" ? "Speech recognition isn't available here - use Chrome or Edge, or just type it below."
        : code === "no-mic" ? "No microphone was found on this device."
        : code === "network" ? "Speech needs internet and isn't reachable right now."
        : (code === "no-speech" || code === "timeout") ? "I didn't hear anything - tap Try again and speak right away, or type it below."
        : t("voice.err");
      setErrMsg(msg + "  (" + code + ")");
      setPhase("error"); busy.current = false; return;
    }
    setHeard(transcript);
    const p = parseSpeech(transcript);
    if (!p) { setErrMsg(transcript ? (t("voice.heard") + " \"" + transcript + "\" — " + t("voice.err")) : t("voice.err")); setPhase("error"); busy.current = false; return; }
    finishWith(p);
  };

  const submitTyped = () => {
    const p = parseSpeech(typed);
    if (!p) { setTypeErr("Try something like \"spent 200 on lunch\"."); return; }
    setTypeErr(""); busy.current = true; finishWith(p);
  };

  const c = parsed ? catOf(parsed.category) : null;

  // ---- Type mode (iPhone browsers / Firefox: no speech recognition) ----
  if (phase === "type") {
    return (
      <div className="vq-overlay welcome">
        <button className="vq-close" onClick={onClose}><X size={22} /></button>
        <div className="vq-orb welcome" style={{ marginBottom: 22 }}><Keyboard size={42} /></div>
        <div className="vq-title">{t("voice.title")}</div>
        <div className="vq-sub">Type it in plain words:</div>
        <div className="vq-examples">{EXAMPLES.map((e) => <span key={e} className="vq-ex">{e}</span>)}</div>
        <div className="vq-type" style={{ marginTop: 8 }}>
          <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={EXAMPLES[0]}
            onKeyDown={(e) => { if (e.key === "Enter") submitTyped(); }} />
          <button onClick={submitTyped}>{t("voice.add")}</button>
        </div>
        {typeErr && <div className="vq-tip" style={{ color: "#ffe0a3" }}>{typeErr}</div>}
        <div className="vq-tip">Speaking isn't available in iPhone browsers - the installed app supports voice.</div>
      </div>
    );
  }

  if (phase === "welcome") {
    return (
      <div className="vq-overlay welcome">
        <button className="vq-close" onClick={onClose}><X size={22} /></button>
        <div className="vq-rings"><span /><span /><span /><div className="vq-orb welcome"><Mic size={46} /></div></div>
        <div className="vq-title">{t("voice.title")}</div>
        <div className="vq-sub">{t("voice.sub")}</div>
        <div className="vq-examples">{EXAMPLES.map((e) => <span key={e} className="vq-ex">{e}</span>)}</div>
        <button className="vq-start" onClick={run}><Mic size={18} /> {t("voice.start")} <ChevronRight size={18} /></button>
        <div className="vq-tip">Your phone will ask for microphone access the first time - tap Allow.</div>
      </div>
    );
  }

  const label = phase === "listening" ? t("voice.listening") : phase === "thanks" ? t("voice.thanks") : t("voice.tryagain");

  return (
    <div className="vq-overlay">
      <button className="vq-close" onClick={onClose}><X size={22} /></button>
      <div className={"vq-orb " + phase}><Mic size={44} /></div>
      <div className="vq-label">{label}</div>

      {phase === "listening" && <div className="vq-hint">{t("voice.prompt")}</div>}
      {heard && phase !== "error" && <div className="vq-heard">{heard}</div>}

      {phase === "thanks" && parsed && (
        <div className="vq-preview">
          <span className="vq-amt" style={{ color: parsed.type === "income" ? "#bdf5dd" : "#fff" }}>{parsed.type === "income" ? "+" : "-"}{tk(parsed.amount)}</span>
          <span className="vq-cat">{catLabel(parsed.category, c.label)}{parsed.note ? " - " + parsed.note : ""}</span>
        </div>
      )}

      {phase === "error" && (
        <>
          {errMsg && <div className="vq-hint" style={{ maxWidth: 320 }}>{errMsg}</div>}
          <div className="vq-actions">
            <button className="vq-retry" onClick={run}>{t("voice.tryagain")}</button>
            <button className="vq-cancel" onClick={onClose}>{t("voice.cancel")}</button>
          </div>
          <div className="vq-type">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={EXAMPLES[0]}
              onKeyDown={(e) => { if (e.key === "Enter") submitTyped(); }} />
            <button onClick={submitTyped}>{t("voice.add")}</button>
          </div>
          {typeErr && <div className="vq-hint">{typeErr}</div>}
        </>
      )}
    </div>
  );
}
