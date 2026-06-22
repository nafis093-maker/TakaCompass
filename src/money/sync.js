// Client adapter for optional cloud sync. Disabled unless VITE_SYNC_URL is set
// (e.g. "/api/sync" on your Vercel deployment). Auth is the Google access token
// the user already gets at sign-in; the server verifies it (see api/sync.js).
// Conflict policy: last-write-wins by updatedAt timestamp.

const URL = import.meta.env.VITE_SYNC_URL || "";

export const syncConfigured = () => !!URL;

export async function pull(token) {
  const r = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new Error("unauthorized");
  if (!r.ok) throw new Error("http " + r.status);
  return r.json(); // { data: {...}|null, updatedAt: number|null }
}

export async function push(token, data, updatedAt) {
  const r = await fetch(URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data, updatedAt }),
  });
  if (r.status === 401) throw new Error("unauthorized");
  if (!r.ok) throw new Error("http " + r.status);
  return r.json(); // { ok: true, updatedAt }
}

// local bookkeeping of when our local copy last changed / last synced
const metaKey = (email) => `taka:syncmeta:${email || "guest"}`;
export function loadMeta(email) {
  try { return JSON.parse(localStorage.getItem(metaKey(email))) || {}; } catch { return {}; }
}
export function saveMeta(email, meta) {
  try { localStorage.setItem(metaKey(email), JSON.stringify(meta)); } catch {}
}
