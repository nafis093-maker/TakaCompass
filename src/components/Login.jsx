import React, { useState } from "react";
import { signInWithGoogle, signInWithApple, googleConfigured, appleConfigured } from "../lib/auth.js";

export default function Login({ onLogin }) {
  const [busy, setBusy] = useState(null);
  const [hint, setHint] = useState("");

  const google = async () => {
    if (!googleConfigured()) { setHint("Google sign-in needs a Client ID — see setup notes. You can jump in as a guest for now."); return; }
    setBusy("google"); setHint("");
    try { onLogin(await signInWithGoogle()); }
    catch (e) { setHint(e?.message === "gsi-not-loaded" ? "Google script still loading — try again in a sec." : "Couldn't finish Google sign-in. Guest mode works right now."); }
    finally { setBusy(null); }
  };
  const apple = async () => {
    if (!appleConfigured()) { setHint("Apple sign-in needs the Developer setup (see notes). Guest mode works right now though."); return; }
    setBusy("apple"); setHint("");
    try { onLogin(await signInWithApple()); }
    catch (e) { setHint("Couldn't finish Apple sign-in. Guest mode works right now."); }
    finally { setBusy(null); }
  };
  const guest = () => onLogin({ provider: "guest", name: "Guest", email: "guest" });

  return (
    <div className="login">
      <div className="login-bg" />
      <div className="login-card">
        <div className="brandmark">৳</div>
        <h1 className="login-title">Taka Compass</h1>
        <p className="login-sub">Your money, mapped. Track it, grow it, plan the big stuff — built for Bangladesh. 🇧🇩</p>

        <div className="login-btns">
          <button className={"oauth google" + (busy === "google" ? " busy" : "")} onClick={google} disabled={!!busy}>
            <GoogleG /> {busy === "google" ? "Connecting…" : "Continue with Google"}
          </button>
          <button className={"oauth apple" + (busy === "apple" ? " busy" : "")} onClick={apple} disabled={!!busy}>
            <AppleLogo /> {busy === "apple" ? "Connecting…" : "Continue with Apple"}
          </button>
          <button className="oauth guest" onClick={guest} disabled={!!busy}>
            Skip — just let me in →
          </button>
        </div>

        {hint && <p className="login-hint">{hint}</p>}
        <p className="login-fine">No backend, no tracking. Your numbers stay in this browser, tied to your sign-in.</p>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.3 5.2C41.2 36.9 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
function AppleLogo() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C73.3 141.6 26 184.5 26 271c0 25.6 4.7 52 14.1 79.1 12.6 35.7 58 123.3 105.4 121.9 24.8-.6 42.3-17.6 74.5-17.6 31.3 0 47.5 17.6 76.4 17.6 47.8-.7 88.9-80.3 100.9-116.1-64.1-30.2-60.4-88.5-60.4-89.2zM256.8 84.4c29.7-35.2 27-67.2 26.1-78.7-26.2 1.5-56.5 17.8-73.8 37.9-19 21.5-30.2 48.1-27.8 77.4 28.3 2.2 54.1-12.5 75.5-36.6z" />
    </svg>
  );
}
