/* Neuron Note — popup */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = NN.escapeHtml;
  let tab = null;
  let activeLabel = '';

  function fmt(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 60) return m + 'p';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'g';
    return Math.floor(h / 24) + 'ng';
  }

  function renderLabels(labels) {
    const pick = $('#labelsPick');
    if (!labels.length) {
      pick.innerHTML = '<span class="none-hint">Chưa có nhãn — tạo trong Thư viện để lưu nhanh theo nhãn.</span>';
      updateCta();
      return;
    }
    pick.innerHTML =
      `<button class="lp" data-name="" aria-pressed="${activeLabel === ''}">Không nhãn</button>` +
      labels.map(l => `<button class="lp" data-name="${esc(l.name)}" aria-pressed="${activeLabel === l.name}">
        <span class="d ${esc(l.color || 'amber')}"></span>${esc(l.name)}</button>`).join('');
    updateCta();
  }
  function updateCta() {
    $('#saveBtn').textContent = activeLabel
      ? 'Lưu vào #' + activeLabel
      : 'Lưu đoạn đang bôi đen';
  }

  $('#labelsPick').addEventListener('click', e => {
    const b = e.target.closest('.lp');
    if (!b) return;
    activeLabel = b.dataset.name || '';
    $('#labelsPick').querySelectorAll('.lp').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    updateCta();
    NN.saveSettings({ activeLabel });   // nhớ lựa chọn cho lần sau + phím tắt
  });

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    tab = tabs[0];
    NN.getAll().then(({ notes, settings }) => {
      activeLabel = settings.activeLabel || '';
      renderLabels(settings.labels || []);

      const all = NN.live(notes);
      const st = NN.studyStats(notes);
      if (st.due > 0) {
        $('#studyBtn').hidden = false;
        $('#dueN').textContent = st.due;
      }
      const key = tab && tab.url ? NN.normalizeUrl(tab.url) : '';
      const here = all.filter(n => NN.normalizeUrl(n.url) === key);
      const show = here.length ? here : all.slice(0, 6);

      $('#head').textContent = here.length ? 'Trên trang này · ' + here.length
        : all.length ? 'Mới lưu gần đây' : 'Chưa có đoạn nào';
      $('#none').hidden = show.length > 0;
      if (!all.length) {
        $('#none').textContent = 'Chưa lưu đoạn nào. Bôi đen văn bản → chuột phải → Save to Neuron Note, chọn nhãn.';
      }
      $('#list').innerHTML = show.map(n => `
        <li class="item" data-id="${esc(n.id)}" data-url="${esc(n.fragUrl || n.url)}">
          <p class="q">${esc(n.text)}</p>
          <p class="m"><span class="t">${esc((n.tags || []).map(t => '#' + t).join(' ')) || '—'}</span>
             <span>${esc(NN.hostOf(n.url))}</span><span>${fmt(n.createdAt)}</span></p>
        </li>`).join('');

      $('#stat').textContent = all.length + ' đoạn' +
        (settings.lastSync ? ' · đồng bộ ' + fmt(settings.lastSync) + ' trước' : '');
    });
  });

  $('#list').addEventListener('click', e => {
    const li = e.target.closest('.item');
    if (!li) return;
    const key = tab && tab.url ? NN.normalizeUrl(tab.url) : '';
    const url = li.dataset.url;
    if (NN.normalizeUrl(url) === key) {
      // đang ở đúng trang → chỉ cần nháy lên
      chrome.tabs.sendMessage(tab.id, { type: 'FLASH', id: li.dataset.id }, () => void chrome.runtime.lastError);
      window.close();
    } else {
      chrome.tabs.create({ url });
    }
  });

  $('#saveBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'SAVE_FROM_PAGE', label: activeLabel }, () => window.close());
  });
  $('#openLib').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_LIBRARY' }, () => window.close());
  });
  $('#studyBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_LIBRARY', hash: '#study' }, () => window.close());
  });
  $('#syncBtn').addEventListener('click', () => {
    $('#syncBtn').textContent = 'Đang…';
    chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, res => {
      if (res && res.ok) {
        $('#syncBtn').textContent = 'Xong';
        $('#stat').textContent = res.total + ' đoạn · vừa đồng bộ';
      } else {
        $('#syncBtn').textContent = 'Lỗi';
        $('#stat').textContent = (res && res.error) || 'Không kết nối được';
      }
      setTimeout(() => { $('#syncBtn').textContent = 'Đồng bộ'; }, 1800);
    });
  });
})();
