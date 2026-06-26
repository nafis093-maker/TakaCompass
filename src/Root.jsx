import React, { useState } from "react";
import Login from "./components/Login.jsx";
import Welcome from "./components/Welcome.jsx";
import WelcomeSplash from "./components/WelcomeSplash.jsx";
import MoneyApp from "./money/MoneyApp.jsx";
import { saveSession, loadSession, clearSession } from "./lib/storage.js";
import { signInWithGoogle } from "./lib/auth.js";

export default function Root() {
  const [session, setSession] = useState(() => loadSession());
  const [splash, setSplash] = useState(false);
  const [welcomed, setWelcomed] = useState(() => {
    try { return !!localStorage.getItem("taka:seenWelcome"); } catch { return false; }
  });
  const seeWelcome = () => { try { localStorage.setItem("taka:seenWelcome", "1"); } catch {} setWelcomed(true); };
  // Persist the profile but NOT the access token (tokens shouldn't live in
  // localStorage). The token stays in memory for this session only.
  const handleLogin = (user) => { const { token, ...persist } = user; saveSession(persist); setSession(user); setSplash(true); };
  const signOut = () => { clearSession(); setSession(null); };
  // Re-acquire a fresh Google token (used to (re)enable cloud sync).
  const reauth = async () => {
    try { const u = await signInWithGoogle(); setSession((s) => ({ ...s, ...u })); return u.token; } catch { return null; }
  };
  if (!welcomed && !session) return <Welcome onStart={seeWelcome} />;
  if (!session) return <Login onLogin={handleLogin} />;
  return (
    <>
      <MoneyApp user={session} onSignOut={signOut} onReauth={reauth} />
      {splash && <WelcomeSplash name={session.name} onDone={() => setSplash(false)} />}
    </>
  );
}
