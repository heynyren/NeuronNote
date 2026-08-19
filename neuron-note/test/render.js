/* Render công thức trong trang ghi chú, dùng KaTeX thật đã đóng gói */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { JSDOM } = require('jsdom');
const DIR = require("path").join(__dirname, "..");
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(read('notes.html'), {
    url: 'http://localhost/notes.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window, d = w.document;

  const now = Date.now();
  const notes = {
    n1: { id:'n1', text:'Tiết diện cáp $\\ge 8mm^2$ là an toàn',
          rich:'Tiết diện cáp $\\ge 8mm^2$ là an toàn',
          note:'', tags:[], color:'amber', url:'https://a.com/x', title:'A',
          createdAt:now, updatedAt:now, deleted:false,
          srs:{ due:now-1000, box:0, reps:0, learn:true, known:false } },
    n2: { id:'n2', text:'Chữ thường không công thức: ệ ộ ữ ậ', rich:'',
          note:'', tags:[], color:'mint', url:'https://a.com/y', title:'B',
          createdAt:now, updatedAt:now, deleted:false,
          srs:{ due:now+9e8, box:1, reps:1, learn:true, known:false } }
  };
  const store = { notes, settings: { labels: [], autoSync: false } };
  w.chrome = {
    storage: { local: { get:(defs,cb)=>cb(Object.assign({},defs,store)),
                        set:(o,cb)=>{Object.assign(store,o); cb&&cb();} },
               onChanged:{ addListener(){} } },
    runtime: { sendMessage:(m,cb)=>cb&&cb({ok:true}) },
    tabs: { create(){} }
  };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(read('vendor/katex/katex.min.js'), ctx, { filename:'katex.min.js' });
  ok('KaTeX nạp được', typeof w.katex === 'object' && typeof w.katex.renderToString === 'function');
  vm.runInContext(read('chu-bang.js'), ctx, { filename:'chu-bang.js' });
  vm.runInContext(read('chu.js'), ctx, { filename:'chu.js' });
  vm.runInContext(read('shared.js'), ctx, { filename:'shared.js' });
  vm.runInContext(read('notes.js'), ctx, { filename:'notes.js' });
  await sleep(60);

  console.log('\n[thư viện]');
  const c1 = d.querySelector('.note[data-id="n1"] .quote');
  ok('thẻ ghi chú hiện ra', !!c1);
  ok('công thức được render (có .katex)', !!(c1 && c1.querySelector('.katex')),
     c1 && c1.innerHTML.slice(0, 120));
  ok('chữ tiếng Việt quanh công thức còn nguyên',
     !!(c1 && c1.textContent.includes('Tiết diện cáp') && c1.textContent.includes('là an toàn')),
     c1 && c1.textContent);
  ok('KHÔNG còn ký tự $ lộ ra ngoài', !!(c1 && !c1.textContent.includes('$')),
     c1 && c1.textContent);

  const c2 = d.querySelector('.note[data-id="n2"] .quote');
  ok('ghi chú không công thức giữ nguyên dấu tiếng Việt',
     !!(c2 && c2.textContent.trim() === 'Chữ thường không công thức: ệ ộ ữ ậ'),
     c2 && c2.textContent);

  console.log('\n[chế độ học]');
  d.getElementById('btnStudy').click();
  await sleep(40);
  const sq = d.querySelector('#studyStage .st-quote');
  ok('thẻ học hiện ra', !!sq);
  ok('công thức render trong chế độ học', !!(sq && sq.querySelector('.katex')),
     sq && sq.innerHTML.slice(0, 120));

  console.log('\n[an toàn: text phải được escape]');
  const evil = 'Xem <img src=x onerror="alert(1)"> và $x^2$ nhé';
  const html = w.__NN_MATH__ ? w.__NN_MATH__(evil) : null;
  ok('mathHtml có thể gọi được', !!html);
  if (html) {
    // Parse it the way the page would: escaped text must stay text, never elements.
    const box = d.createElement('div');
    box.innerHTML = html;
    ok('không tạo ra phần tử <img> nào', box.querySelectorAll('img').length === 0);
    ok('không phần tử nào mang onerror',
       Array.from(box.querySelectorAll('*')).every(el => !el.hasAttribute('onerror')));
    ok('chuỗi nguy hiểm chỉ còn là chữ',
       box.textContent.includes('<img src=x onerror="alert(1)">'), box.textContent);
    ok('nhưng công thức vẫn render', !!box.querySelector('.katex'));
  }

  console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
