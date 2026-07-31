/* Neuron Note — shared helpers (dùng chung cho background + các trang) */
(function (root) {
  'use strict';

  const NN = {};

  /* ---------- hằng số ---------- */
  NN.DEFAULT_SETTINGS = {
    syncUrl: '',
    syncKey: '',
    autoSync: true,
    autoHighlight: true,
    markColor: 'amber',
    labels: [],          // nhãn định sẵn: [{ name, color }]
    activeLabel: ''       // nhãn mặc định cho phím tắt / nút lưu nhanh
  };
  NN.COLORS = ['amber', 'mint', 'sky', 'rose', 'lilac'];
  NN.COLOR_LABEL = {
    amber: 'Vàng', mint: 'Bạc hà', sky: 'Xanh trời', rose: 'Hồng', lilac: 'Tím'
  };
  NN.TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000; // 90 ngày

  /* ---------- lặp lại ngắt quãng (SRS) ---------- */
  // bậc 0..7; ngày chờ theo từng bậc. Bậc 0 = mới, chưa ôn lần nào.
  NN.SRS_INTERVALS = [1, 1, 3, 7, 14, 30, 60, 120]; // ngày
  NN.DAY = 24 * 60 * 60 * 1000;

  /** Trạng thái học mặc định gắn cho note khi cần. */
  NN.freshSrs = function (now) {
    now = now || Date.now();
    return { box: 0, due: now, reps: 0, lapses: 0, last: 0, learn: true, known: false };
  };

  /** Bảo đảm note có khối .srs hợp lệ (vá cho note cũ). Trả về chính note. */
  NN.ensureSrs = function (note) {
    if (!note.srs || typeof note.srs !== 'object') note.srs = NN.freshSrs(note.createdAt || Date.now());
    const s = note.srs;
    if (typeof s.box !== 'number') s.box = 0;
    if (typeof s.due !== 'number') s.due = note.createdAt || Date.now();
    if (typeof s.reps !== 'number') s.reps = 0;
    if (typeof s.lapses !== 'number') s.lapses = 0;
    if (typeof s.last !== 'number') s.last = 0;
    if (typeof s.learn !== 'boolean') s.learn = true;
    if (typeof s.known !== 'boolean') s.known = false;
    return note;
  };

  /** Note này có nằm trong lịch học không (đang bật học, chưa đánh dấu đã thuộc, chưa xoá). */
  NN.inStudy = function (note) {
    if (!note || note.deleted || !note.text) return false;
    const s = note.srs || {};
    return s.learn !== false && s.known !== true;
  };

  /** Đến hạn ôn chưa. */
  NN.isDue = function (note, now) {
    if (!NN.inStudy(note)) return false;
    NN.ensureSrs(note);
    return (note.srs.due || 0) <= (now || Date.now());
  };

  /** Chấm một lần ôn. ok: true = Nhớ (lên bậc), false = Chưa (về bậc 1). */
  NN.grade = function (note, ok, now) {
    now = now || Date.now();
    NN.ensureSrs(note);
    const s = note.srs;
    s.reps += 1;
    s.last = now;
    if (ok) {
      s.box = Math.min(s.box + 1, NN.SRS_INTERVALS.length - 1);
    } else {
      s.lapses += 1;
      s.box = 1; // về khoảng ngắn nhất, ôn lại sau 1 ngày
    }
    const days = NN.SRS_INTERVALS[s.box] || 1;
    s.due = now + days * NN.DAY;
    note.updatedAt = now;
    return note;
  };

  /** Đếm số note đến hạn / tổng đang học. */
  NN.studyStats = function (notes, now) {
    now = now || Date.now();
    let due = 0, studying = 0, known = 0, hidden = 0;
    Object.values(notes || {}).forEach(n => {
      if (!n || n.deleted || !n.text) return;
      const s = n.srs || {};
      if (s.known) { known++; return; }
      if (s.learn === false) { hidden++; return; }
      studying++;
      if ((s.due || 0) <= now) due++;
    });
    return { due, studying, known, hidden };
  };

  /* ---------- tiện ích ---------- */
  NN.uid = function () {
    return 'nn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  };

  NN.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  NN.squash = function (s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  };

  const TRACKERS = /^(utm_|fbclid$|gclid$|mc_eid$|mc_cid$|igshid$|ref_src$|s_cid$|yclid$|_hs)/i;

  /** Bỏ hash + tham số theo dõi để cùng một trang luôn ra một khoá. */
  NN.normalizeUrl = function (raw) {
    try {
      const u = new URL(raw);
      u.hash = '';
      const keep = [];
      u.searchParams.forEach((v, k) => { if (!TRACKERS.test(k)) keep.push([k, v]); });
      u.search = '';
      keep.forEach(([k, v]) => u.searchParams.append(k, v));
      let s = u.toString();
      if (s.endsWith('?')) s = s.slice(0, -1);
      return s;
    } catch (e) {
      return String(raw || '').split('#')[0];
    }
  };

  NN.hostOf = function (url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  };

  /** Màu của một nhãn định sẵn; rỗng nếu không có. */
  NN.labelColor = function (settings, name) {
    if (!name) return '';
    const l = (settings && settings.labels || []).find(x => x.name === name);
    return l ? l.color : '';
  };

  /** Màu gợi ý cho nhãn mới, xoay vòng theo bảng màu. */
  NN.nextLabelColor = function (settings) {
    const n = (settings && settings.labels || []).length;
    return NN.COLORS[n % NN.COLORS.length];
  };

  /** Thêm các tên nhãn chưa có vào settings.labels (không đụng nhãn cũ). Trả về mảng labels mới. */
  NN.withNewLabels = function (settings, names) {
    const labels = (settings.labels || []).slice();
    (names || []).forEach(name => {
      name = NN.squash(name);
      if (name && !labels.some(l => l.name === name)) {
        labels.push({ name, color: NN.COLORS[labels.length % NN.COLORS.length] });
      }
    });
    return labels;
  };

  /* ---------- Text fragment (#:~:text=) ---------- */
  function frag(s) {
    return encodeURIComponent(NN.squash(s)).replace(/-/g, '%2D');
  }
  function words(s, n, fromEnd) {
    const w = NN.squash(s).split(' ').filter(Boolean);
    if (!w.length) return '';
    return (fromEnd ? w.slice(-n) : w.slice(0, n)).join(' ');
  }

  /**
   * Dựng link quay lại: <url>#nn=<id>:~:text=[prefix-,]start[,end][,-suffix]
   * Trình duyệt tự cuộn tới đoạn đó; phần #nn=<id> để extension biết note nào cần nháy.
   */
  NN.buildFragmentUrl = function (note) {
    const base = NN.normalizeUrl(note.url);
    const text = NN.squash(note.text);
    if (!text) return base;

    const w = text.split(' ');
    let core;
    if (w.length > 12) {
      core = frag(w.slice(0, 6).join(' ')) + ',' + frag(w.slice(-6).join(' '));
    } else {
      core = frag(text);
    }
    const pfx = words(note.prefix || '', 4, true);
    const sfx = words(note.suffix || '', 4, false);

    let dir = 'text=';
    if (pfx) dir += frag(pfx) + '-,';
    dir += core;
    if (sfx) dir += ',-' + frag(sfx);

    return base + '#nn=' + note.id + ':~:' + dir;
  };

  /* ---------- kho dữ liệu ---------- */
  NN.getAll = function () {
    return new Promise(resolve => {
      chrome.storage.local.get({ notes: {}, settings: {} }, res => {
        resolve({
          notes: res.notes || {},
          settings: Object.assign({}, NN.DEFAULT_SETTINGS, res.settings || {})
        });
      });
    });
  };

  NN.getNotes = function () { return NN.getAll().then(r => r.notes); };
  NN.getSettings = function () { return NN.getAll().then(r => r.settings); };

  NN.setNotes = function (notes) {
    return new Promise(resolve => chrome.storage.local.set({ notes }, resolve));
  };

  NN.saveSettings = function (patch) {
    return NN.getSettings().then(s => {
      const next = Object.assign({}, s, patch);
      return new Promise(resolve => chrome.storage.local.set({ settings: next }, () => resolve(next)));
    });
  };

  /** Ghi/ghi đè một note và đóng dấu thời gian. */
  NN.putNote = function (note) {
    return NN.getNotes().then(notes => {
      note.updatedAt = Date.now();
      notes[note.id] = note;
      return NN.setNotes(notes).then(() => note);
    });
  };

  NN.removeNote = function (id) {
    return NN.getNotes().then(notes => {
      const cur = notes[id];
      notes[id] = {
        id,
        deleted: true,
        updatedAt: Date.now(),
        url: cur ? cur.url : '',
        createdAt: cur ? cur.createdAt : Date.now()
      };
      return NN.setNotes(notes);
    });
  };

  /** Danh sách note còn sống, mới nhất trước. */
  NN.live = function (notes) {
    return Object.values(notes || {})
      .filter(n => n && !n.deleted && n.text)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  };

  /* ---------- trộn khi đồng bộ: bản mới hơn thắng ---------- */
  NN.merge = function (local, remote) {
    const out = {};
    const ids = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
    let added = 0, updated = 0;
    ids.forEach(id => {
      const a = (local || {})[id];
      const b = (remote || {})[id];
      if (!a) { out[id] = b; added++; return; }
      if (!b) { out[id] = a; return; }
      if ((b.updatedAt || 0) > (a.updatedAt || 0)) { out[id] = b; updated++; }
      else out[id] = a;
    });
    // dọn bia mộ quá hạn
    const now = Date.now();
    Object.keys(out).forEach(id => {
      const n = out[id];
      if (n && n.deleted && now - (n.updatedAt || 0) > NN.TOMBSTONE_TTL) delete out[id];
    });
    return { notes: out, added, updated };
  };

  root.NN = NN;
  if (typeof module !== 'undefined' && module.exports) module.exports = NN;
})(typeof self !== 'undefined' ? self : this);
