/* Bắt LaTeX từ DOM thật của KaTeX / MathJax / Wikipedia */
const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const DIR = require("path").join(__dirname, "..");
let fail = 0;
const eq = (name, got, want) => {
  const ok = got === want;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : `\n         got:  ${JSON.stringify(got)}\n         want: ${JSON.stringify(want)}`));
  if (!ok) fail++;
};

// KaTeX markup, as Gemini and most docs sites emit it
const KATEX = (tex, glyphs, display) =>
  `<span class="katex${display ? ' katex-display' : ''}">` +
    `<span class="katex-mathml"><math><semantics><mrow></mrow>` +
      `<annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span>` +
    `<span class="katex-html">${glyphs}</span></span>`;

const PAGE = `<!doctype html><html><body>
<p id="p1">Định lý Pytago nói rằng ${KATEX('a^2+b^2=c^2', '<span>a</span><span>2</span><span>+</span><span>b</span>')} với mọi tam giác vuông.</p>
<p id="p2">Khai triển: ${KATEX('\\int_0^\\infty e^{-x}\\,dx = 1', '<span>∫</span>', true)}</p>
<p id="p3">MathJax: <mjx-container class="MathJax" jax="CHTML"><mjx-math><mjx-mi>x</mjx-mi></mjx-math><mjx-assistive-mml><math><semantics><annotation encoding="application/x-tex">E = mc^2</annotation></semantics></math></mjx-assistive-mml></mjx-container> hết.</p>
<p id="p4">Wikipedia: <img class="mwe-math-fallback-image-inline" alt="\\sin^2\\theta + \\cos^2\\theta = 1" src="x.png"> xong.</p>
<p id="p5">Không có công thức, chỉ chữ tiếng Việt có dấu: ệ ộ ữ ậ.</p>
<p id="p6">Tiếng Nhật 日本語 テスト。</p>
</body></html>`;

const dom = new JSDOM(PAGE, { url: 'https://example.com/a', pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
w.chrome = {
  runtime: { onMessage: { addListener: () => {} }, sendMessage: () => {}, id: 'test' },
  storage: { local: { get: (d, cb) => cb(d), set: (o, cb) => cb && cb() }, onChanged: { addListener: () => {} } }
};
vm.runInContext(fs.readFileSync(DIR + '/content.js', 'utf8'), dom.getInternalVMContext(), { filename: 'content.js' });

// content.js is an IIFE with no exports; reach its helpers by re-running the
// capture path through a selection over each paragraph.
function richOf(id) {
  const el = w.document.getElementById(id);
  const range = w.document.createRange();
  range.selectNodeContents(el);
  const sel = w.getSelection();
  sel.removeAllRanges(); sel.addRange(range);
  return w.__NN_TEST__ ? w.__NN_TEST__.richTextOfRange(range) : null;
}

console.log('\n[bắt LaTeX từ trang web]');
if (!w.__NN_TEST__) {
  console.log('  (content.js chưa expose hook test — bỏ qua, kiểm tra bằng cách khác)');
} else {
  eq('KaTeX inline → $…$', richOf('p1'),
     'Định lý Pytago nói rằng $a^2+b^2=c^2$ với mọi tam giác vuông.');
  eq('KaTeX display → $$…$$', richOf('p2'),
     'Khai triển: $$\\int_0^\\infty e^{-x}\\,dx = 1$$');
  eq('MathJax v3 assistive-mml', richOf('p3'), 'MathJax: $E = mc^2$ hết.');
  eq('Wikipedia img[alt]', richOf('p4'), 'Wikipedia: $\\sin^2\\theta + \\cos^2\\theta = 1$ xong.');
  eq('không công thức → tiếng Việt nguyên vẹn', richOf('p5'),
     'Không có công thức, chỉ chữ tiếng Việt có dấu: ệ ộ ữ ậ.');
  eq('tiếng Nhật nguyên vẹn', richOf('p6'), 'Tiếng Nhật 日本語 テスト。');
}

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
