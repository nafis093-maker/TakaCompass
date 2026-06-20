// Operator/admin-managed rate sources. These extend the built-in catalog and
// are stored locally (and exportable). True auto-monitoring needs a server cron
// (see scripts/sync-rates.mjs) because browsers can't fetch most bank sites
// (CORS). The "Check" button is a best-effort client-side attempt.

const KEY = "taka:rateadmin";

export function loadSources() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(d)) return d;
  } catch {}
  return [];
}
export function saveSources(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

// Convert admin sources into marketplace products + institutions.
export function adminToCatalog(sources) {
  const extraInst = {};
  const extra = [];
  sources.forEach((s) => {
    if (!s.rate || !s.cat) return;
    const key = "adm_" + s.id;
    extraInst[key] = { name: s.instName || "Institution", type: s.instType || "Bank", url: s.url || "" };
    extra.push({
      id: "adm_" + s.id, inst: key, cat: s.cat, name: s.name || "Rate",
      rate: +s.rate, tenureMax: +s.tenureMax || 20, fee: +s.fee || 0,
      sponsored: !!s.sponsored, priority: +s.priority || 0, admin: true,
    });
  });
  return { extra, extraInst };
}

// Best-effort client-side fetch + rate extraction. Most banks block CORS, so
// this will usually fail and the admin enters the rate manually.
export async function checkSource(url, keyword) {
  if (!url) return { ok: false, reason: "No URL" };
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return { ok: false, reason: "HTTP " + res.status };
    const html = await res.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    const kw = (keyword || "").toLowerCase();
    let best = null;
    const re = /(\d{1,2}(?:\.\d{1,2})?)\s*%/g;
    let m;
    while ((m = re.exec(text))) {
      const idx = m.index;
      const around = text.slice(Math.max(0, idx - 60), idx + 20).toLowerCase();
      const score = kw && around.includes(kw) ? 2 : 1;
      const rate = parseFloat(m[1]);
      if (rate > 0 && rate < 40 && (!best || score > best.score)) best = { rate, score };
    }
    if (best) return { ok: true, rate: best.rate, confident: best.score === 2 };
    return { ok: false, reason: "No rate found on page" };
  } catch (e) {
    return { ok: false, reason: "Blocked by the bank's site (CORS) — enter manually" };
  }
}
