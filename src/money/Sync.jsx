import React, { useState } from "react";
import { ChevronLeft, RefreshCw, UploadCloud, DownloadCloud, Cloud, CloudOff } from "lucide-react";
import { syncConfigured, pull, push, loadMeta, saveMeta } from "./sync.js";

const fmt = (ts) => (ts ? new Date(ts).toLocaleString() : "never");

export default function Sync({ user, data, onApply, onReauth, onClose }) {
  const email = user.email;
  const [meta, setMeta] = useState(() => loadMeta(email));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = syncConfigured();
  const hasToken = !!user.token;

  const setM = (m) => { setMeta(m); saveMeta(email, m); };

  const ensureToken = async () => user.token || (onReauth ? await onReauth() : null);

  const doPush = async () => {
    setBusy(true); setStatus("");
    try {
      const token = await ensureToken();
      if (!token) { setStatus("Sign in with Google again to sync."); setBusy(false); return; }
      const updatedAt = Date.now();
      await push(token, data, updatedAt);
      setM({ ...meta, lastPush: updatedAt, remoteAt: updatedAt });
      setStatus("Backed up to the cloud ✓");
    } catch (e) { setStatus(e.message === "unauthorized" ? "Session expired — sign in again." : "Couldn't reach the sync server."); }
    setBusy(false);
  };

  const doPull = async () => {
    setBusy(true); setStatus("");
    try {
      const token = await ensureToken();
      if (!token) { setStatus("Sign in with Google again to sync."); setBusy(false); return; }
      const res = await pull(token);
      if (!res || !res.data || !Array.isArray(res.data.wallets)) { setStatus("Nothing in the cloud yet — push first."); setBusy(false); return; }
      if (!confirm("Replace what's on this device with the cloud copy?")) { setBusy(false); return; }
      onApply(res.data);
      setM({ ...meta, lastPull: Date.now(), remoteAt: res.updatedAt || Date.now() });
      setStatus("Restored the cloud copy ✓");
    } catch (e) { setStatus(e.message === "unauthorized" ? "Session expired — sign in again." : "Couldn't reach the sync server."); }
    setBusy(false);
  };

  const toggleAuto = () => setM({ ...meta, auto: !meta.auto });

  return (
    <div className="m-app">
      <div className="ra-bar"><button className="planner-back" onClick={onClose}><ChevronLeft size={18} /> Back</button></div>
      <div className="scr" style={{ paddingTop: 4 }}>
        <div className="m-title">Cloud sync &amp; backup</div>

        {!configured ? (
          <>
            <div className="sy-state off"><CloudOff size={26} /><div><b>Not set up</b><span>Cloud sync needs a backend you deploy once.</span></div></div>
            <p className="plan-intro">Your data currently lives only in this browser. To sync across devices, deploy the included serverless function and Postgres schema, then set <code>VITE_SYNC_URL=/api/sync</code>. Full steps are in <code>SYNC_BACKEND.md</code> in the project.</p>
          </>
        ) : (
          <>
            <div className={"sy-state " + (hasToken ? "on" : "warn")}>
              {hasToken ? <Cloud size={26} /> : <CloudOff size={26} />}
              <div><b>{hasToken ? "Ready" : "Sign in to enable"}</b><span>{user.email}</span></div>
            </div>

            <div className="sy-rows">
              <div className="sy-row"><span>Last backed up</span><b>{fmt(meta.lastPush)}</b></div>
              <div className="sy-row"><span>Last restored</span><b>{fmt(meta.lastPull)}</b></div>
            </div>

            <div className="sy-actions">
              <button className="m-create" onClick={doPush} disabled={busy}><UploadCloud size={18} /> Back up to cloud</button>
              <button className="ra-refresh" onClick={doPull} disabled={busy}><DownloadCloud size={16} /> Restore from cloud</button>
            </div>

            <label className="sy-auto">
              <span><b>Auto-sync</b><i>Pull on open, back up after changes (last write wins)</i></span>
              <input type="checkbox" checked={!!meta.auto} onChange={toggleAuto} />
            </label>

            {!hasToken && <button className="m-create" style={{ marginTop: 10 }} onClick={onReauth}><RefreshCw size={16} /> Sign in with Google to sync</button>}
            {status && <div className="sy-status">{busy ? "Working…" : status}</div>}
          </>
        )}

        <p className="m-note">Conflicts use last-write-wins by timestamp, so back up before restoring on a device with newer changes. This is also the foundation for shared/family wallets later.</p>
      </div>
    </div>
  );
}
