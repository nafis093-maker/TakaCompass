import React, { useState } from "react";
import Login from "./components/Login.jsx";
import MoneyApp from "./money/MoneyApp.jsx";
import { saveSession, loadSession, clearSession } from "./lib/storage.js";
import { signInWithGoogle } from "./lib/auth.js";

export default function Root() {
  const [session, setSession] = useState(() => loadSession());
  // Persist the profile but NOT the access token (tokens shouldn't live in
  // localStorage). The token stays in memory for this session only.
  const handleLogin = (user) => { const { token, ...persist } = user; saveSession(persist); setSession(user); };
  const signOut = () => { clearSession(); setSession(null); };
  // Re-acquire a fresh Google token (used to (re)enable cloud sync).
  const reauth = async () => {
    try { const u = await signInWithGoogle(); setSession((s) => ({ ...s, ...u })); return u.token; } catch { return null; }
  };
  if (!session) return <Login onLogin={handleLogin} />;
  return <MoneyApp user={session} onSignOut={signOut} onReauth={reauth} />;
}
