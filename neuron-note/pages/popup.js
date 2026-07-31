(function () {
  'use strict';
  var all = [];
  var listEl = document.getElementById('list');
  var qEl = document.getElementById('q');
  var countEl = document.getElementById('count');

  function toast(t) {
    var el = document.getElementById('toast');
    el.textContent = t;
    el.classList.add('on');
    setTimeout(function () { el.classList.remove('on'); }, 1900);
  }

  function matches(n, q) {
    if (!q) return true;
    var hay = (n.text + ' ' + (n.note || '') + ' ' + (n.title || '') + ' ' + (n.tags || []).join(' ')).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function render() {
    var q = qEl.value.trim();
    var rows = all.filter(function (n) { return matches(n, q); }).slice(0, 60);
    listEl.innerHTML = '';

    if (!rows.length) {
      var e = document.createElement('div');
      e.className = 'empty';
      e.innerHTML = all.length
        ? '<b>Không có kết quả</b>Thử từ khóa ngắn hơn.'
        : '<b>Chưa có gì ở đây</b>Bôi đen một đoạn trên trang bất kỳ, bấm chuột phải rồi chọn “Lưu vào Neuron Note”.';
      listEl.appendChild(e);
      return;
    }

    rows.forEach(function (n) {
      var d = document.createElement('div');
      d.className = 'row';
      d.tabIndex = 0;

      var ex = document.createElement('div');
      ex.className = 'ex';
      ex.textContent = n.text;
      d.appendChild(ex);

      var sub = document.createElement('div');
      sub.className = 'sub';
      var site = document.createElement('span');
      site.className = 'site';
      site.textContent = n.site || '—';
      sub.appendChild(site);
      var tw = document.createElement('span');
      tw.className = 'tags';
      (n.tags || []).slice(0, 2).forEach(function (t) {
        var s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        tw.appendChild(s);
      });
      sub.appendChild(tw);
      d.appendChild(sub);

      function open() {
        chrome.runtime.sendMessage({ type: 'NN_OPEN_LINK', url: n.link || n.url }, function () { window.close(); });
      }
      d.onclick = open;
      d.onkeydown = function (e) { if (e.key === 'Enter') open(); };

      listEl.appendChild(d);
    });
  }

  qEl.addEventListener('input', render);

  document.getElementById('openAll').onclick = function () {
    chrome.runtime.sendMessage({ type: 'NN_OPEN_NOTES' }, function () { window.close(); });
  };

  document.getElementById('sync').onclick = function () {
    var b = this;
    b.disabled = true;
    b.textContent = 'Đang đồng bộ…';
    chrome.runtime.sendMessage({ type: 'NN_SYNC_NOW' }, function (r) {
      b.disabled = false;
      b.textContent = 'Đồng bộ';
      if (!r) { toast('Không nhận được phản hồi'); return; }
      if (r.ok) { toast('Đã đồng bộ ' + r.count + ' ghi chú'); load(); }
      else toast(r.error || 'Đồng bộ thất bại');
    });
  };

  function load() {
    NN.getAll().then(function (list) {
      all = list;
      countEl.textContent = list.length + ' ghi chú';
      render();
    });
  }

  load();
})();
