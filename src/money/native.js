import { Capacitor, registerPlugin } from "@capacitor/core";

const SmsReader = registerPlugin("SmsReader");

export const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export async function requestSms() {
  try {
    const r = await SmsReader.requestSmsPermission();
    return !!r.granted;
  } catch { return false; }
}

export async function smsGranted() {
  try { const r = await SmsReader.smsPermissionState(); return !!r.granted; } catch { return false; }
}

export async function readInbox(days = 120, max = 1000) {
  try {
    const r = await SmsReader.readInbox({ days, max });
    return r.messages || [];
  } catch { return []; }
}

export async function watchSms(cb) {
  try {
    await SmsReader.startWatching();
    return await SmsReader.addListener("smsReceived", cb);
  } catch { return null; }
}

export async function stopWatch() {
  try { await SmsReader.stopWatching(); } catch {}
}

// quick pre-filter so we only surface money-related SMS
export const looksLikeTxn = (body) => /(?:Tk|BDT|৳)\.?\s*[\d,]/i.test(body || "");

// ---- bill / EMI reminders via local notifications (native only) ------------
// Requires the @capacitor/local-notifications plugin to be installed and the
// Android app rebuilt. On web (or if the plugin is absent) these are no-ops.
let _ln; let _lnTried = false;
async function getLN() {
  if (_lnTried) return _ln;
  _lnTried = true;
  try { _ln = (await import("@capacitor/local-notifications")).LocalNotifications; } catch { _ln = null; }
  return _ln;
}

export async function scheduleReminders(items = []) {
  if (!isNative()) return false;
  const LocalNotifications = await getLN();
  if (!LocalNotifications) return false;
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    const pending = await LocalNotifications.getPending();
    if (pending?.notifications?.length) await LocalNotifications.cancel({ notifications: pending.notifications });
    const notifications = items.slice(0, 30).map((it, i) => ({
      id: 10000 + i,
      title: it.type === "income" ? "Expected today" : "Payment due today",
      body: `${it.note || "Recurring"} · ৳${Math.round(it.amount).toLocaleString("en-US")}`,
      schedule: { at: new Date(it.nextDate + "T09:00:00") },
    })).filter((n) => n.schedule.at.getTime() > Date.now());
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    return true;
  } catch { return false; }
}
export const remindersAvailable = () => isNative();
