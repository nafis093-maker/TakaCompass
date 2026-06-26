import React, { useState, useRef, useEffect } from "react";
import { Mic, X, ChevronRight } from "lucide-react";
import { listenOnce } from "./voice.js";
import { parseSpeech } from "./voiceparse.js";
import { speak } from "./tts.js";
import { tk, catOf } from "./lib.js";

const EXAMPLES = ["spent 200 on lunch", "got 5,000 salary", "1500 electricity bill", "uber 350"];

export default function VoiceQuickAdd({ onDone, onClose }) {
  const [phase, setPhase] = useState("welcome"); // welcome | listening | thanks | error
  const [heard, setHeard] = useState("");
  const [parsed, setParsed] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [typed, setTyped] = useState("");
  const [typeErr, setTypeErr] = useState("");
  const busy = useRef(false);

  // Speak the prompt while the welcome page is up, so recognition itself can be
  // started straight from the Start tap (a fresh user gesture) without the TTS
  // audio overlapping it - that overlap/gesture-loss is what caused 'aborted'.
  useEffect(() => { speak("Say your amount now"); }, []);

  const finishWith = async (p) => {
    setParsed(p); setPhase("thanks");
    await speak("Thank you");
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
      transcript = await listenOnce();
    } catch (e) {
      const code = (e && e.code) || "error";
      const msg =
        code === "not-allowed" ? "Microphone is blocked. Click the lock/camera icon in the address bar, set Microphone to Allow, then Try again."
        : code === "unavailable" ? "Speech recognition isn't available here - use Chrome or Edge, or just type it below."
        : code === "no-mic" ? "No microphone was found on this device."
        : code === "network" ? "Speech needs internet and isn't reachable right now."
        : (code === "no-speech" || code === "timeout") ? "I didn't hear anything - tap Try again and speak right away, or type it below."
        : "Couldn't start the microphone - tap Try again, or type it below.";
      setErrMsg(msg + "  (" + code + ")");
      setPhase("error"); busy.current = false; return;
    }
    setHeard(transcript);
    const p = parseSpeech(transcript);
    if (!p) { setErrMsg(transcript ? "Heard \"" + transcript + "\" but no amount in it." : "I didn't hear anything."); setPhase("error"); busy.current = false; return; }
    finishWith(p);
  };

  const submitTyped = () => {
    const p = parseSpeech(typed);
    if (!p) { setTypeErr("Try something like \"spent 200 on lunch\"."); return; }
    setTypeErr(""); busy.current = true; finishWith(p);
  };

  const c = parsed ? catOf(parsed.category) : null;

  if (phase === "welcome") {
    return (
      <div className="vq-overlay welcome">
        <button className="vq-close" onClick={onClose}><X size={22} /></button>
        <div className="vq-rings"><span /><span /><span /><div className="vq-orb welcome"><Mic size={46} /></div></div>
        <div className="vq-title">Add by voice</div>
        <div className="vq-sub">Tap start, then just say it:</div>
        <div className="vq-examples">{EXAMPLES.map((e) => <span key={e} className="vq-ex">{e}</span>)}</div>
        <button className="vq-start" onClick={run}><Mic size={18} /> Start <ChevronRight size={18} /></button>
        <div className="vq-tip">Your phone will ask for microphone access the first time - tap Allow.</div>
      </div>
    );
  }

  const label = phase === "listening" ? "Listening..." : phase === "thanks" ? "Thank you!" : "Let's try again";

  return (
    <div className="vq-overlay">
      <button className="vq-close" onClick={onClose}><X size={22} /></button>
      <div className={"vq-orb " + phase}><Mic size={44} /></div>
      <div className="vq-label">{label}</div>

      {phase === "listening" && <div className="vq-hint">Say your amount now</div>}
      {heard && phase !== "error" && <div className="vq-heard">{heard}</div>}

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
          <div className="vq-type">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder='or type "spent 200 on lunch"'
              onKeyDown={(e) => { if (e.key === "Enter") submitTyped(); }} />
            <button onClick={submitTyped}>Add</button>
          </div>
          {typeErr && <div className="vq-hint">{typeErr}</div>}
        </>
      )}
    </div>
  );
}
