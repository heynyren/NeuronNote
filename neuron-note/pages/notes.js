(function () {
  'use strict';

  var all = [], activeTags = [], site = '', editing = null;
  var $ = function (id) { return document.getElementById(id); };

  function toast(t) {
    var el = $('toast');
    el.textContent = t;
    el.classList.add('on');
    setTimeout(function () { el.classList.remove('on'); }, 2000);
  }

  function fmtDate(ms) {
    if (!ms) return '';
    var d = new Date(ms);
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  function stamp() {
    var d = new Date();
    var p = function (x) { return x < 10 ? '0' + x : '' + x; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  function download(name, mime, text) {
    var b = new Blob([text], { type: mime + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------- lọc ---------- */

  function matches(n) {
    var q = $('q').value.trim().toLowerCase();
    if (q) {
      var hay = (n.text + ' ' + (n.note || '') + ' ' + (n.title || '') + ' ' + (n.tags || []).join(' ')).toLowerCase();
      if (!q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; })) return false;
    }
    if (site && n.site !== site) return false;
    if (activeTags.length && !activeTags.every(function (t) { return (n.tags || []).indexOf(t) >= 0; })) return false;
    return true;
  }

  function sorted(list) {
    var s = $('sort').value;
    var c = list.slice();
    if (s === 'old') c.sort(function (a, b) { return a.createdAt - b.createdAt; });
    else if (s === 'site') c.sort(function (a, b) { return (a.site || '').localeCompare(b.site || '') || b.createdAt - a.createdAt; });
    else c.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return c;
  }

  /* ---------- vẽ ---------- */

  function noteCard(n) {
    var d = document.createElement('article');
    d.className = 'note';

    var ex = document.createElement('div');
    ex.className = 'excerpt';
    var sw = document.createElement('span');
    sw.className = 'swipe';
    sw.textContent = n.text;
    ex.appendChild(sw);
    d.appendChild(ex);

    if (n.note) {
      var an = document.createElement('div');
      an.className = 'annot';
      an.textContent = n.note;
      d.appendChild(an);
    }

    if ((n.tags || []).length) {
      var tw = document.createElement('div');
      tw.className = 'tags';
      n.tags.forEach(function (t) {
        var s = document.createElement('button');
        s.className = 'tag';
        s.textContent = t;
        s.onclick = function () { toggleTag(t); };
        tw.appendChild(s);
      });
      d.appendChild(tw);
    }

    var src = document.createElement('div');
    src.className = 'src';
    var a = document.createElement('a');
    a.className = 'title';
    a.href = n.link || n.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = n.title || n.url;
    a.title = n.url;
    src.appendChild(a);
    var m = document.createElement('span');
    m.className = 'meta';
    m.textContent = (n.site || '') + ' · ' + fmtDate(n.createdAt);
    src.appendChild(m);
    d.appendChild(src);

    var acts = document.createElement('div');
    acts.className = 'acts';

    function btn(label, cls, fn) {
      var b = document.createElement('button');
      b.className = 'quiet' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.onclick = fn;
      acts.appendChild(b);
      return b;
    }

    btn('Mở lại chỗ này', '', function () { window.open(n.link || n.url, '_blank'); });
    btn('Chép link', '', function () {
      navigator.clipboard.writeText(n.link || n.url).then(function () { toast('Đã chép link'); });
    });
    btn('Sửa', '', function () { editing = editing === n.id ? null : n.id; render(); });
    btn('Xóa', 'danger', function () {
      if (!confirm('Xóa ghi chú này? Máy khác cũng sẽ mất sau lần đồng bộ tới.')) return;
      chrome.runtime.sendMessage({ type: 'NN_DELETE', id: n.id }, function () {
        toast('Đã xóa');
        load();
      });
    });
    d.appendChild(acts);

    if (editing === n.id) d.appendChild(editForm(n));
    return d;
  }

  function editForm(n) {
    var w = document.createElement('div');
    w.className = 'edit';
    w.innerHTML = [
      '<label>Nhãn — cách nhau bằng dấu phẩy</label>',
      '<input type="text" class="e-tags">',
      '<label>Ghi chú</label>',
      '<textarea class="e-note" rows="3"></textarea>',
      '<div class="row"><button class="primary e-save">Lưu thay đổi</button><button class="e-cancel">Hủy</button></div>'
    ].join('');
    w.querySelector('.e-tags').value = (n.tags || []).join(', ');
    w.querySelector('.e-note').value = n.note || '';
    w.querySelector('.e-cancel').onclick = function () { editing = null; render(); };
    w.querySelector('.e-save').onclick = function () {
      var tags = w.querySelector('.e-tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var note = w.querySelector('.e-note').value;
      chrome.runtime.sendMessage({ type: 'NN_PATCH', id: n.id, fields: { tags: tags, note: note } }, function () {
        editing = null;
        toast('Đã lưu thay đổi');
        load();
      });
    };
    return w;
  }

  function render() {
    var rows = sorted(all.filter(matches));
    var list = $('list');
    list.innerHTML = '';

    $('title').textContent = activeTags.length ? activeTags.join(' + ')
      : site ? site
        : 'Tất cả ghi chú';

    if (!rows.length) {
      var e = document.createElement('div');
      e.className = 'empty';
      e.innerHTML = all.length
        ? '<b>Không khớp bộ lọc nào</b>Bỏ bớt nhãn hoặc xóa từ khóa tìm kiếm.'
        : '<b>Chưa có ghi chú nào</b>Bôi đen một đoạn trên trang bất kỳ, bấm chuột phải rồi chọn “Lưu vào Neuron Note”. Phím tắt: Alt+Shift+S.';
      list.appendChild(e);
      return;
    }
    rows.forEach(function (n) { list.appendChild(noteCard(n)); });
  }

  function toggleTag(t) {
    var i = activeTags.indexOf(t);
    if (i >= 0) activeTags.splice(i, 1); else activeTags.push(t);
    renderTags();
    render();
  }

  function renderTags() {
    var box = $('tags');
    box.innerHTML = '';
    var count = {};
    all.forEach(function (n) { (n.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
    var keys = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || a.localeCompare(b); });
    if (!keys.length) {
      var s = document.createElement('span');
      s.className = 'meta';
      s.textContent = 'chưa có nhãn nào';
      box.appendChild(s);
      return;
    }
    keys.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'tag' + (activeTags.indexOf(t) >= 0 ? ' on' : '');
      b.innerHTML = '';
      b.appendChild(document.createTextNode(t));
      var c = document.createElement('span');
      c.className = 'c';
      c.textContent = count[t];
      b.appendChild(c);
      b.onclick = function () { toggleTag(t); };
      box.appendChild(b);
    });
  }

  function renderSites() {
    var sel = $('site');
    var cur = sel.value;
    var count = {};
    all.forEach(function (n) { if (n.site) count[n.site] = (count[n.site] || 0) + 1; });
    sel.innerHTML = '<option value="">Tất cả trang</option>';
    Object.keys(count).sort().forEach(function (s) {
      var o = document.createElement('option');
      o.value = s;
      o.textContent = s + ' (' + count[s] + ')';
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  /* ---------- xuất / nhập ---------- */

  function exportJson() {
    NN.getMap().then(function (m) {
      download('neuronnote-' + stamp() + '.json', 'application/json',
        JSON.stringify({ app: 'neuron-note', version: 1, exportedAt: Date.now(), notes: m }, null, 2));
    });
  }

  function exportMd() {
    var rows = sorted(all.filter(matches));
    var out = ['# Neuron Note — ' + stamp(), ''];
    rows.forEach(function (n) {
      out.push('> ' + n.text.replace(/\n/g, ' '));
      if (n.note) out.push('', n.note);
      if ((n.tags || []).length) out.push('', (n.tags.map(function (t) { return '`' + t + '`'; })).join(' '));
      out.push('', '[' + (n.title || n.site) + '](' + (n.link || n.url) + ') · ' + fmtDate(n.createdAt), '', '---', '');
    });
    download('neuronnote-' + stamp() + '.md', 'text/markdown', out.join('\n'));
  }

  function exportCsv() {
    var rows = sorted(all.filter(matches));
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
    var out = [['text', 'note', 'tags', 'title', 'site', 'link', 'createdAt'].map(q).join(',')];
    rows.forEach(function (n) {
      out.push([n.text, n.note || '', (n.tags || []).join('; '), n.title || '', n.site || '',
      n.link || n.url, new Date(n.createdAt).toISOString()].map(q).join(','));
    });
    download('neuronnote-' + stamp() + '.csv', 'text/csv', '\ufeff' + out.join('\n'));
  }

  function importJson(file) {
    var r = new FileReader();
    r.onload = function () {
      var data;
      try { data = JSON.parse(r.result); } catch (e) { toast('Tệp không đọc được — cần đúng tệp JSON đã xuất ra'); return; }
      var incoming = data && (data.notes || data);
      if (!incoming || typeof incoming !== 'object') { toast('Tệp không có dữ liệu ghi chú'); return; }
      NN.getMap().then(function (m) {
        var merged = NN.mergeMaps(m, incoming);
        return NN.setMap(merged);
      }).then(function () {
        toast('Đã nhập xong');
        load();
      });
    };
    r.readAsText(file);
  }

  /* ---------- cài đặt & đồng bộ ---------- */

  function showSync() {
    NN.getSync().then(function (s) {
      $('surl').value = s.url || '';
      var el = $('syncInfo');
      if (s.lastError) {
        el.className = 'synced err';
        el.textContent = s.lastError;
      } else if (s.lastSync) {
        el.className = 'synced';
        el.textContent = 'lần cuối ' + new Date(s.lastSync).toLocaleString('vi-VN');
      } else {
        el.className = 'synced';
        el.textContent = 'chưa đồng bộ lần nào';
      }
    });
  }

  function bindSettings() {
    NN.getSettings().then(function (s) {
      Object.keys(NN.DEFAULT_SETTINGS).forEach(function (k) {
        var el = $('opt-' + k);
        if (!el) return;
        el.checked = !!s[k];
        el.onchange = function () {
          var p = {}; p[k] = el.checked;
          NN.setSettings(p).then(function () { toast('Đã cập nhật'); });
        };
      });
    });
  }

  /* ---------- nạp ---------- */

  function load() {
    NN.getAll().then(function (list) {
      all = list;
      $('stat').textContent = list.length + ' ghi chú';
      renderTags();
      renderSites();
      render();
    });
  }

  $('q').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('site').addEventListener('change', function () { site = this.value; render(); });

  $('saveUrl').onclick = function () {
    var u = $('surl').value.trim();
    NN.setSync({ url: u, lastError: '' }).then(function () {
      toast(u ? 'Đã lưu địa chỉ' : 'Đã tắt đồng bộ');
      showSync();
    });
  };

  $('syncNow').onclick = function () {
    var b = this;
    b.disabled = true;
    b.textContent = 'Đang đồng bộ…';
    chrome.runtime.sendMessage({ type: 'NN_SYNC_NOW' }, function (r) {
      b.disabled = false;
      b.textContent = 'Đồng bộ ngay';
      if (r && r.ok) toast('Đã đồng bộ ' + r.count + ' ghi chú');
      else toast((r && r.error) || 'Đồng bộ thất bại');
      showSync();
      load();
    });
  };

  $('exJson').onclick = exportJson;
  $('exMd').onclick = exportMd;
  $('exCsv').onclick = exportCsv;
  $('imp').onclick = function () { $('file').click(); };
  $('file').onchange = function () { if (this.files[0]) importJson(this.files[0]); this.value = ''; };

  bindSettings();
  showSync();
  load();
})();
