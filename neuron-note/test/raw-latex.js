/* LaTeX thô nằm thẳng trong chữ — đúng các câu trong ảnh người dùng gửi */
const NN = require('../shared.js');
let fail = 0;
const eq = (n, got, want) => {
  const ok = got === want;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok ? '' : `\n         got:  ${JSON.stringify(got)}\n         want: ${JSON.stringify(want)}`));
  if (!ok) fail++;
};
const j = v => JSON.stringify(v);

console.log('\n[1] Câu thật từ ảnh của bạn');
eq('tiết diện cáp',
   NN.toStandardMath('Tiết diện cáp $\\ge 8mm^2$'),
   'Tiết diện cáp $\\ge 8mm^2$');
eq('điện áp DC',
   NN.toStandardMath('Điện áp Mặt trời DC $\\le 1500V$ là những điểm mù'),
   'Điện áp Mặt trời DC $\\le 1500V$ là những điểm mù');
eq('là bao nhiêu mm^2',
   NN.toStandardMath('tà bảo nhiêu $mm^2$?'),
   'tà bảo nhiêu $mm^2$?');

console.log('\n[2] Dạng LaTeX "không chuẩn" → đưa về chuẩn');
eq('\\( \\) → $ $', NN.repairLatex('cho \\(x^2+1\\) nhé'), 'cho $x^2+1$ nhé');
eq('\\[ \\] → $$ $$', NN.repairLatex('\\[E=mc^2\\]'), '$$E=mc^2$$');
eq('backslash bị nhân đôi', NN.repairLatex('$\\\\alpha + \\\\beta$'), '$\\alpha + \\beta$');
eq('\\$ thành $', NN.repairLatex('giá \\$x^2\\$ đây'), 'giá $x^2$ đây');
eq('bỏ khoảng trắng thừa trong $', NN.repairLatex('$ x^2 $'), '$x^2$');
eq('môi trường align không delimiter',
   NN.repairLatex('Ta có \\begin{align}a&=b\\end{align} xong'),
   'Ta có $$\\begin{align}a&=b\\end{align}$$ xong');
eq('chạy 2 lần không đổi',
   NN.repairLatex(NN.repairLatex('cho \\(x^2\\) nhé')),
   NN.repairLatex('cho \\(x^2\\) nhé'));

console.log('\n[3] splitMath nhận đủ các kiểu delimiter');
eq('$…$ trong câu tiếng Việt',
   j(NN.splitMath('Tiết diện cáp $\\ge 8mm^2$ nhé')),
   j([{type:'text',value:'Tiết diện cáp '},{type:'math',value:'\\ge 8mm^2',display:false},{type:'text',value:' nhé'}]));
eq('$$ là display', j(NN.splitMath('$$E=mc^2$$')), j([{type:'math',value:'E=mc^2',display:true}]));
eq('\\(…\\) là inline', j(NN.splitMath('\\(a+b\\)')), j([{type:'math',value:'a+b',display:false}]));
eq('\\[…\\] là display', j(NN.splitMath('\\[a+b\\]')), j([{type:'math',value:'a+b',display:true}]));
eq('môi trường là display',
   j(NN.splitMath('\\begin{cases}x\\end{cases}')),
   j([{type:'math',value:'\\begin{cases}x\\end{cases}',display:true}]));
eq('hai công thức trong 1 câu',
   j(NN.splitMath('cáp $\\ge 8mm^2$ và áp $\\le 1500V$')),
   j([{type:'text',value:'cáp '},{type:'math',value:'\\ge 8mm^2',display:false},
      {type:'text',value:' và áp '},{type:'math',value:'\\le 1500V',display:false}]));

console.log('\n[4] Không phá văn bản thường');
eq('văn xuôi tiếng Việt', NN.toStandardMath('Giá là 100.000 đồng, giảm 20% sức căng.'),
   'Giá là 100.000 đồng, giảm 20% sức căng.');
eq('tiếng Nhật giữ nguyên', NN.toStandardMath('電線の種類とその接続'), '電線の種類とその接続');
eq('tiếng Việt có dấu giữ nguyên', NN.toStandardMath('ệ ộ ữ ậ ằ ẵ'), 'ệ ộ ữ ậ ằ ẵ');
eq('một dấu $ lẻ không thành công thức', j(NN.splitMath('giá 5$ thôi')),
   j([{type:'text',value:'giá 5$ thôi'}]));

console.log('\n[5] Unicode + LaTeX lẫn lộn');
eq('unicode khi chưa có $', NN.toStandardMath('công thức x² + y²'), 'công thức $x^2 + y^2$');
eq('đã có $ thì không đụng unicode', NN.toStandardMath('$x^2$ và y²'), '$x^2$ và y²');

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
