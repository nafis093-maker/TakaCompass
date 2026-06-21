# Taka Compass — Auto SMS (native Android)

The web app can't read SMS (browsers don't allow it). This folder turns Taka
Compass into a **native Android app** that reads your bank/MFS SMS and turns them
into transactions automatically, using the same parser as the web app.

## What it does on Android
- **One-tap inbox scan** — open *Timeline → Import SMS → "Read my SMS inbox
  automatically"*. It asks for SMS permission, reads the last ~120 days, keeps
  only money-style messages (anything with Tk/BDT + an amount), parses each into
  a transaction, and shows them for review before import.
- **Live auto-capture** — while the app is open, every new transaction SMS is
  parsed and added to your Timeline automatically (tap any to fix/delete).

All of this is powered by `src/money/smsparse.js` (bKash, Nagad, Rocket, bank/card
formats) — the exact same logic you already use on the web by pasting.

## Build & run it (on your own machine — needs a real phone)
You need **Android Studio** (with the Android SDK) and **Node 18+**.

```bash
# from the project root
npm install
npm run build          # builds the web app into dist/
npx cap sync android   # copies web + plugins into android/
npx cap open android   # opens the project in Android Studio
```

In Android Studio: plug in an Android phone (USB debugging on) or use an emulator
that has a phone number, press **Run ▶**. On first launch, open Import SMS and grant
the SMS permission when asked.

> SMS permission only works on a **real device / proper emulator** — and you must
> grant it manually. The reader queries `content://sms/inbox`; the live receiver
> listens for `SMS_RECEIVED`.

To produce a shareable APK: **Build → Build Bundle(s)/APK(s) → Build APK(s)**, then
install the generated `app-debug.apk` (enable "install from unknown sources").

## Honest limitations (please read)
- **Google Play restricts `READ_SMS`.** Play only allows it for a narrow set of
  use-cases and will likely reject a personal-finance app that uses it. That's fine
  for your **own use** (install the APK directly / "sideload"), but it is a real
  blocker for publishing on Play. Sideloaded APKs and some regional stores are
  unaffected.
- **iOS can never do this.** Apple provides no API to read SMS, so auto-import is
  Android-only. iPhone users stay on paste-import.
- **Background capture is limited.** Live auto-capture works while the app is
  running. True always-on background capture would need a manifest-declared
  `BroadcastReceiver` + a foreground service / local DB queue — not included here
  to keep things simple and battery-friendly. The inbox scan covers anything missed.
- **Parsing is heuristic.** Odd SMS formats may mis-categorise; every auto-added or
  scanned item is editable on the Timeline.
- **Sign-in:** use **Guest mode** on the native app — Google's OAuth is blocked
  inside app webviews.

## Key files
- `android/app/src/main/java/app/takacompass/money/SmsReaderPlugin.java` — native plugin (inbox read + live receiver)
- `android/app/src/main/java/app/takacompass/money/MainActivity.java` — registers the plugin
- `android/app/src/main/AndroidManifest.xml` — `READ_SMS` / `RECEIVE_SMS`
- `src/money/native.js` — JS bridge
- `src/money/smsparse.js` — the shared SMS → transaction parser

## Bill / EMI reminders (local notifications)

Recurring items (More → Recurring & bills) schedule on-device reminders via
`@capacitor/local-notifications`. This is already a dependency and registered by
`cap sync`. The manifest declares `POST_NOTIFICATIONS` (Android 13+ asks at
runtime) and `SCHEDULE_EXACT_ALARM`. On web these calls are no-ops. Reminders
re-sync whenever your recurring list changes; they fire at 9:00 AM on the due
date. Rebuild the APK in Android Studio after pulling these changes.
