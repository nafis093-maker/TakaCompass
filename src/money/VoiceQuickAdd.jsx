import React, { useState, useRef } from "react";
import { Mic, X, ChevronRight } from "lucide-react";
import { listenOnce } from "./voice.js";
import { parseSpeech } from "./voiceparse.js";
import { speak } from "./tts.js";
import { tk, catOf } from "./lib.js";

const EXAMPLES = ["spent 200 on lunch", "got 5,000 salary", "1500 electricity bill", "uber 350"];

export default function VoiceQuickAdd({ onDone, onClose }) {
  const [phase, setPhase] = useState("welcome"); // welcome | prompt | listening | thanks | error
  const [heard, setHeard] = useState("");
  const [parsed, setParsed] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const busy = useRef(false);

  const run = async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase("prompt"); setHeard(""); setParsed(null); setErrMsg("");
    await speak("Say your amount now");
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
    await new Promise((r) => setTimeout(r, 350));
    setPhase("listening");
    let transcript = "";
    try {
      transcript = await listenOnce();
    } catch (e) {
      const code = (e && e.code) || "error";
      const msg =
        code === "not-allowed" ? "Microphone is blocked. Click the lock/camera icon in the address bar, set Microphone to Allow, then Try again."
        : code === "unavailable" ? "Speech recognition isn't available here - use Chrome or Edge."
        : code === "no-mic" ? "No microphone was found on this device."
        : code === "network" ? "Speech needs internet and isn't reachable right now."
        : (code === "no-speech" || code === "timeout") ? "I didn't hear anything - Try again and speak right after the prompt."
        : "Couldn't start the microphone - Try again.";
      setErrMsg(msg + "  (" + code + ")");
      setPhase("error"); busy.current = false; return;
    }
    setHeard(transcript);
    const p = parseSpeech(transcript);
    if (!p) { setErrMsg(transcript ? "No amount in that - try \"spent 200 on lunch\"." : "I didn't hear anything. Try again."); setPhase("error"); busy.current = false; return; }
    setParsed(p);
    setPhase("thanks");
    await speak("Thank you");
    busy.current = false;
    setTimeout(() => onDone(p), 700);
  };

  const c = parsed ? catOf(parsed.category) : null;

  if (phase === "welcome") {
    return (
      <div className="vq-overlay welcome">
        <button className="vq-close" onClick={onClose}><X size={22} /></button>
        <div className="vq-rings"><span /><span /><span /><div className="vq-orb welcome"><Mic size={46} /></div></div>
        <div className="vq-title">Add by voice</div>
        <div className="vq-sub">Tap start, then just say it:</div>
        <div className="vq-examples">
          {EXAMPLES.map((e) => <span key={e} className="vq-ex">{e}</span>)}
        </div>
        <button className="vq-start" onClick={run}><Mic size={18} /> Start <ChevronRight size={18} /></button>
        <div className="vq-tip">Your phone will ask for microphone access the first time - tap Allow.</div>
      </div>
    );
  }

  const label = phase === "prompt" ? "Say your amount now"
    : phase === "listening" ? "Listening..."
    : phase === "thanks" ? "Thank you!"
    : "Let's try again";

  return (
    <div className="vq-overlay">
      <button className="vq-close" onClick={onClose}><X size={22} /></button>
      <div className={"vq-orb " + phase}><Mic size={44} /></div>
      <div className="vq-label">{label}</div>

      {phase === "prompt" && <div className="vq-hint">e.g. spent 200 on lunch</div>}
      {heard && <div className="vq-heard">{heard}</div>}

      {phase === "thanks" && parsed && (
        <div className="vq-preview">
          <span className="vq-amt" style={{ color: parsed.type === "income" ? "#bdf5dd" : "#fff" }}>{parsed.type === "income" ? "+" : "-"}{tk(parsed.amount)}</span>
          <span className="vq-cat">{c.label}{parsed.note ? " - " + parsed.note : ""}</span>
        </div>
      )}

      {phase === "error" && (
        <>
          {errMsg && <div className="vq-hint" style={{ maxWidth: 320 }}>{errMsg}</div>}
          <div className="vq-actions">
            <button className="vq-retry" onClick={run}>Try again</button>
            <button className="vq-cancel" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
