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
