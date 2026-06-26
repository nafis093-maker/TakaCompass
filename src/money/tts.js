// Spoken prompts via the Web Speech Synthesis API (works on web, iOS WKWebView,
// and Android WebView). Resolves when speech finishes (or after a timeout) so
// callers can chain: speak(...) -> listen.
export function ttsAvailable() {
  try { return typeof window !== "undefined" && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined"; } catch { return false; }
}

export function speak(text, { lang = "en-US", rate = 1 } = {}) {
  return new Promise((resolve) => {
    try {
      if (!ttsAvailable()) return resolve();
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate; u.pitch = 1;
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(); } };
      u.onend = fin; u.onerror = fin;
      synth.speak(u);
      setTimeout(fin, 3000); // safety net
    } catch { resolve(); }
  });
}

// Some platforms require a user-gesture before speech works; call on tap.
export function warmTts() {
  try { if (ttsAvailable()) window.speechSynthesis.resume(); } catch {}
}
