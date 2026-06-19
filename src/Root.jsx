import React, { useState } from "react";
import Login from "./components/Login.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Dashboard from "./Dashboard.jsx";
import { saveSession, loadSession, clearSession, saveData, loadData } from "./lib/storage.js";

export default function Root() {
  const [session, setSession] = useState(() => loadSession());
  const [data, setData] = useState(() => (loadSession() ? loadData(loadSession().email) : null));
  const [onboarded, setOnboarded] = useState(() => {
    const s = loadSession();
    return s ? !!loadData(s.email) : false;
  });

  const handleLogin = (user) => {
    saveSession(user);
    const d = loadData(user.email);
    setSession(user);
    setData(d);
    setOnboarded(!!d);
  };
  const handleOnboarded = (d) => {
    saveData(session.email, d);
    setData(d);
    setOnboarded(true);
  };
  const persist = (d) => { if (session) saveData(session.email, d); };
  const signOut = () => { clearSession(); setSession(null); setData(null); setOnboarded(false); };

  if (!session) return <Login onLogin={handleLogin} />;
  if (!onboarded) return <Onboarding user={session} onDone={handleOnboarded} onSkip={() => handleOnboarded(null)} />;
  return <Dashboard initial={data} onPersist={persist} user={session} onSignOut={signOut} />;
}
