/**
 * Kiểm tra tầng lưu trữ không đánh mất bản ghi khi nhiều lượt ghi chồng nhau.
 *
 * Lỗi đã gặp thật: bấm "Got it" liên tục trong màn Học thì số mục đến hạn tụt
 * xuống, vài giây sau lại vọt lên như cũ. Nguyên do là mỗi lượt ghi đều là
 * "đọc cả map → sửa một mục → ghi cả map"; hai lượt chạy chồng nhau thì lượt
 * sau đọc trước khi lượt trước kịp ghi, nên nó ghi đè lại bản CŨ của mục kia.
 *
 * Test này nạp shared.js + progress.js thật, cắm vào một tầng lưu trữ giả CÓ
 * ĐỘ TRỄ (đúng như chrome.storage và Capacitor Preferences ngoài đời), rồi bắn
 * liên tiếp mấy lượt chấm bài — không chờ lượt trước xong, y hệt app thật.
 *
 * Chạy: node test/store-race.js
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const EXT = path.join(__dirname, '..');
const AND = path.join(__dirname, '..', '..', 'android-app', 'www');

let fail = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}

/** Độ trễ mỗi lượt đọc/ghi, tính bằng ms. Đủ để hai lượt ghi kịp chồng nhau. */
const TRE = 6;

/* ------------------------------------------------------------------ */
/* Hai tầng lưu trữ giả                                                */
/* ------------------------------------------------------------------ */

/** Bản extension: chrome.storage.local, mỗi khoá một chỗ riêng. */
function dungExtension() {
  const disk = { notes: {}, settings: {}, progress: null };
  const root = {
    chrome: {
      storage: {
        local: {
          get: (def, cb) => setTimeout(() => {
            const out = {};
            Object.keys(def).forEach(k => { out[k] = disk[k] === undefined ? def[k] : disk[k]; });
            cb(JSON.parse(JSON.stringify(out)));
          }, TRE),
          set: (obj, cb) => setTimeout(() => {
            Object.assign(disk, JSON.parse(JSON.stringify(obj)));
            if (cb) cb();
          }, TRE)
        }
      }
    }
  };
  return nap(root, EXT);
}

/** Bản Android: tất cả nằm chung MỘT khoá 'nn'. */
function dungAndroid() {
  let blob = JSON.stringify({ notes: {}, settings: {}, progress: null });
  const root = {
    Capacitor: {
      Plugins: {
        Preferences: {
          get: () => new Promise(r => setTimeout(() => r({ value: blob }), TRE)),
          set: ({ value }) => new Promise(r => setTimeout(() => { blob = value; r(); }, TRE))
        }
      }
    },
    localStorage: { getItem: () => blob, setItem: (k, v) => { blob = v; } }
  };
  return nap(root, AND);
}

function nap(root, dir) {
  root.window = root;
  root.self = root;
  root.console = console;
  root.setTimeout = setTimeout;
  root.Promise = Promise;
  root.Date = Date;
  const ctx = vm.createContext(root);
  ['shared.js', 'progress.js'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  });
  return root.NN;
}

/* ------------------------------------------------------------------ */

function taoNotes(n) {
  const out = {};
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    out['n' + i] = {
      id: 'n' + i, text: 'passage ' + i, tags: [], note: '', url: 'https://e.org/' + i,
      createdAt: now, updatedAt: now,
      srs: { box: 0, due: now - 1000, reps: 0, lapses: 0, last: 0, learn: true, known: false }
    };
  }
  return out;
}

const doi = ms => new Promise(r => setTimeout(r, ms));

/** Chấm bài y như màn Học: gọi putNote rồi sang thẻ kế NGAY, không chờ ghi xong. */
async function chamLienTuc(NN, ids, ghiTienDo) {
  const notes = await NN.getNotes();
  for (const id of ids) {
    const next = Object.assign({}, notes[id]);
    NN.ensureSrs(next);
    next.srs = Object.assign({}, next.srs);
    NN.grade(next, true);
    NN.putNote(next);                       // cố ý không await
    if (ghiTienDo) NN.recordReview(true);   // cũng không await
    await doi(3);                           // nhịp bấm nhanh của người dùng
  }
  await doi(400);                           // chờ mọi lượt ghi lắng xuống
}

