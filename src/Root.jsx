import React, { useState } from "react";
import Login from "./components/Login.jsx";
import MoneyApp from "./money/MoneyApp.jsx";
import { saveSession, loadSession, clearSession } from "./lib/storage.js";

export default function Root() {
  const [session, setSession] = useState(() => loadSession());
  const handleLogin = (user) => { saveSession(user); setSession(user); };
  const signOut = () => { clearSession(); setSession(null); };
  if (!session) return <Login onLogin={handleLogin} />;
  return <MoneyApp user={session} onSignOut={signOut} />;
}
