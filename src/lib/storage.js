// Lightweight local persistence. No backend — data lives in this browser,
// keyed per signed-in account (or "guest"). For real cross-device accounts
// you'd swap these for a backend (see README → "Going further").

const dataKey = (email) => `taka:data:${email || "guest"}`;
const SESSION = "taka:session";

export const saveSession = (s) => localStorage.setItem(SESSION, JSON.stringify(s));
export const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION)); } catch { return null; }
};
export const clearSession = () => localStorage.removeItem(SESSION);

export const saveData = (email, d) => localStorage.setItem(dataKey(email), JSON.stringify(d));
export const loadData = (email) => {
  try { return JSON.parse(localStorage.getItem(dataKey(email))); } catch { return null; }
};
