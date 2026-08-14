const NN = require('../shared.js');
let fail = 0;
const eq = (name, got, want) => {
  const ok = got === want;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : `\n         got:  ${JSON.stringify(got)}\n         want: ${JSON.stringify(want)}`));
  if (!ok) fail++;
};
const truthy = (name, v, note) => { const ok = !!v; console.log((ok?'  PASS  ':'  FAIL  ')+name+(ok?'':'  → '+note)); if(!ok) fail++; };

console.log('\n[1] unicodeToLatex — công thức copy từ PDF');
eq('luỹ thừa', NN.unicodeToLatex('x² + y² = z²'), 'x^2 + y^2 = z^2');
eq('luỹ thừa nhiều chữ số', NN.unicodeToLatex('x¹⁰'), 'x^{10}');
eq('chỉ số dưới', NN.unicodeToLatex('H₂O'), 'H_2O');
eq('chỉ số nhiều ký tự', NN.unicodeToLatex('a₁₂'), 'a_{12}');
eq('chữ Hy Lạp', NN.unicodeToLatex('α + β = π'), '\\alpha + \\beta = \\pi');
eq('toán tử so sánh', NN.unicodeToLatex('a ≤ b ≠ c'), 'a \\leq b \\neq c');
eq('dấu trừ thật (U+2212)', NN.unicodeToLatex('5 − 3'), '5 - 3');
eq('tích phân & vô cực', NN.unicodeToLatex('∫₀∞'), '\\int_0\\infty');
eq('căn bậc hai thêm ngoặc', NN.unicodeToLatex('√2'), '\\sqrt{2}');
eq('nhân/chia', NN.unicodeToLatex('a × b ÷ c'), 'a \\times b \\div c');
eq('tập hợp số', NN.unicodeToLatex('x ∈ ℝ'), 'x \\in \\mathbb{R}');

console.log('\n[2] fixCopyArtifacts — rác khi copy từ PDF');
eq('bỏ soft hyphen', NN.fixCopyArtifacts('exam­ple'), 'example');
eq('ligature fi', NN.fixCopyArtifacts('ﬁnal'), 'final');
eq('NBSP thành space', NN.fixCopyArtifacts('a b'), 'a b');

console.log('\n[3] autoMath — trộn văn xuôi + công thức');
eq('giữ nguyên văn xuôi thuần', NN.autoMath('Hôm nay trời đẹp quá.'), 'Hôm nay trời đẹp quá.');
eq('tiếng Việt có dấu không bị đụng', NN.autoMath('Định lý Pytago rất hữu ích'), 'Định lý Pytago rất hữu ích');
eq('bọc công thức', NN.autoMath('Ta có x² rồi.'), 'Ta có $x^2$ rồi.');
eq('dấu câu nằm ngoài $', NN.autoMath('giá trị x².'), 'giá trị $x^2$.');
eq('không đụng phần đã có $', NN.autoMath('cho $a^2$ và b²'), 'cho $a^2$ và $b^2$');
truthy('chạy 2 lần không hỏng', NN.autoMath(NN.autoMath('x²')) === NN.autoMath('x²'),
  'lần 2 = ' + NN.autoMath(NN.autoMath('x²')));
eq('tiếng Nhật không bị đụng', NN.autoMath('これはテストです'), 'これはテストです');

console.log('\n[4] splitMath — tách để render');
eq('không có công thức', JSON.stringify(NN.splitMath('chỉ là chữ')),
   JSON.stringify([{type:'text',value:'chỉ là chữ'}]));
eq('inline', JSON.stringify(NN.splitMath('cho $x^2$ nhé')),
   JSON.stringify([{type:'text',value:'cho '},{type:'math',value:'x^2',display:false},{type:'text',value:' nhé'}]));
eq('block $$', JSON.stringify(NN.splitMath('$$E=mc^2$$')),
   JSON.stringify([{type:'math',value:'E=mc^2',display:true}]));
eq('hasMath', String(NN.hasMath('a $x$ b')) + String(NN.hasMath('không có')), 'truefalse');

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
