/* Câu hỏi gửi Gemini: phải kèm đủ ngữ cảnh, và hỏi theo KIẾN THỨC RỘNG */
const path = require('path');
const NN = require(path.join(__dirname, '..', 'shared.js'));
global.NN = NN;
const H = require(path.join(__dirname, '..', 'hoi-gemini.js'));
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };
const eq = (n, g, w) => ok(n, g === w, `got ${JSON.stringify(g)} want ${JSON.stringify(w)}`);

const DOAN = {
  id: 'n1',
  text: 'tổng trở',
  ctx: 'Khái niệm tổng trở mô tả mức cản trở dòng điện xoay chiều, gồm cả điện trở thuần lẫn thành phần phản kháng.',
  note: 'Tôi hiểu là giống điện trở nhưng cho dòng xoay chiều',
  tags: ['điện', 'cơ bản'],
  title: 'Bài giảng mạch điện',
  url: 'https://example.com/mach-dien',
  fragUrl: 'https://example.com/mach-dien#:~:text=t%E1%BB%95ng%20tr%E1%BB%9F'
};

console.log('\n[1] nhận đúng loại đoạn');
eq('cụm ngắn → thuật ngữ', H.loaiCua({ text: 'tổng trở' }), 'thuatNgu');
eq('câu dài → đoạn', H.loaiCua({ text: 'Dòng điện xoay chiều đổi chiều liên tục theo thời gian, và vì thế.' }), 'doan');
eq('có công thức → congThuc', H.loaiCua({ text: 'Ta có $Z = \\sqrt{R^2 + X^2}$' }), 'congThuc');
eq('rỗng → đoạn', H.loaiCua({}), 'doan');

console.log('\n[2] câu hỏi mang theo đủ dữ kiện');
const q = H.loiHoi(DOAN);
ok('có chính đoạn đã lưu', q.indexOf('tổng trở') >= 0);
ok('CÓ NGỮ CẢNH đi kèm', q.indexOf('ĐOẠN VĂN NÓ NẰM TRONG') >= 0 && q.indexOf('phản kháng') >= 0);
ok('có ghi chú riêng', q.indexOf('Tôi hiểu là giống điện trở') >= 0);
ok('có nhãn', q.indexOf('điện, cơ bản') >= 0);
ok('CÓ LINK NGUỒN', q.indexOf('https://example.com/mach-dien') >= 0);
ok('yêu cầu trả lời tiếng Việt', q.indexOf('TRẢ LỜI BẰNG TIẾNG VIỆT') >= 0);

console.log('\n[3] hỏi theo kiến thức rộng, KHÔNG phải từ vựng');
ok('hỏi VÌ SAO nó đúng', /VÌ SAO nó đúng/.test(q));
ok('hỏi dùng vào việc gì', /dùng vào việc gì/.test(q));
ok('hỏi ranh giới / ngoại lệ', /Ranh giới|ngoại lệ/.test(q));
ok('hỏi bẫy hiểu lầm', /hiểu lầm/.test(q));
ok('có soi ghi chú của tôi', /ghi chú tôi tự viết/i.test(q));
ok('KHÔNG hỏi sắc thái như app từ vựng', !/sắc thái|mức trang trọng/.test(q), 'lạc sang kiểu NeutronDict');
ok('KHÔNG nhắc NeutronDict', !/NeutronDict/i.test(q));

console.log('\n[4] công thức thì hỏi khác hẳn');
const qf = H.loiHoi({ text: 'Tổng trở $Z = \\sqrt{R^2 + X^2}$ với R là điện trở', ctx: 'Trong mạch RLC nối tiếp, tổng trở $Z = \\sqrt{R^2+X^2}$ quyết định biên độ dòng.' });
ok('hỏi nghĩa từng ký hiệu', /TỪNG ký hiệu/.test(qf));
ok('hỏi điều kiện áp dụng', /điều kiện nào/.test(qf));
ok('đòi ví dụ tính bằng số', /ví dụ tính bằng số/.test(qf));
ok('đoạn thường thì KHÔNG hỏi ký hiệu', !/TỪNG ký hiệu/.test(q));

console.log('\n[5] không có ngữ cảnh thì nói thẳng, không để mô hình bịa');
const qn = H.loiHoi({ text: 'entropy', url: 'https://a.com/x' });
ok('nói rõ chưa có ngữ cảnh', /CHƯA cắt được đoạn văn/.test(qn));
ok('dặn đừng đoán', /đừng đoán là tôi đã gặp nó ở đâu/.test(qn));
ok('không có khối ngữ cảnh rỗng', qn.indexOf('ĐOẠN VĂN NÓ NẰM TRONG') < 0);

console.log('\n[6] nguồn YouTube kèm mốc phút');
const qy = H.loiHoi({ text: 'dòng rò', ctx: 'Nói về dòng rò trong hệ thống điện mặt trời.',
  yt: { v: 'abc123', t: 227, kenh: 'Kênh Điện' }, title: 'Điện mặt trời', url: 'https://www.youtube.com/watch?v=abc123' });
ok('ghi phút 3:47', qy.indexOf('phút 3:47') >= 0, qy.match(/phút [^\s]+/));
ok('có tên kênh', qy.indexOf('Kênh Điện') >= 0);
ok('link kèm mốc giây', qy.indexOf('watch?v=abc123&t=227s') >= 0);

console.log('\n[7] ngữ cảnh trùng y hệt đoạn thì không lặp lại');
const qd = H.loiHoi({ text: 'abc', ctx: 'abc' });
ok('không in khối ngữ cảnh thừa', qd.indexOf('ĐOẠN VĂN NÓ NẰM TRONG') < 0);

console.log('\n[8] an toàn');
eq('không note nào → vẫn ra chuỗi', typeof H.loiHoi(null), 'string');
ok('note rỗng không làm nổ', H.loiHoi({}).length > 50);
eq('địa chỉ Gemini là trang chat trơn', H.GEMINI_URL, 'https://gemini.google.com/app');
ok('KHÔNG nhét câu hỏi vào URL (?q= đã hỏng im lặng)', H.GEMINI_URL.indexOf('?') < 0);

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
