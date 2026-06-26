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
// with an `.code` (not-allowed | unavailable | no-speech | no-start | aborted | timeout | network | no-mic).
export async function listenOnce(opts = {}) {
  if (isNative()) {
    const SR = await nativeSR();
    if (!SR) { const e = new Error("unavailable"); e.code = "unavailable"; throw e; }
    try { const a = await SR.available(); if (a && a.available === false) { const e = new Error("unavailable"); e.code = "unavailable"; throw e; } } catch {}
    const perm = await SR.requestPermissions().catch(() => null);
    if (perm && perm.speechRecognition && perm.speechRecognition !== "granted") { const e = new Error("denied"); e.code = "not-allowed"; throw e; }
    const res = await SR.start({ language: opts.lang || "en-US", maxResults: 1, partialResults: false, popup: false });
    const matches = (res && res.matches) || [];
    return matches[0] || "";
  }

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 + attempt * 350));
    try { return await listenWeb(opts, attempt); }
    catch (e) { lastErr = e; if (e.code === "aborted" || e.code === "no-start") continue; throw e; }
  }
  throw lastErr;
}

function listenWeb({ lang = "en-US" } = {}, attempt = 0) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { const e = new Error("unavailable"); e.code = "unavailable"; return reject(e); }
    if (attempt === 0) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {} }
    let r, settled = false, gotAudio = false, timer;
    const finish = (fn, arg) => { if (settled) return; settled = true; clearTimeout(timer); try { r && r.abort && r.abort(); } catch {} fn(arg); };
    const fail = (code) => { const e = new Error(code); e.code = code; finish(reject, e); };
    try { r = new SR(); } catch { return fail("no-start"); }
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
    r.onaudiostart = () => { gotAudio = true; };
    r.onresult = (e) => finish(resolve, (e.results[0][0].transcript || "").trim());
    r.onerror = (e) => { const er = e.error; fail(er === "not-allowed" || er === "service-not-allowed" ? "not-allowed" : er === "audio-capture" ? "no-mic" : er === "network" ? "network" : er || "error"); };
    r.onend = () => { if (!settled) fail(gotAudio ? "no-speech" : "no-start"); };
    timer = setTimeout(() => fail("timeout"), 12000);
    try { r.start(); } catch { fail("no-start"); }
  });
}
