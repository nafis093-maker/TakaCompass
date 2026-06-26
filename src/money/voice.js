import { isNative } from "./native.js";

export function webSpeechAvailable() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

let _sr; let _tried = false;
async function nativeSR() {
  if (_tried) return _sr;
  _tried = true;
  try { _sr = (await import("@capacitor-community/speech-recognition")).SpeechRecognition; } catch { _sr = null; }
  return _sr;
}

export async function voiceAvailable() {
  if (isNative()) return !!(await nativeSR());
  return webSpeechAvailable();
}

// Listen once and resolve with the best transcript string. Throws on error
// with an `.code` (not-allowed | unavailable | no-speech | no-start | error).
export async function listenOnce({ lang = "en-US" } = {}) {
  if (isNative()) {
    const SR = await nativeSR();
    if (!SR) { const e = new Error("unavailable"); e.code = "unavailable"; throw e; }
    try { const a = await SR.available(); if (a && a.available === false) { const e = new Error("unavailable"); e.code = "unavailable"; throw e; } } catch {}
    const perm = await SR.requestPermissions().catch(() => null);
    if (perm && perm.speechRecognition && perm.speechRecognition !== "granted") { const e = new Error("denied"); e.code = "not-allowed"; throw e; }
    const res = await SR.start({ language: lang, maxResults: 1, partialResults: false, popup: false });
    const matches = (res && res.matches) || [];
    return matches[0] || "";
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { const e = new Error("unavailable"); e.code = "unavailable"; throw e; }

  // Make sure the spoken prompt isn't still holding the audio output.
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}

  // Ask for mic permission first — this gives a precise error and warms the mic
  // so recognition doesn't abort the instant it starts.
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch { const e = new Error("mic blocked"); e.code = "not-allowed"; throw e; }
  }
  await new Promise((r) => setTimeout(r, 250));

  return await new Promise((resolve, reject) => {
    let r;
    try { r = new SR(); } catch { const e = new Error("init"); e.code = "no-start"; return reject(e); }
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
    let done = false, gotAudio = false;
    const fail = (code) => { if (!done) { done = true; const e = new Error(code); e.code = code; reject(e); } };
    r.onaudiostart = () => { gotAudio = true; };
    r.onresult = (e) => { done = true; resolve((e.results[0][0].transcript || "").trim()); };
    r.onerror = (e) => fail(e.error === "not-allowed" || e.error === "service-not-allowed" ? "not-allowed" : e.error || "error");
    r.onend = () => fail(gotAudio ? "no-speech" : "no-start");
    try { r.start(); } catch { fail("no-start"); }
  });
}
