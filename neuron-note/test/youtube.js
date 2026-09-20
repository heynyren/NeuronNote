/* Nguồn YouTube: bắt đúng mốc giây khi lưu, và quay lại đúng chỗ khi mở */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { JSDOM } = require('jsdom');
const DIR = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };
const eq = (n, got, want) => ok(n, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);

/* ---------- 1. Bắt mốc giây trong content.js ---------- */
console.log('\n[1] bắt mốc giây khi bôi đen trên YouTube');
function bootPage(url, body) {
  const dom = new JSDOM('<!doctype html><body>' + body + '</body>', {
    url, runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window;
  w.chrome = {
    runtime: { onMessage: { addListener() {} }, sendMessage() {}, id: 't' },
    storage: { local: { get: (d, cb) => cb(d), set: (o, cb) => cb && cb() }, onChanged: { addListener() {} } }
  };
  vm.runInContext(read('content.js'), dom.getInternalVMContext(), { filename: 'content.js' });
  return w;
}
// YouTube transcript panel: dòng phụ đề mang mốc giây của chính nó
const TRANSCRIPT = `
  <video></video>
  <div id="panel">
    <div class="segment" id="l1"><div class="segment-timestamp">2:07</div><div class="segment-text">Đây là câu thứ nhất</div></div>
    <div class="segment" id="l2"><div class="segment-timestamp">1:02:45</div><div class="segment-text">Câu ở giờ thứ một</div></div>
  </div>
  <div id="desc">Mô tả video không có mốc giây</div>`;

const w1 = bootPage('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x', TRANSCRIPT);
const T = w1.__NN_TEST__ || {};
ok('content.js có hook test', !!T.ytVideoId, 'thiếu __NN_TEST__');

if (T.ytVideoId) {
  eq('đọc đúng id video từ ?v=', T.ytVideoId(), 'dQw4w9WgXcQ');

  const d = w1.document;
  const mkRange = (sel) => { const r = d.createRange(); r.selectNodeContents(d.querySelector(sel)); return r; };

  eq('dòng phụ đề → lấy mốc CỦA DÒNG (2:07)', T.ytTimeFor(mkRange('#l1 .segment-text')), 127);
  eq('mốc có giờ (1:02:45)', T.ytTimeFor(mkRange('#l2 .segment-text')), 3765);

  // ngoài bảng phụ đề thì dùng vị trí đang phát
  const vd = d.querySelector('video');
  Object.defineProperty(vd, 'currentTime', { value: 42.9, configurable: true });
  eq('ngoài phụ đề → dùng playhead', T.ytTimeFor(mkRange('#desc')), 42);
}

// trang không phải YouTube thì không gắn nguồn video
const w2 = bootPage('https://example.com/bai-viet', '<p id="p">Chữ thường</p>');
eq('trang thường → không có id video', (w2.__NN_TEST__ || {}).ytVideoId(), '');

/* ---------- 2. shorts / live ---------- */
console.log('\n[2] dạng URL khác');
const w3 = bootPage('https://www.youtube.com/shorts/abc123XYZ_-', '<video></video>');
eq('/shorts/<id>', (w3.__NN_TEST__ || {}).ytVideoId(), 'abc123XYZ_-');

/* ---------- 3. background.js lưu yt vào note ---------- */
console.log('\n[3] background.js phải LƯU mốc giây (chỗ trước đây bị rơi)');
const bg = read('background.js');
const m = bg.match(/yt:\s*\(cap\.yt[\s\S]*?\} : null,/);
ok('có nhánh lưu yt', !!m);
if (m) {
  const build = cap => vm.runInNewContext(`(${'{' + m[0].replace(/,$/, '') + '}'})`, { cap, Math, String });
  const a = build({ yt: { v: 'vid1', t: 127.8, dur: 4.2, kenh: 'Kênh A' } });
  eq('lưu id video', a.yt.v, 'vid1');
  eq('giây được làm tròn xuống', a.yt.t, 127);
  eq('giữ kênh', a.yt.kenh, 'Kênh A');
  eq('không có nguồn video → null', build({ yt: null }).yt, null);
  eq('yt thiếu id → null', build({ yt: { t: 5 } }).yt, null);
  eq('giây âm bị chặn về 0', build({ yt: { v: 'x', t: -3 } }).yt.t, 0);
}

/* ---------- 4. notes.js: mở đúng chỗ ---------- */
console.log('\n[4] mở nguồn: tua tab đang mở, không mở thêm tab');
const src = read('notes.js');
const block = src.slice(src.indexOf('function ytStamp'), src.indexOf('function labelDot'));
ok('tách được khối YouTube trong notes.js', block.length > 200);

const calls = { created: [], updated: [], sent: [], focused: [] };
let tabsInWindow = [];
const sandbox = {
  chrome: {
    runtime: { lastError: null },
    tabs: {
      query: (q, cb) => cb(tabsInWindow),
      create: o => calls.created.push(o.url),
      update: (id, o) => calls.updated.push({ id, ...o }),
      sendMessage: (id, msg, cb) => { calls.sent.push({ id, msg }); cb && cb(); }
    },
    windows: { update: (id, o) => calls.focused.push(id) }
  },
  encodeURIComponent, Math, String
};
vm.runInNewContext(block + '\nthis.ytStamp=ytStamp; this.openYoutube=openYoutube; this.shareUrl=shareUrl; this.ytUrl=ytUrl;', sandbox);

eq('định dạng mốc: 127s → 2:07', sandbox.ytStamp(127), '2:07');
eq('định dạng mốc: 3765s → 1:02:45', sandbox.ytStamp(3765), '1:02:45');
eq('định dạng mốc: 5s → 0:05', sandbox.ytStamp(5), '0:05');
eq('link chia sẻ kèm mốc giây', sandbox.shareUrl({ yt: { v: 'vid1', t: 127 } }),
   'https://www.youtube.com/watch?v=vid1&t=127s');
eq('mục không phải video → link trang như cũ',
   sandbox.shareUrl({ fragUrl: 'https://a.com/x#:~:text=abc', url: 'https://a.com/x' }),
   'https://a.com/x#:~:text=abc');

// (a) video CHƯA mở ở đâu → mở tab mới kèm mốc giây
tabsInWindow = [{ id: 9, url: 'https://www.youtube.com/watch?v=KHAC', windowId: 1 }];
sandbox.openYoutube({ v: 'vid1', t: 127 });
eq('video chưa mở → mở tab mới đúng mốc', calls.created[0], 'https://www.youtube.com/watch?v=vid1&t=127s');
ok('không đụng tab của video khác', calls.sent.length === 0);

// (b) video ĐANG mở → nhảy sang tab đó và tua, KHÔNG mở thêm
calls.created.length = 0;
tabsInWindow = [{ id: 7, url: 'https://www.youtube.com/watch?v=vid1&list=z', windowId: 3 }];
sandbox.openYoutube({ v: 'vid1', t: 300 });
ok('KHÔNG mở thêm tab', calls.created.length === 0, 'đã mở: ' + calls.created);
ok('kích hoạt đúng tab đang mở', calls.updated.some(u => u.id === 7 && u.active === true));
ok('đưa cửa sổ chứa tab lên trước', calls.focused.includes(3));
eq('gửi lệnh tua đúng giây', calls.sent[0] && calls.sent[0].msg.t, 300);
eq('lệnh tua kèm đúng id video', calls.sent[0] && calls.sent[0].msg.v, 'vid1');

// (c) tab cũ chưa có content script → nạp thẳng URL kèm mốc
calls.created.length = 0; calls.updated.length = 0; calls.sent.length = 0;
sandbox.chrome.tabs.sendMessage = (id, msg, cb) => {
  calls.sent.push({ id, msg });
  sandbox.chrome.runtime.lastError = { message: 'no receiver' };
  cb && cb();
  sandbox.chrome.runtime.lastError = null;
};
sandbox.openYoutube({ v: 'vid1', t: 88 });
ok('tab không nhận lệnh → nạp URL kèm mốc giây',
   calls.updated.some(u => u.url === 'https://www.youtube.com/watch?v=vid1&t=88s'),
   JSON.stringify(calls.updated));

/* ---------- 5. quyền manifest ---------- */
console.log('\n[5] manifest');
const mf = JSON.parse(read('manifest.json'));
ok('có quyền "tabs" (cần cho tabs.query theo URL)', mf.permissions.includes('tabs'),
   JSON.stringify(mf.permissions));

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
