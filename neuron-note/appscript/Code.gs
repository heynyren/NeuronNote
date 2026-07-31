/**
 * Neuron Note — sync server running on Google Apps Script.
 *
 * How to use:
 *  1. script.google.com → New project → paste this entire file.
 *  2. Change SECRET below to your own string (optional).
 *  3. Ctrl+S to SAVE first, then Deploy → New deployment → Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *  4. Copy the .../exec link into the extension's Settings (and the Android app).
 *
 * Note: always SAVE the code before you Deploy, and each time you edit the code you must
 * Deploy → New version, otherwise you'll hit "Script function not found: doGet".
 */

/**
 * SECRET: leave EMPTY ('') to require NO password — sync just works.
 * To protect it, set a string here AND enter that same string in the extension's
 * "Secret" field (and the Android app). Empty here = leave the extension's "Secret" empty too.
 */
var SECRET = '';
var FILE_NAME = 'neuron-note-data.json';
var TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000;   // 90 days

/* ---------- entry points ---------- */

function doGet() {
  return json({ ok: true, app: 'neuron-note', ping: Date.now() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json({ ok: false, error: 'Server is busy, try again shortly.' });
  }

  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (SECRET && String(req.key || '') !== SECRET) {
      return json({ ok: false, error: 'Incorrect secret.' });
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
    // 'sync': return everything so both sides match
    return json({ ok: true, notes: merged, count: countLive(merged), at: Date.now() });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- merge: the entry with a newer updatedAt wins ---------- */

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
  // clean up expired tombstones
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

/* ---------- read/write the file on Drive ---------- */

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

/* ================= DAILY REVIEW EMAIL =================
 * Run installDailyTrigger() ONCE by hand in the editor to schedule the morning email
 * (around 7am). To change the time, edit the number below and run it again.
 * The email is sent to the account owner; to use another address, set RECIPIENT.
 */
var RECIPIENT = '';            // empty = send to your own email
var DIGEST_HOUR = 7;           // send hour (0..23), in the Apps Script project's time zone
var DIGEST_MAX_LIST = 8;       // how many passages to list in the email
var SEND_WHEN_EMPTY = false;   // true = send even when nothing is due

function installDailyTrigger() {
  // remove this function's old triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(DIGEST_HOUR).create();
  Logger.log('Scheduled the email for ~' + DIGEST_HOUR + ':00 every day.');
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
  if (!to) { Logger.log('Could not determine the recipient email.'); return; }

  var subject = due.length
    ? 'Neuron Note — ' + due.length + ' passages due for review today'
    : 'Neuron Note — nothing due today';

  var lines = [];
  lines.push('Good morning!');
  lines.push('');
  lines.push('Due for review: ' + due.length + ' passages  ·  In the study schedule: ' + studying + ' passages.');
  if (due.length) {
    lines.push('');
    lines.push('A few passages to review:');
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
      lines.push('… and ' + (due.length - DIGEST_MAX_LIST) + ' more. Open the extension → Study to review them all.');
    }
  }
  lines.push('');
  lines.push('— Neuron Note');

  MailApp.sendEmail(to, subject, lines.join('\n'));
  Logger.log('Sent to ' + to + ' (' + due.length + ' passages due).');
}

/* ---------- helpers: run by hand in the editor to test ---------- */
function testStore() {
  Logger.log(countLive(readStore()) + ' passages stored on Drive');
}
function testDigestNow() {   // send a test email now, without waiting for the schedule
  var save = SEND_WHEN_EMPTY; SEND_WHEN_EMPTY = true; dailyDigest(); SEND_WHEN_EMPTY = save;
}
