/* Đính kèm: lưu IndexedDB, KHÔNG lọt vào payload đồng bộ Drive */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { JSDOM } = require('jsdom');
require('fake-indexeddb/auto');
const DIR = require("path").join(__dirname, "..");
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/', runScripts: 'outside-only' });
  const w = dom.window;
  // fake-indexeddb + Blob into the jsdom realm
  w.indexedDB = global.indexedDB;
  w.IDBKeyRange = global.IDBKeyRange;
  w.Blob = global.Blob;
  w.URL.createObjectURL = () => 'blob:fake';
  w.URL.revokeObjectURL = () => {};
  // no createImageBitmap in jsdom → shrinkImage falls back to the original blob
  vm.runInContext(read('attach.js'), dom.getInternalVMContext(), { filename: 'attach.js' });
  const NA = w.NNFiles;

  console.log('\n[1] lưu và đọc lại đính kèm');
  ok('module nạp được', !!NA);
  const png = new w.Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
  png.name = 'anh.png';
  const d1 = await NA.put(png, 'anh.png');
  ok('put trả về descriptor nhẹ', d1 && d1.id && d1.name === 'anh.png' && d1.size > 0, JSON.stringify(d1));
  ok('descriptor KHÔNG chứa blob', d1 && d1.blob === undefined, JSON.stringify(Object.keys(d1 || {})));
  const back = await NA.get(d1.id);
  ok('đọc lại được blob', !!(back && back.blob), JSON.stringify(back && Object.keys(back)));

  console.log('\n[2] chặn file quá lớn');
  const huge = new w.Blob([new Uint8Array(NA.MAX_BYTES + 10)], { type: 'application/pdf' });
  let msg = '';
  try { await NA.put(huge, 'to.pdf'); } catch (e) { msg = e.message; }
  ok('từ chối file vượt hạn mức', /larger than/.test(msg), msg || '(không báo lỗi)');

  console.log('\n[3] dọn blob mồ côi');
  const d2 = await NA.put(new w.Blob(['x'], { type: 'text/plain' }), 'bo.txt');
  const notes = { n1: { id: 'n1', deleted: false, files: [d1] } };   // d2 không được note nào dùng
  const gone = await NA.sweep(notes);
  ok('xoá đúng 1 blob mồ côi', gone === 1, 'gone=' + gone);
  ok('blob còn dùng vẫn nguyên', !!(await NA.get(d1.id)));
  ok('blob mồ côi đã biến mất', (await NA.get(d2.id)) === null);

  console.log('\n[4] định dạng dung lượng');
  ok('B', NA.formatSize(500) === '500 B', NA.formatSize(500));
  ok('KB', NA.formatSize(2048) === '2 KB', NA.formatSize(2048));
  ok('MB', NA.formatSize(3 * 1024 * 1024) === '3.0 MB', NA.formatSize(3 * 1024 * 1024));

  console.log('\n[5] ĐỒNG BỘ: đính kèm không được lọt lên Drive');
  // tái hiện đúng đoạn strip trong background.js
  const src = read('background.js');
  const m = src.match(/const outgoing = \{\};[\s\S]*?\}\);/);
  ok('tìm thấy đoạn strip trong background.js', !!m);
  if (m) {
    const local = { a: { id: 'a', text: 'x', files: [d1] }, b: { id: 'b', text: 'y' } };
    const outgoing = vm.runInNewContext(`${m[0]}; outgoing;`, { local, Object });
    ok('note có file → bản gửi đi đã bỏ files', outgoing.a && outgoing.a.files === undefined,
       JSON.stringify(outgoing.a));
    ok('bản gốc trong máy vẫn giữ files', local.a.files.length === 1);
    ok('note không có file giữ nguyên', outgoing.b === local.b);
  }

  console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
