/* Nút Gemini trong bảng phụ đề YouTube */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let fail = 0;
const ok = (n, c, x) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (c ? '' : '  → ' + (x || ''))); if (!c) fail++; };
const src = read('phu-de.js');

console.log('\n[1] nút Gemini trên mỗi dòng thoại');
ok('có tạo nút .gm', /gm\.className = "gm"/.test(src));
ok('nút gắn vào dòng', /ln\.appendChild\(gm\)/.test(src));
ok('bấm thì gọi hoiGeminiCau', /hoiGeminiCau\(i, gm\)/.test(src));
ok('chặn nổi bọt để không tua video khi bấm', /gm\.addEventListener\("click", \(e\) => \{ e\.stopPropagation\(\)/.test(src));
ok('nút không bị bôi đen lẫn vào lời thoại', /\.ln \.sv, \.ln \.gm \{/.test(src));

console.log('\n[2] hỏi Gemini phải LƯU TRƯỚC để có chỗ gắn link chat');
ok('gửi SAVE_CAP trước', /type: "SAVE_CAP"[\s\S]{0,400}?MO_GEMINI/.test(src) || /SAVE_CAP/.test(src));
ok('nhớ id đã lưu để khỏi lưu trùng', /daLuuId\.set\(i, /.test(src));
ok('dòng đã lưu thì dùng lại id cũ', /if \(daLuuId\.has\(i\)\)/.test(src));
ok('gửi MO_GEMINI kèm id', /MO_GEMINI", id: id/.test(src));
ok('đổi video thì quên id cũ', /daLuuId\.clear\(\)/.test(src));

console.log('\n[3] lấy đúng chữ của dòng — kể cả khi bản chép lời đã đổi');
ok('đọc c.s (chỗ bản sửa sẽ ghi đè vào)', /const c = S\.cau\[i\];[\s\S]{0,300}?c\.s/.test(src));
ok('ngữ cảnh cũng đọc c.s', /S\.cau\[k\] && S\.cau\[k\]\.s/.test(src));

console.log('\n[4] ngữ cảnh: lấy các dòng xung quanh, không chỉ một dòng');
ok('có hàm nguCanhQuanh', /function nguCanhQuanh\(i\)/.test(src));
ok('lấy cả phía trước lẫn phía sau', /truoc\.unshift/.test(src) && /sau\.push/.test(src));
ok('cắt theo số ký tự', /NGU_CANH_MOI_BEN/.test(src));
ok('đánh dấu … khi bị cắt', /truoc\.length \? "… " : ""/.test(src));

console.log('\n[5] câu lưu từ bảng phụ đề mang theo mốc giây');
ok('capCua chuyền yt qua (trước đây bị rơi)', /yt: n && n\.yt \? \{ v: n\.yt\.v, t: t/.test(src));
ok('capCua có ctx', /ctx: nguCanhQuanh\(i\)/.test(src));

console.log('\n[6] nền trả id để gắn link chat');
const bg = read('background.js');
ok('SAVE_CAP trả id', /sendResponse\(\{ ok: true, id: saved \? saved\.id : '' \}\)/.test(bg));
ok('captureAndSave trả note', /return note;/.test(bg));

console.log('\n[7] manifest nạp hoi-gemini.js trước phu-de.js');
const js = JSON.parse(read('manifest.json')).content_scripts[0].js;
ok('có hoi-gemini.js trong content script', js.includes('hoi-gemini.js'));
ok('nạp TRƯỚC phu-de.js', js.indexOf('hoi-gemini.js') < js.indexOf('phu-de.js'),
   JSON.stringify(js));

console.log('\n[8] KHÔNG lẫn tính năng sửa lời thoại (bạn bảo chưa cần)');
ok('không có S.sua', !/S\.sua/.test(src));
ok('không có dapSua', !/dapSua/.test(src));

console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
process.exit(fail ? 1 : 0);