async function kichBan(ten, dung, ghiTienDo) {
  console.log('\n[' + ten + ']');
  const NN = dung();
  const SO = 8;
  await NN.setNotes(taoNotes(SO));

  await chamLienTuc(NN, Array.from({ length: SO }, (_, i) => 'n' + i), ghiTienDo);

  const cuoi = await NN.getNotes();
  const denHan = Object.values(cuoi).filter(n => NN.isDue(n, Date.now())).length;
  ok('chấm ' + SO + ' thẻ liên tục, không thẻ nào bật lại thành đến hạn',
     denHan === 0, 'còn ' + denHan + ' thẻ đến hạn');

  if (ghiTienDo) {
    const prog = NN.normalizeProgress(await NN.getProgress());
    const daGhi = (prog.log[NN.pDay()] || {}).r || 0;
    ok('nhật ký tiến độ ghi đủ ' + SO + ' lượt', daGhi === SO, 'ghi được ' + daGhi);
  }
}

/**
 * Đồng bộ đang chạy dở mà người dùng chấm bài: bản dịch về từ máy chủ KHÔNG
 * được phép ghi đè lượt chấm vừa xong.
 */
async function kichBanDongBo(ten, dung) {
  console.log('\n[' + ten + ']');
  const NN = dung();
  await NN.setNotes(taoNotes(3));

  // Ảnh chụp gửi lên máy chủ, lấy TRƯỚC khi chấm — đúng như lúc đồng bộ thật.
  const guiDi = JSON.parse(JSON.stringify(await NN.getNotes()));

  const notes = await NN.getNotes();
  const cham = Object.assign({}, notes.n0);
  NN.ensureSrs(cham);
  cham.srs = Object.assign({}, cham.srs);
  NN.grade(cham, true);
  NN.putNote(cham);                 // chấm bài, không chờ

  // Máy chủ trả về đúng ảnh chụp cũ (chưa có lượt chấm này).
  const res = await NN.applyRemote(guiDi);
  await doi(200);

  const cuoi = await NN.getNotes();
  ok('lượt chấm trong lúc đồng bộ không bị bản cũ từ máy chủ ghi đè',
     (cuoi.n0.srs.box || 0) > 0, 'box = ' + cuoi.n0.srs.box);
  ok('applyRemote trả về kết quả trộn', res && typeof res.notes === 'object');
}

/** Đính kèm chỉ có ở máy này: bản từ máy chủ thắng cũng không được làm mất. */
async function kichBanDinhKem() {
  console.log('\n[Đính kèm không bị đồng bộ làm mất]');
  const NN = dungExtension();
  const now = Date.now();
  await NN.setNotes({
    a: { id: 'a', text: 'có đính kèm', updatedAt: now, createdAt: now, files: [{ id: 'f1', name: 'x.png' }] }
  });
  // Máy chủ có bản MỚI HƠN của cùng note, và dĩ nhiên không kèm files.
  await NN.applyRemote({ a: { id: 'a', text: 'bản mới từ máy chủ', updatedAt: now + 5000, createdAt: now } });
  const cuoi = await NN.getNotes();
  ok('bản mới từ máy chủ được nhận', cuoi.a.text === 'bản mới từ máy chủ');
  ok('đính kèm của máy này vẫn còn', cuoi.a.files && cuoi.a.files.length === 1);
}

(async () => {
  await kichBan('Extension — chấm bài liên tục', dungExtension, false);
  await kichBan('Extension — chấm bài + ghi tiến độ', dungExtension, true);
  await kichBan('Android — chấm bài liên tục', dungAndroid, false);
  await kichBan('Android — chấm bài + ghi tiến độ', dungAndroid, true);
  await kichBanDongBo('Extension — chấm bài giữa lúc đang đồng bộ', dungExtension);
  await kichBanDongBo('Android — chấm bài giữa lúc đang đồng bộ', dungAndroid);
  await kichBanDinhKem();

  console.log('\n' + (fail ? `✗ ${fail} test HỎNG` : '✓ Tất cả test đều qua'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
