/* Tự vá thư mục android/ do Capacitor sinh ra:
 *  1. Thay MainActivity.java bằng bản nhận ACTION_PROCESS_TEXT / SEND.
 *  2. Thêm intent-filter PROCESS_TEXT + SEND vào <activity> chính trong AndroidManifest.
 *  3. Đổi tên hiển thị app thành "Neuron Note".
 * Chạy sau `npx cap sync android`. An toàn khi chạy lại nhiều lần (idempotent).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const APP_ID = 'com.nhien.neuronnote';
const APP_NAME = 'Neuron Note';
const pkgPath = APP_ID.replace(/\./g, '/');

function log(m) { console.log('[patch-android] ' + m); }
function fail(m) { console.error('[patch-android] LỖI: ' + m); process.exit(1); }

const androidDir = path.join(ROOT, 'android');
if (!fs.existsSync(androidDir)) fail('chưa có thư mục android/. Chạy `npx cap add android` rồi `npx cap sync android` trước.');

/* 1. MainActivity.java */
const srcMain = path.join(ROOT, 'android-src', 'MainActivity.java');
const dstMainDir = path.join(androidDir, 'app', 'src', 'main', 'java', pkgPath);
if (!fs.existsSync(dstMainDir)) fs.mkdirSync(dstMainDir, { recursive: true });
fs.copyFileSync(srcMain, path.join(dstMainDir, 'MainActivity.java'));
log('đã chép MainActivity.java');

/* 2. AndroidManifest.xml */
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

if (manifest.indexOf('android.intent.action.PROCESS_TEXT') === -1) {
  // chèn thêm intent-filter ngay sau intent-filter LAUNCHER của activity chính
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
    log('đã thêm intent-filter PROCESS_TEXT + SEND vào AndroidManifest');
  } else {
    log('CẢNH BÁO: không tìm thấy intent-filter LAUNCHER để chèn — kiểm tra AndroidManifest thủ công.');
  }
} else {
  log('AndroidManifest đã có PROCESS_TEXT, bỏ qua');
}

/* 3. Tên app trong strings.xml */
const stringsPath = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  strings = strings
    .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${APP_NAME}$2`)
    .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${APP_NAME}$2`);
  fs.writeFileSync(stringsPath, strings);
  log('đã đổi tên app thành "' + APP_NAME + '"');
}

log('xong.');
