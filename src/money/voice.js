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

// Listen once and resolve with the best transcript string. Throws on error.
export async function listenOnce({ lang = "en-US" } = {}) {
  if (isNative()) {
    const SR = await nativeSR();
    if (!SR) throw new Error("unavailable");
    try { const a = await SR.available(); if (a && a.available === false) throw new Error("unavailable"); } catch {}
    const perm = await SR.requestPermissions().catch(() => null);
    if (perm && perm.speechRecognition && perm.speechRecognition !== "granted") throw new Error("denied");
    const res = await SR.start({ language: lang, maxResults: 1, partialResults: false, popup: false });
    const matches = (res && res.matches) || [];
    return matches[0] || "";
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) throw new Error("unavailable");
  return await new Promise((resolve, reject) => {
    const r = new SR();
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
    let done = false;
    r.onresult = (e) => { done = true; resolve(e.results[0][0].transcript || ""); };
    r.onerror = (e) => { if (!done) reject(new Error(e.error || "speech-error")); };
    r.onend = () => { if (!done) reject(new Error("no-speech")); };
    try { r.start(); } catch (e) { reject(e); }
  });
}
