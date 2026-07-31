**🌐 English · [Tiếng Việt](README.vi.md)**

# Neuron Note — Android app v1.0.1

Companion to the Neuron Note desktop extension. Same data format and same Apps
Script/Google Drive backend, so it **syncs directly with your desktop**.

## What it does

- **Notebook**: browse every saved passage, search, filter by **multiple labels** at once
  (any/all), open the source link.
- **Study**: review with spaced repetition (1/3/7/14/30/60/120 days), self-rate Got it /
  Not yet, snooze from study / mark as mastered.
- **Add**: paste & save any passage, pick a label.
- **Save from any app**: select text in any app (browser, PDF, messages…) → choose
  **Neuron Note** from the menu → it's saved straight into the notebook under the default
  label. Also works via **Share → Neuron Note**.
- **Two-way sync** with desktop: newer wins, deletions propagate via tombstones.

> Note: notes saved from the phone (selecting text in another app) usually **don't include
> a URL**, so there's no "Open passage" button; but they still have text, a label, and join
> the study schedule normally. Notes saved from desktop (with link + highlight) show an
> "Open" button on the phone to jump to the exact passage.

## Build (Windows)

Needs: Node.js, Android Studio (with JDK). Run in the project folder:

```bat
npm install
npx cap add android
npx cap sync android
node patch-android.js
npx @capacitor/assets generate --android
cd android
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
gradlew assembleDebug
```

The APK is at `android\app\build\outputs\apk\debug\app-debug.apk`. Copy it to your phone
and install (enable "Install from unknown sources").

**Every time you change the web (www/):** re-run `npx cap sync android` →
`node patch-android.js` → `gradlew assembleDebug`.

`patch-android.js` automatically does 3 things to the `android/` folder Capacitor
generates: copies `MainActivity.java` (to receive ACTION_PROCESS_TEXT + SEND), adds an
intent-filter to `AndroidManifest`, and renames the app to "Neuron Note". Safe to run
repeatedly.

## Connecting sync

1. After installing, open the app → ⚙ **Settings** → paste the **exact Web App URL** of the
   Apps Script you already use for the extension (and the secret, if any) → enable
   *Auto-sync* → **Sync now**.
2. Because it shares the same `neuron-note-data.json` file on your Drive, every passage on
   desktop shows up on the phone and vice versa.

## Technical notes

- `appId` = `com.nhien.neuronnote`. Keep this id on future updates so installs overwrite
  in place without losing data.
- Storage: Capacitor **Preferences** under a single key `nn` = `{ notes, settings }`.
  `notes` is the synced data (100% matching the extension). `settings` (labels, URL,
  default label) is **local per device** — like the extension, only `notes` travels through
  sync; but labels used on synced passages still appear for filtering.
- Sync uses `CapacitorHttp` (native, avoids CORS) with `Content-Type: text/plain` so it
  doesn't trigger Apps Script's preflight.
- Receiving system text: `MainActivity.java` writes `{text,ts}` JSON into SharedPreferences
  `CapacitorStorage` key `incomingText`, fires an `nn-incoming-text` event; `app.js`
  `checkIncoming()` reads + clears + saves the note (60-second freshness window), called on
  startup + resume + that event.

## Structure

```
android-app/
├── capacitor.config.json     appId com.nhien.neuronnote, CapacitorHttp enabled
├── package.json
├── patch-android.js          patches android/ after each cap sync
├── android-src/MainActivity.java
├── assets/                   icon.png + splash.png for @capacitor/assets
├── test.js                   jsdom test (run: node test.js)
└── www/
    ├── index.html
    ├── app.css
    ├── shared.js             NN.* (pure logic matching the extension) + Preferences storage
    └── app.js                the entire UI + sync + PROCESS_TEXT handling
```
