/* Neuron Note — lớp dữ liệu dùng chung.
   Dùng self.NN để service worker (importScripts) và trang HTML (<script>) đều nạp được. */
(function (root) {
  'use strict';

  var K_NOTES = 'nn_notes';       // map: id -> note
  var K_SETTINGS = 'nn_settings';
  var K_SYNC = 'nn_sync';

  var DEFAULT_SETTINGS = {
    autoHighlight: true,     // tự tô lại highlight khi mở trang
    flashOnOpen: true,       // nháy sáng khi mở link
    askNote: true,           // hiện ô ghi chú nhanh sau khi lưu
    autoSync: true,          // đẩy lên Drive sau mỗi thay đổi
    defaultTags: []
  };

  var TOMBSTONE_TTL = 90 * 24 * 3600 * 1000; // giữ bia mộ 90 ngày

  /* ---------- tiện ích ---------- */

  function uid() {
    return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function now() { return Date.now(); }

  function squash(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  // Bỏ hash để so khớp trang; giữ nguyên query vì nhiều site phụ thuộc vào nó.
  function normUrl(u) {
    try {
      var x = new URL(u);
      x.hash = '';
      return x.toString().replace(/\/$/, '');
    } catch (e) { return String(u || '').split('#')[0]; }
  }

  function hostOf(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  /* ---------- link text-fragment ---------- */

  function encFrag(s) {
    return encodeURIComponent(squash(s))
      .replace(/-/g, '%2D')
      .replace(/,/g, '%2C')
      .replace(/&/g, '%26');
  }

  function firstWords(s, n) { return squash(s).split(' ').slice(0, n).join(' '); }
  function lastWords(s, n) {
    var w = squash(s).split(' ');
    return w.slice(Math.max(0, w.length - n)).join(' ');
  }

  /* Tạo link dạng:  https://site/page#nn-<id>:~:text=[prefix-,]start[,end][,-suffix]
     - phần "#nn-<id>" để content script của mình nhận diện và nháy sáng
     - phần ":~:text=" là text fragment chuẩn của Chrome, chạy được cả khi không cài extension */
  function buildLink(note) {
    var base = normUrl(note.url);
    var t = squash(note.text);
    if (!t) return base;

    var body;
    if (t.length > 240) {
      body = encFrag(firstWords(t, 8)) + ',' + encFrag(lastWords(t, 8));
    } else {
      body = encFrag(t);
    }

    var d = 'text=';
    var pre = squash(note.prefix), suf = squash(note.suffix);
    if (pre) d += encFrag(lastWords(pre, 4)) + '-,';
    d += body;
    if (suf) d += ',-' + encFrag(firstWords(suf, 4));

    return base + '#nn-' + note.id + ':~:' + d;
  }

  /* ---------- CRUD ---------- */

  function area() { return chrome.storage.local; }

  function getMap() {
    return area().get(K_NOTES).then(function (r) { return r[K_NOTES] || {}; });
  }

  function setMap(map) {
    var o = {}; o[K_NOTES] = map;
    return area().set(o);
  }

  // Danh sách note còn sống, mới nhất lên đầu
  function getAll() {
    return getMap().then(function (map) {
      return Object.keys(map)
        .map(function (k) { return map[k]; })
        .filter(function (n) { return n && !n.deleted; })
        .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    });
  }

  function getByUrl(url) {
    var target = normUrl(url);
    return getAll().then(function (list) {
      return list.filter(function (n) { return normUrl(n.url) === target; });
    });
  }

  function get(id) {
    return getMap().then(function (m) { return m[id] || null; });
  }

  function create(data) {
    var n = {
      id: uid(),
      text: squash(data.text),
      note: data.note || '',
      tags: (data.tags || []).map(squash).filter(Boolean),
      url: normUrl(data.url),
      title: squash(data.title) || normUrl(data.url),
      site: hostOf(data.url),
      prefix: squash(data.prefix),
      suffix: squash(data.suffix),
      createdAt: now(),
      updatedAt: now(),
      deleted: false
    };
    n.link = buildLink(n);
    return getMap().then(function (m) {
      m[n.id] = n;
      return setMap(m).then(function () { return n; });
    });
  }

  function patch(id, fields) {
    return getMap().then(function (m) {
      if (!m[id]) return null;
      Object.keys(fields).forEach(function (k) { m[id][k] = fields[k]; });
      m[id].updatedAt = now();
      if (fields.text != null || fields.url != null) m[id].link = buildLink(m[id]);
      return setMap(m).then(function () { return m[id]; });
    });
  }

  // Xóa mềm → bia mộ, để đồng bộ lan được sang máy khác
  function remove(id) {
    return getMap().then(function (m) {
      if (!m[id]) return null;
      m[id] = { id: id, deleted: true, updatedAt: now() };
      return setMap(m).then(function () { return true; });
    });
  }

  function purgeTombstones() {
    var cutoff = now() - TOMBSTONE_TTL;
    return getMap().then(function (m) {
      var changed = false;
      Object.keys(m).forEach(function (k) {
        if (m[k] && m[k].deleted && (m[k].updatedAt || 0) < cutoff) { delete m[k]; changed = true; }
      });
      return changed ? setMap(m) : null;
    });
  }

  function allTags() {
    return getAll().then(function (list) {
      var c = {};
      list.forEach(function (n) { (n.tags || []).forEach(function (t) { c[t] = (c[t] || 0) + 1; }); });
      return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); })
        .map(function (t) { return { tag: t, count: c[t] }; });
    });
  }

  /* ---------- cài đặt & đồng bộ ---------- */

  function getSettings() {
    return area().get(K_SETTINGS).then(function (r) {
      return Object.assign({}, DEFAULT_SETTINGS, r[K_SETTINGS] || {});
    });
  }

  function setSettings(patchObj) {
    return getSettings().then(function (s) {
      var next = Object.assign({}, s, patchObj);
      var o = {}; o[K_SETTINGS] = next;
      return area().set(o).then(function () { return next; });
    });
  }

  function getSync() {
    return area().get(K_SYNC).then(function (r) {
      return Object.assign({ url: '', lastSync: 0, lastError: '' }, r[K_SYNC] || {});
    });
  }

  function setSync(patchObj) {
    return getSync().then(function (s) {
      var next = Object.assign({}, s, patchObj);
      var o = {}; o[K_SYNC] = next;
      return area().set(o).then(function () { return next; });
    });
  }

  /* Gộp hai map: bản nào updatedAt mới hơn thì thắng (bia mộ cũng tính như một bản ghi). */
  function mergeMaps(local, remote) {
    var out = {};
    var ids = {};
    Object.keys(local || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(remote || {}).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (id) {
      var a = local[id], b = remote[id];
      if (!a) { out[id] = b; return; }
      if (!b) { out[id] = a; return; }
      out[id] = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
    });
    return out;
  }

  /* Đồng bộ hai chiều với Apps Script Web App.
     Dùng Content-Type text/plain để tránh preflight CORS. */
  function sync() {
    var localMap, cfg;
    return getSync().then(function (s) {
      cfg = s;
      if (!cfg.url) throw new Error('Chưa đặt địa chỉ Apps Script');
      return getMap();
    }).then(function (m) {
      localMap = m;
      return fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'pull' })
      });
    }).then(function (res) {
      return res.text();
    }).then(function (txt) {
      var remote = {};
      try {
        var j = JSON.parse(txt);
        remote = (j && j.notes) || {};
      } catch (e) {
        throw new Error('Máy chủ trả về không phải JSON — kiểm tra quyền truy cập của Apps Script');
      }
      var merged = mergeMaps(localMap, remote);
      return setMap(merged).then(function () {
        return fetch(cfg.url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'push', notes: merged })
        });
      }).then(function () {
        return setSync({ lastSync: now(), lastError: '' });
      }).then(function () {
        return { ok: true, count: Object.keys(merged).filter(function (k) { return !merged[k].deleted; }).length };
      });
    }).catch(function (err) {
      return setSync({ lastError: String(err.message || err) }).then(function () {
        return { ok: false, error: String(err.message || err) };
      });
    });
  }

  root.NN = {
    K_NOTES: K_NOTES,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    uid: uid, squash: squash, normUrl: normUrl, hostOf: hostOf,
    buildLink: buildLink,
    getMap: getMap, setMap: setMap, getAll: getAll, getByUrl: getByUrl, get: get,
    create: create, patch: patch, remove: remove, purgeTombstones: purgeTombstones,
    allTags: allTags,
    getSettings: getSettings, setSettings: setSettings,
    getSync: getSync, setSync: setSync,
    mergeMaps: mergeMaps, sync: sync
  };
})(typeof self !== 'undefined' ? self : this);
