/**
 * Neuron Note — máy chủ đồng bộ chạy trên Google Apps Script.
 *
 * Cách dùng:
 *  1. script.google.com → New project → dán toàn bộ file này.
 *  2. Đổi SECRET bên dưới thành chuỗi của riêng bạn.
 *  3. Ctrl+S để LƯU trước, rồi Deploy → New deployment → Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *  4. Copy link .../exec dán vào Cài đặt của extension (và app Android sau này).
 *
 * Lưu ý: luôn LƯU code rồi mới Deploy, và mỗi lần sửa code phải Deploy → New version,
 * nếu không sẽ gặp lỗi "Script function not found: doGet".
 */

/**
 * SECRET: để TRỐNG ('') nghĩa là KHÔNG cần mật khẩu — đồng bộ chạy ngay, giống bản trước.
 * Nếu muốn bảo vệ, đặt một chuỗi ở đây VÀ điền đúng chuỗi đó vào ô "Mã bí mật" của
 * extension (và app Android). Để trống ở đây thì ô "Mã bí mật" bên extension cũng để trống.
 */
var SECRET = '';
var FILE_NAME = 'neuron-note-data.json';
var TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000;   // 90 ngày

/* ---------- điểm vào ---------- */

function doGet() {
  return json({ ok: true, app: 'neuron-note', ping: Date.now() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json({ ok: false, error: 'Máy chủ đang bận, thử lại sau.' });
  }

  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (SECRET && String(req.key || '') !== SECRET) {
      return json({ ok: false, error: 'Mã bí mật không đúng.' });
    }

    var action = req.action || 'sync';
    var stored = readStore();

    if (action === 'pull') {
      return json({ ok: true, notes: stored, at: Date.now() });
    }

    var merged = merge(stored, req.notes || {});
    writeStore(merged);

    if (action === 'push') {
      return json({ ok: true, count: countLive(merged), at: Date.now() });
    }
    // 'sync': trả lại toàn bộ để hai bên bằng nhau
    return json({ ok: true, notes: merged, count: countLive(merged), at: Date.now() });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- trộn: bản có updatedAt mới hơn thắng ---------- */

function merge(a, b) {
  var out = {};
  var id;
  for (id in a) if (a.hasOwnProperty(id)) out[id] = a[id];
  for (id in b) {
    if (!b.hasOwnProperty(id)) continue;
    var mine = out[id];
    var theirs = b[id];
    if (!mine || (theirs.updatedAt || 0) > (mine.updatedAt || 0)) out[id] = theirs;
  }
  // dọn bia mộ quá hạn
  var now = Date.now();
  for (id in out) {
    if (out.hasOwnProperty(id) && out[id] && out[id].deleted &&
        now - (out[id].updatedAt || 0) > TOMBSTONE_TTL) {
      delete out[id];
    }
  }
  return out;
}

function countLive(notes) {
  var n = 0;
  for (var id in notes) if (notes.hasOwnProperty(id) && notes[id] && !notes[id].deleted) n++;
  return n;
}

/* ---------- đọc/ghi file trên Drive ---------- */

function getFile() {
  var it = DriveApp.getFilesByName(FILE_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFile(FILE_NAME, '{}', MimeType.PLAIN_TEXT);
}

function readStore() {
  try {
    var txt = getFile().getBlob().getDataAsString('UTF-8');
    return JSON.parse(txt || '{}');
  } catch (err) {
    return {};
  }
}

function writeStore(notes) {
  getFile().setContent(JSON.stringify(notes));
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ================= EMAIL NHẮC ÔN HẰNG NGÀY =================
 * Chạy tay MỘT LẦN hàm installDailyTrigger() trong trình soạn thảo để đặt lịch
 * gửi email mỗi sáng (khoảng 7h). Muốn đổi giờ thì sửa số 7 bên dưới rồi chạy lại.
 * Email gửi tới chính chủ tài khoản; muốn gửi địa chỉ khác thì đặt RECIPIENT.
 */
var RECIPIENT = '';            // để trống = gửi tới email của chính bạn
var DIGEST_HOUR = 7;           // giờ gửi (0..23), giờ theo múi giờ của dự án Apps Script
var DIGEST_MAX_LIST = 8;       // số đoạn liệt kê trong email
var SEND_WHEN_EMPTY = false;   // true = vẫn gửi cả khi không có đoạn đến hạn

function installDailyTrigger() {
  // xoá lịch cũ của hàm này để khỏi trùng
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(DIGEST_HOUR).create();
  Logger.log('Đã đặt lịch gửi email lúc ~' + DIGEST_HOUR + 'h mỗi ngày.');
}

function srsInStudy(n) {
  if (!n || n.deleted || !n.text) return false;
  var s = n.srs || {};
  return s.learn !== false && s.known !== true;
}

function dueList(notes, now) {
  var out = [];
  for (var id in notes) {
    if (!notes.hasOwnProperty(id)) continue;
    var n = notes[id];
    if (!srsInStudy(n)) continue;
    var due = (n.srs && n.srs.due) || 0;
    if (due <= now) out.push(n);
  }
  out.sort(function (a, b) { return ((a.srs && a.srs.due) || 0) - ((b.srs && b.srs.due) || 0); });
  return out;
}

function dailyDigest() {
  var notes = readStore();
  var now = Date.now();
  var due = dueList(notes, now);

  var studying = 0;
  for (var id in notes) if (notes.hasOwnProperty(id) && srsInStudy(notes[id])) studying++;

  if (!due.length && !SEND_WHEN_EMPTY) return;

  var to = RECIPIENT || Session.getEffectiveUser().getEmail();
  if (!to) { Logger.log('Không xác định được email người nhận.'); return; }

  var subject = due.length
    ? 'Neuron Note — ' + due.length + ' đoạn đến hạn ôn hôm nay'
    : 'Neuron Note — hôm nay không có đoạn đến hạn';

  var lines = [];
  lines.push('Chào buổi sáng!');
  lines.push('');
  lines.push('Đến hạn ôn: ' + due.length + ' đoạn  ·  Đang trong lịch học: ' + studying + ' đoạn.');
  if (due.length) {
    lines.push('');
    lines.push('Một vài đoạn cần ôn:');
    due.slice(0, DIGEST_MAX_LIST).forEach(function (n, i) {
      var t = String(n.text || '').replace(/\s+/g, ' ').trim();
      if (t.length > 140) t = t.slice(0, 140) + '…';
      var host = '';
      try { host = new URL(n.url).hostname.replace(/^www\./, ''); } catch (e) {}
      lines.push('');
      lines.push((i + 1) + '. “' + t + '”');
      var meta = [];
      if ((n.tags || []).length) meta.push(n.tags.map(function (x) { return '#' + x; }).join(' '));
      if (host) meta.push(host);
      if (meta.length) lines.push('   ' + meta.join('  ·  '));
      if (n.fragUrl || n.url) lines.push('   ' + (n.fragUrl || n.url));
    });
    if (due.length > DIGEST_MAX_LIST) {
      lines.push('');
      lines.push('… và ' + (due.length - DIGEST_MAX_LIST) + ' đoạn nữa. Mở extension → Học để ôn hết.');
    }
  }
  lines.push('');
  lines.push('— Neuron Note');

  MailApp.sendEmail(to, subject, lines.join('\n'));
  Logger.log('Đã gửi tới ' + to + ' (' + due.length + ' đoạn đến hạn).');
}

/* ---------- tiện ích: chạy tay trong trình soạn thảo để kiểm tra ---------- */
function testStore() {
  Logger.log(countLive(readStore()) + ' đoạn đang lưu trên Drive');
}
function testDigestNow() {   // gửi thử email ngay, không cần chờ lịch
  var save = SEND_WHEN_EMPTY; SEND_WHEN_EMPTY = true; dailyDigest(); SEND_WHEN_EMPTY = save;
}
