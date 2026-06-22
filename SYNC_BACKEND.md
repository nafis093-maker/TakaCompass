# Cloud sync backend (optional)

Taka Compass works fully offline with data in the browser. Cloud sync adds
cross-device backup. It's **off until you set it up** — no backend, no behaviour
change.

## What's included
- `api/sync.js` — a Vercel serverless function (GET to pull, PUT to push) that
  verifies the user's Google token and stores one JSONB blob per user.
- `src/money/sync.js` + `src/money/Sync.jsx` — the client adapter and the
  *More → Cloud sync & backup* screen (manual push/pull + an opt-in auto-sync).

## Setup (about 10 minutes)

1. **Provision Postgres.** Any provider works — Neon, Supabase, Vercel Postgres,
   Railway. Copy its connection string.

2. **Create the table** (run once):
   ```sql
   CREATE TABLE IF NOT EXISTS taka_sync (
     user_sub   TEXT PRIMARY KEY,
     email      TEXT,
     data       JSONB NOT NULL,
     updated_at BIGINT NOT NULL
   );
   ```

3. **Set environment variables** (Vercel → Project → Settings → Environment
   Variables):
   - `DATABASE_URL` — your Postgres connection string
   - `GOOGLE_CLIENT_ID` — the same value as `VITE_GOOGLE_CLIENT_ID`
   - `VITE_SYNC_URL` — set to `/api/sync` (this is what switches sync on in the
     client; leave unset to keep sync disabled)

4. **Allow the function to reach Google.** No extra config — it calls Google's
   public `tokeninfo` endpoint to verify tokens.

5. **Deploy.** `vercel deploy` (or push to the connected repo). The `/api/sync`
   route is created automatically; `pg` is already in `package.json`.

## How it behaves
- Auth uses the Google access token the user already gets at sign-in. The server
  confirms the token was issued for your app (`aud === GOOGLE_CLIENT_ID`) and
  keys data by the verified Google `sub`.
- The token is kept **in memory only** on the client (never written to
  localStorage). After a page reload the user taps "Sign in with Google to sync"
  once to re-enable it for the session.
- Conflicts are **last-write-wins** by timestamp. Auto-sync (opt-in) pulls a
  newer cloud copy on open and pushes ~2.5s after changes. Manual "Back up" /
  "Restore" buttons are always available.

## Limits / next steps
- Last-write-wins can lose edits if two devices change data while offline; for a
  personal app this is usually fine. A field-level merge would be the next step.
- This per-user store is the foundation for **shared/family wallets**: add a
  membership table and let a blob be owned by a household id instead of a single
  `sub`.
