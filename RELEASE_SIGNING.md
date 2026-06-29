# Hisab — Signed release & Play Store upload

This produces a **signed `.aab`** (Android App Bundle) that Google Play accepts, using the
`Android Release (signed AAB)` GitHub Action. Do the one-time setup once, then every release
is a button click.

---

## 1. Create your upload keystore (one time)

On any machine with Java installed, run:

```bash
keytool -genkey -v \
  -keystore hisab-upload.keystore \
  -alias hisab \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass "CHOOSE_A_STRONG_PASSWORD" \
  -keypass "CHOOSE_A_STRONG_PASSWORD"
```

It asks for your name/org/country — answer anything reasonable.

> **⚠️ Back up `hisab-upload.keystore` and both passwords somewhere safe (password manager + offline copy).**
> If you lose this keystore you can still recover via Play App Signing (see step 4), but it's painful.
> Never commit the keystore to git.

Turn the keystore into a single line of base64 (so it can live in a GitHub Secret):

```bash
# macOS / Linux
base64 -w0 hisab-upload.keystore > keystore.base64.txt
# macOS without -w0:
# base64 hisab-upload.keystore | tr -d '\n' > keystore.base64.txt
```

---

## 2. Add GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add four:

| Secret name                 | Value                                            |
|----------------------------|--------------------------------------------------|
| `ANDROID_KEYSTORE_BASE64`  | the entire contents of `keystore.base64.txt`     |
| `ANDROID_KEYSTORE_PASSWORD`| the `storepass` you chose                        |
| `ANDROID_KEY_ALIAS`        | `hisab`                                           |
| `ANDROID_KEY_PASSWORD`     | the `keypass` you chose (same as storepass is ok)|

---

## 3. Build a release

Actions tab → **Android Release (signed AAB)** → **Run workflow**:
- **versionName**: user-facing, e.g. `1.0.0`
- **versionCode**: an integer that must **increase every upload** (1, 2, 3, …)

When it finishes, download the **`hisab-release-aab`** artifact → `app-release.aab`.
(`hisab-release-apk` is a signed APK for sideloading / sharing directly.)

---

## 4. First upload to Play Console

1. Create the app in **Google Play Console** (Developer account, $25 one-time).
2. When prompted, **enroll in Play App Signing** (recommended): Google keeps the real app-signing
   key; your keystore above is just the *upload* key. This is the safety net if you ever lose it.
3. Fill **Store listing**, **Data safety**, **Content rating**, **Privacy policy URL** (see `STORE_LISTING.md`).
4. Create a release in **Testing → Internal testing**, upload the `.aab`, add testers.
5. New personal developer accounts must run **Closed testing with 20 testers for 14 days** before
   you can promote to **Production**. Start that clock early.

### Version bumps
Each new upload just needs a higher `versionCode`. Keep a simple log:
`1.0.0 → code 1`, `1.0.1 → code 2`, etc.

### Notes
- `app-release.aab` is built with `minifyEnabled false` for safety; we can enable R8/Proguard later to shrink size.
- The app declares **no data collection** in Data Safety — that's accurate (everything is on-device)
  and a genuine selling point. Keep it accurate if you later add cloud sync.
