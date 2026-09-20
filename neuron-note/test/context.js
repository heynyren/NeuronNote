/* Ngữ cảnh rộng quanh đoạn bôi đen — thứ Gemini cần để hiểu đúng */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { JSDOM } = require('jsdom');
const DIR = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };

function boot(body) {
  const dom = new JSDOM('<!doctype html><body>' + body + '</body>',
    { url: 'https://example.com/a', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.chrome = { runtime: { onMessage: { addListener() {} }, sendMessage() {}, id: 't' },
               storage: { local: { get: (d, cb) => cb(d), set: (o, cb) => cb && cb() }, onChanged: { addListener() {} } } };
  vm.runInContext(read('content.js'), dom.getInternalVMContext(), { filename: 'content.js' });
  return w;
}
/** Bôi đen đúng chuỗi `needle` nằm trong phần tử sel. */
function rangeFor(w, sel, needle) {
  const d = w.document, host = d.querySelector(sel);
  const walk = d.createTreeWalker(host, 4 /* SHOW_TEXT */);
  let n;
  while ((n = walk.nextNode())) {
    const i = n.nodeValue.indexOf(needle);
    if (i >= 0) { const r = d.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length); return r; }
  }
  throw new Error('không tìm thấy: ' + needle);
}

const LONG = 'Điện áp là hiệu điện thế giữa hai điểm trong mạch. '.repeat(20);
const w = boot(`
  <article>
    <p id="p1">${LONG}Khái niệm <b>tổng trở</b> mô tả mức cản trở dòng điện xoay chiều. ${LONG}</p>
    <p id="p2">Một đoạn ngắn.</p>
    <div id="wrap"><p id="p3">Chỉ vài chữ ở đây.</p><p>Đoạn kế bên bổ sung thêm nhiều chữ nữa cho đủ dài để làm ngữ cảnh tử tế.</p></div>
  </article>`);
const T = w.__NN_TEST__ || {};
ok('content.js có hook contextText', typeof T.contextText === 'function');

if (T.contextText) {
  console.log('\n[1] lấy cả đoạn quanh phần bôi đen');
  const ctx = T.contextText(rangeFor(w, '#p1', 'tổng trở'), 'tổng trở');
  ok('có ngữ cảnh', !!ctx);
  ok('chứa chính phần bôi đen', ctx.indexOf('tổng trở') >= 0);
  ok('có chữ ĐỨNG TRƯỚC nó', ctx.indexOf('Khái niệm') >= 0, ctx.slice(0, 80));
  ok('có chữ ĐỨNG SAU nó', ctx.indexOf('mức cản trở') >= 0);
  ok('dài hơn hẳn prefix/suffix 60 ký tự', ctx.length > 400, 'dài ' + ctx.length);
  ok('bị cắt nên có dấu …', ctx.indexOf('…') >= 0);
  ok('không nuốt cả trang (có trần)', ctx.length < 1700, 'dài ' + ctx.length);

  console.log('\n[2] đoạn quá ngắn thì mượn thêm quanh nó');
  const c3 = T.contextText(rangeFor(w, '#p3', 'vài chữ'), 'vài chữ');
  ok('mở rộng sang đoạn kế bên', c3.indexOf('Đoạn kế bên') >= 0, c3);

  console.log('\n[3] bôi đen nguyên một đoạn ngắn → mượn ngữ cảnh quanh nó');
  const c2 = T.contextText(rangeFor(w, '#p2', 'Một đoạn ngắn.'), 'Một đoạn ngắn.');
  ok('không trả về y hệt phần bôi đen', c2 !== 'Một đoạn ngắn.', JSON.stringify(c2));
  ok('có chữ từ đoạn bên cạnh', c2.indexOf('Điện áp') >= 0, c2.slice(0, 60));

  console.log('\n[4] cắt ở ranh giới chữ, không cắt giữa chữ');
  const c1 = T.contextText(rangeFor(w, '#p1', 'tổng trở'), 'tổng trở');
  const than = c1.replace(/^…\s*/, '').replace(/\s*…$/, '');
  const dau = than.split(/\s+/)[0];
  const tuTrongNguon = new Set(LONG.split(/\s+/).filter(Boolean));
  ok('chữ đầu là một chữ TRỌN VẸN của nguồn', tuTrongNguon.has(dau), 'chữ đầu = ' + JSON.stringify(dau));
  const cuoi = than.split(/\s+/).pop();
  ok('chữ cuối cũng trọn vẹn',
     tuTrongNguon.has(cuoi) || 'mô tả mức cản trở dòng điện xoay chiều.'.split(' ').includes(cuoi),
     'chữ cuối = ' + JSON.stringify(cuoi));
}

console.log('\n[5] background lưu ctx vào note');
const bg = read('background.js');
ok('có dòng lưu ctx', /ctx:\s*NN\.squash\(cap\.ctx/.test(bg));

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
