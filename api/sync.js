// Vercel serverless function: per-user cloud sync for Taka Compass.
//
// Auth: the client sends the Google access token as `Authorization: Bearer ...`.
// We verify it with Google's tokeninfo endpoint, confirm it was issued for THIS
// app (aud === GOOGLE_CLIENT_ID), and key storage by the verified Google `sub`.
//
// Storage: a single JSONB blob per user in Postgres (any provider — Neon,
// Supabase, Vercel Postgres, Railway). Set DATABASE_URL in your env.
//
// Required env vars:
//   DATABASE_URL        postgres connection string (SSL)
//   GOOGLE_CLIENT_ID    same value as VITE_GOOGLE_CLIENT_ID
//
// One-time schema (run once against your database):
//   CREATE TABLE IF NOT EXISTS taka_sync (
//     user_sub   TEXT PRIMARY KEY,
//     email      TEXT,
//     data       JSONB NOT NULL,
//     updated_at BIGINT NOT NULL
//   );

import pg from "pg";

const pool = global._takaPool || new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
  max: 3,
});
if (!global._takaPool) global._takaPool = pool;

async function verify(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(token));
  if (!r.ok) return null;
  const info = await r.json();
  if (process.env.GOOGLE_CLIENT_ID && info.aud !== process.env.GOOGLE_CLIENT_ID) return null;
  if (!info.sub) return null;
  return { sub: info.sub, email: info.email || "" };
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "DATABASE_URL not set" });

  let user;
  try { user = await verify(req); } catch { return res.status(401).json({ error: "verify failed" }); }
  if (!user) return res.status(401).json({ error: "unauthorized" });

  try {
    if (req.method === "GET") {
      const { rows } = await pool.query("SELECT data, updated_at FROM taka_sync WHERE user_sub = $1", [user.sub]);
      if (!rows.length) return res.status(200).json({ data: null, updatedAt: null });
      return res.status(200).json({ data: rows[0].data, updatedAt: Number(rows[0].updated_at) });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const data = body.data;
      const updatedAt = Number(body.updatedAt) || Date.now();
      if (!data || !Array.isArray(data.wallets)) return res.status(400).json({ error: "bad payload" });
      await pool.query(
        `INSERT INTO taka_sync (user_sub, email, data, updated_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_sub) DO UPDATE SET data = EXCLUDED.data, email = EXCLUDED.email, updated_at = EXCLUDED.updated_at`,
        [user.sub, user.email, data, updatedAt]
      );
      return res.status(200).json({ ok: true, updatedAt });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
}
