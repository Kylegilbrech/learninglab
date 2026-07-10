# Publishing Gridiron Fantasy to the Google Play Store

This app is a web app wrapped in a native Android shell with **Capacitor**. The web code
lives in `www/`; Capacitor generates a native `android/` project around it and produces
the signed **AAB** (Android App Bundle) that Google Play requires.

You run these steps on your own machine (the `android/` project and signing keys are **not**
committed to the repo — see `.gitignore`).

---

## 1. Prerequisites

| Tool | Notes |
|------|-------|
| **Node.js 18+** | to run Capacitor's CLI |
| **JDK 17** | required by modern Android Gradle |
| **Android Studio** (latest) | includes the Android SDK, build tools, and an emulator |
| A **Google Play Developer account** | one-time $25 registration at <https://play.google.com/console> |

After installing Android Studio, open it once and let it install the default SDK and
platform tools.

## 2. Install dependencies

```bash
cd learninglab
npm install
```

## 3. Add the Android platform

```bash
npx cap add android
```

This creates the `android/` folder (a full Gradle project). The app id and name come from
`capacitor.config.json`:

- **appId:** `com.gridiron.fantasy`  ← this is your unique Play package name; change it to
  your own reverse-domain id **before your first upload** if you prefer (you can't change it
  after publishing).
- **appName:** `Gridiron Fantasy`

## 4. Generate launcher icons + splash

Source art lives in `resources/` (1024px icon, foreground/background layers, and a splash).
Generate all the Android densities:

```bash
npm run assets       # runs: capacitor-assets generate --android
```

To tweak the art, edit `scripts/make_icons.py`, run `python3 scripts/make_icons.py`, then
re-run `npm run assets`.

## 5. Sync web assets into the native project

Any time you change files in `www/`, run:

```bash
npx cap sync
```

## 6. Try it on a device / emulator

```bash
npx cap open android         # opens Android Studio
```

Press **Run ▶** with an emulator or a USB-connected phone (with USB debugging on).

## 7. Create a signing key (one time)

Google Play requires a signed release. Generate an upload keystore:

```bash
keytool -genkey -v -keystore gridiron-upload.keystore \
  -alias gridiron -keyalg RSA -keysize 2048 -validity 10000
```

**Keep this file and its passwords safe and backed up** — losing them means you can't ship
updates under the same app. Do **not** commit it (already in `.gitignore`).

Tell Gradle about it by creating `android/keystore.properties`:

```properties
storeFile=../gridiron-upload.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=gridiron
keyPassword=YOUR_KEY_PASSWORD
```

Then wire it into `android/app/build.gradle` inside the `android { }` block:

```gradle
def keystoreProps = new Properties()
def keystoreFile = rootProject.file("keystore.properties")
if (keystoreFile.exists()) { keystoreProps.load(new FileInputStream(keystoreFile)) }

android {
    signingConfigs {
        release {
            if (keystoreFile.exists()) {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

## 8. Build the release AAB

```bash
cd android
./gradlew bundleRelease
```

The bundle is written to:

```
android/app/build/outputs/bundle/release/app-release.aab
```

(Or use Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.)

## 9. Bump the version for each release

In `android/app/build.gradle`, increase `versionCode` (integer, must go up every upload)
and `versionName` (display string, e.g. `1.0.1`) before rebuilding.

## 10. Upload to Play Console

1. Go to <https://play.google.com/console> → **Create app**.
2. Fill in name, default language, "App" type, and Free/Paid.
3. Complete the required declarations: **Privacy policy**, **Data safety**
   (this app stores squad choices **locally only** and collects no personal data),
   **Content rating** questionnaire, **Target audience**, and **Ads** (none by default).
4. Under **Release → Testing → Internal testing**, create a release and upload the `.aab`.
5. Add store listing assets:
   - **App icon** 512×512 (use `www/icons/icon-512.png`).
   - **Feature graphic** 1024×500 (create one — the splash art is a good starting point).
   - **Phone screenshots** (grab from a device/emulator, or start from
     `docs/screenshot-market.png` / `docs/screenshot-squad.png`).
   - Short + full description.
6. Roll out to Internal testing, verify on your own device, then promote to
   **Closed → Open → Production** when ready.

---

## Notes & gotchas

- **Fonts / offline:** the UI references Google Fonts for the condensed sporty look and
  falls back to clean system fonts when offline. For pixel-identical offline rendering you
  can self-host the font files in `www/` and swap the `<link>` in `index.html` for local
  `@font-face` rules.
- **Trademarks:** this is a fan-made game. Real NFL names, team logos, and player photos are
  trademarked; the shipped avatars are original/stylized to avoid licensing issues. If you
  add real imagery (see the photo hook in the README), make sure you have the rights before
  publishing.
- **Package name is permanent** once published — pick your final `appId` before the first
  Production upload.
- **Play requires targeting a recent Android API level.** Capacitor 6 targets a compliant
  level by default; if Play flags it later, bump `targetSdkVersion` in
  `android/variables.gradle`.
