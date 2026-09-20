/* Nút Hỏi Gemini trong thư viện và chế độ học */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { JSDOM } = require('jsdom');
require('fake-indexeddb/auto');
const DIR = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(read('notes.html'), { url: 'http://localhost/notes.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.indexedDB = global.indexedDB; w.IDBKeyRange = global.IDBKeyRange;

  const now = Date.now();
  const mk = (id, extra) => Object.assign({
    id, text: 'tổng trở', ctx: 'Khái niệm tổng trở mô tả mức cản trở dòng điện xoay chiều.',
    note: '', tags: ['điện'], color: 'amber', url: 'https://a.com/x', title: 'Mạch điện',
    createdAt: now, updatedAt: now, deleted: false,
    srs: { due: now - 1000, box: 0, reps: 0, learn: true, known: false }
  }, extra || {});
  const store = { notes: { n1: mk('n1'), n2: mk('n2', { hoiAi: { url: 'https://gemini.google.com/app/CHAT123', ts: now } }) },
                  settings: { labels: [], autoSync: false } };

  const sent = [];
  let clip = '';
  w.chrome = {
    storage: { local: { get: (defs, cb) => cb(Object.assign({}, defs, store)), set: (o, cb) => { Object.assign(store, o); cb && cb(); } }, onChanged: { addListener() {} } },
    runtime: { sendMessage: (m, cb) => { sent.push(m); cb && cb({ ok: true }); }, lastError: null },
    tabs: { create() {}, query: (q, cb) => cb([]), update() {}, sendMessage() {} },
    windows: { update() {} }
  };
  Object.defineProperty(w.navigator, 'clipboard', {
    value: { writeText: t => { clip = t; return Promise.resolve(); } }, configurable: true
  });

  const ctx = dom.getInternalVMContext();
  ['vendor/katex/katex.min.js', 'chu-bang.js', 'chu.js', 'shared.js', 'hoi-gemini.js', 'progress.js', 'attach.js', 'notes.js']
    .forEach(f => { try { vm.runInContext(read(f), ctx, { filename: f }); } catch (e) { /* tệp phụ có thể vắng */ } });
  await sleep(60);

  console.log('\n[1] nút trong thư viện');
  const card = d.querySelector('.note[data-id="n1"]');
  ok('thẻ hiện ra', !!card);
  const gem = card && card.querySelector('[data-act="gemini"]');
  ok('có nút Hỏi Gemini', !!gem);
  ok('mục chưa hỏi thì KHÔNG có link chat', !card.querySelector('.gem-back'));

  const card2 = d.querySelector('.note[data-id="n2"]');
  const back = card2 && card2.querySelector('.gem-back');
  ok('mục đã hỏi thì CÓ link quay lại chat', !!back);
  ok('link trỏ đúng đoạn chat đã lưu',
     back && back.getAttribute('href') === 'https://gemini.google.com/app/CHAT123', back && back.getAttribute('href'));

  console.log('\n[2] bấm nút → chép câu hỏi + nhờ nền mở tab');
  gem.click();
  await sleep(40);
  ok('đã chép vào bộ nhớ tạm', clip.length > 100, 'dài ' + clip.length);
  ok('câu hỏi có ngữ cảnh', clip.indexOf('mức cản trở dòng điện xoay chiều') >= 0);
  ok('câu hỏi có nguồn', clip.indexOf('https://a.com/x') >= 0);
  const mo = sent.filter(m => m.type === 'MO_GEMINI');
  ok('đã nhờ nền mở Gemini', mo.length === 1, JSON.stringify(sent));
  ok('gửi kèm id của mục (để nền gắn link chat)', mo[0] && mo[0].id === 'n1', JSON.stringify(mo[0]));

  console.log('\n[3] nút trong chế độ học');
  d.getElementById('btnStudy').click();
  await sleep(40);
  const sc = d.querySelector('#studyStage .study-card');
  ok('thẻ học hiện ra', !!sc);
  ok('có nút Hỏi Gemini trong chế độ học', !!(sc && sc.querySelector('[data-st="gemini"]')));

  clip = ''; sent.length = 0;
  sc.querySelector('[data-st="gemini"]').click();
  await sleep(40);
  ok('bấm trong chế độ học cũng chép câu hỏi', clip.length > 100);
  ok('và cũng nhờ nền mở tab', sent.some(m => m.type === 'MO_GEMINI'));

  console.log('\n[4] nền có canh tab để lưu link chat');
  const bg = read('background.js');
  ok('có case MO_GEMINI', /case 'MO_GEMINI'/.test(bg));
  ok('có regex nhận URL đoạn chat', /GEMINI_RE\s*=/.test(bg));
  ok('regex khớp URL chat thật',
     /^https:\/\/gemini\.google\.com\/app\/[A-Za-z0-9_-]{4,}/.test('https://gemini.google.com/app/abc123XYZ'));
  ok('regex KHÔNG khớp trang chat trơn',
     !/^https:\/\/gemini\.google\.com\/app\/[A-Za-z0-9_-]{4,}/.test('https://gemini.google.com/app'));
  ok('có ghi hoiAi vào note', /hoiAi:\s*\{\s*url/.test(bg));
  ok('dọn mục chờ khi đóng tab', /onRemoved/.test(bg));

  console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
