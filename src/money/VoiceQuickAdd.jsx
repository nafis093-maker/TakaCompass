import React, { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { listenOnce } from "./voice.js";
import { parseSpeech } from "./voiceparse.js";
import { speak } from "./tts.js";
import { tk, catOf } from "./lib.js";

export default function VoiceQuickAdd({ onDone, onClose }) {
  const [phase, setPhase] = useState("prompt"); // prompt | listening | thanks | error
  const [heard, setHeard] = useState("");
  const [parsed, setParsed] = useState(null);
  const busy = useRef(false);

  const run = async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase("prompt"); setHeard(""); setParsed(null);
    await speak("Say your amount now");
    setPhase("listening");
    let transcript = "";
    try { transcript = await listenOnce(); } catch { setPhase("error"); busy.current = false; return; }
    setHeard(transcript);
    const p = parseSpeech(transcript);
    if (!p) { setPhase("error"); busy.current = false; return; }
    setParsed(p);
    setPhase("thanks");
    await speak("Thank you");
    busy.current = false;
    setTimeout(() => onDone(p), 700);
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const c = parsed ? catOf(parsed.category) : null;
  const label = phase === "prompt" ? "Say your amount now"
    : phase === "listening" ? "Listening…"
    : phase === "thanks" ? "Thank you!"
    : "Didn't catch that";

  return (
    <div className="vq-overlay">
      <button className="vq-close" onClick={onClose}><X size={22} /></button>
      <div className={"vq-orb " + phase}><Mic size={44} /></div>
      <div className="vq-label">{label}</div>

      {phase === "prompt" && <div className="vq-hint">e.g. “spent 200 on lunch”</div>}
      {heard && <div className="vq-heard">“{heard}”</div>}

      {phase === "thanks" && parsed && (
        <div className="vq-preview">
          <span className="vq-amt" style={{ color: parsed.type === "income" ? "#0ea372" : "#fff" }}>{parsed.type === "income" ? "+" : "-"}{tk(parsed.amount)}</span>
          <span className="vq-cat">{c.label}{parsed.note ? " · " + parsed.note : ""}</span>
        </div>
      )}

      {phase === "error" && (
        <div className="vq-actions">
          <button className="vq-retry" onClick={run}>Try again</button>
          <button className="vq-cancel" onClick={onClose}>Cancel</button>
        </div>
      )}
    </div>
  );
}
