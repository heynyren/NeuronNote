/* Patches the android/ folder Capacitor generates:
 *  1. Replaces MainActivity.java with the one receiving ACTION_PROCESS_TEXT / SEND.
 *  2. Adds the PROCESS_TEXT + SEND intent-filter to the main <activity> in AndroidManifest.
 *  3. Renames the app display name to "Neuron Note".
 * Run after `npx cap sync android`. Safe to run repeatedly (idempotent).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const APP_ID = 'com.nhien.neuronnote';
const APP_NAME = 'Neuron Note';
const pkgPath = APP_ID.replace(/\./g, '/');

function log(m) { console.log('[patch-android] ' + m); }
function fail(m) { console.error('[patch-android] ERROR: ' + m); process.exit(1); }

const androidDir = path.join(ROOT, 'android');
if (!fs.existsSync(androidDir)) fail('no android/ folder. Run `npx cap add android` then `npx cap sync android` first.');

/* 1. MainActivity.java */
const srcMain = path.join(ROOT, 'android-src', 'MainActivity.java');
const dstMainDir = path.join(androidDir, 'app', 'src', 'main', 'java', pkgPath);
if (!fs.existsSync(dstMainDir)) fs.mkdirSync(dstMainDir, { recursive: true });
fs.copyFileSync(srcMain, path.join(dstMainDir, 'MainActivity.java'));
log('copied MainActivity.java');

/* 2. AndroidManifest.xml */
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

if (manifest.indexOf('android.intent.action.PROCESS_TEXT') === -1) {
  // insert the extra intent-filter right after the main activity's LAUNCHER intent-filter
  const launcher = /<intent-filter>\s*<action android:name="android.intent.action.MAIN"\s*\/>\s*<category android:name="android.intent.category.LAUNCHER"\s*\/>\s*<\/intent-filter>/;
  const extra = `<intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.PROCESS_TEXT" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>`;
  if (launcher.test(manifest)) {
    manifest = manifest.replace(launcher, extra);
    fs.writeFileSync(manifestPath, manifest);
    log('added PROCESS_TEXT + SEND intent-filter to AndroidManifest');
  } else {
    log('WARNING: could not find a LAUNCHER intent-filter to insert after — check AndroidManifest manually.');
  }
} else {
  log('AndroidManifest already has PROCESS_TEXT, skipping');
}

/* 3. App name in strings.xml */
const stringsPath = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  strings = strings
    .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${APP_NAME}$2`)
    .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${APP_NAME}$2`);
  fs.writeFileSync(stringsPath, strings);
  log('renamed app to "' + APP_NAME + '"');
}

log('done.');
