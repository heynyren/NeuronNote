/* Neuron Note — popup */
(function () {
  'use strict';

  /* Thiếu chu.js thì cứ chạy bằng chữ gốc, đừng chết. */
  const T = window.T || (x => x);
  const T2 = window.T2 || ((x, thay) => {
    let r = x;
    for (const k in (thay || {})) r = r.split('{' + k + '}').join(thay[k]);
    return r;
  });
  const $ = s => document.querySelector(s);
  const esc = NN.escapeHtml;
  let tab = null;
  let activeLabel = '';

  function fmt(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'd';
  }

  function renderLabels(labels) {
    const pick = $('#labelsPick');
    if (!labels.length) {
      pick.innerHTML = '<span class="none-hint">No labels yet — create one in the Library to quick-save by label.</span>';
      updateCta();
      return;
    }
    pick.innerHTML =
      `<button class="lp" data-name="" aria-pressed="${activeLabel === ''}">No label</button>` +
      labels.map(l => `<button class="lp" data-name="${esc(l.name)}" aria-pressed="${activeLabel === l.name}">
        <span class="d ${esc(l.color || 'amber')}"></span>${esc(l.name)}</button>`).join('');
    updateCta();
  }
  function updateCta() {
    $('#saveBtn').textContent = activeLabel
      ? T2('Save to #{nhan}', { nhan: activeLabel })
      : T('Save selected passage');
  }

  $('#labelsPick').addEventListener('click', e => {
    const b = e.target.closest('.lp');
    if (!b) return;
    activeLabel = b.dataset.name || '';
    $('#labelsPick').querySelectorAll('.lp').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    updateCta();
    NN.saveSettings({ activeLabel });   // remember the choice for next time + shortcut
  });

  /* Ngôn ngữ giao diện: đặt bên màn Thư viện, popup chỉ đọc theo. */
  chrome.storage.local.get('settings', r => {
    if (window.Chu) Chu.dat(Chu.hopLe(((r && r.settings) || {}).chu), document.body);
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

      $('#head').textContent = here.length ? T2('On this page · {n}', { n: here.length })
        : all.length ? T('Recently saved') : T('No passages yet');
      $('#none').hidden = show.length > 0;
      if (!all.length) {
        $('#none').textContent = T('No passages saved yet. Select text → right-click → Save to Neuron Note, pick a label.');
      }
      $('#list').innerHTML = show.map(n => `
        <li class="item" data-id="${esc(n.id)}" data-url="${esc(n.fragUrl || n.url)}">
          <p class="q">${esc(n.text)}</p>
          <p class="m"><span class="t">${esc((n.tags || []).map(t => '#' + t).join(' ')) || '—'}</span>
             <span>${esc(NN.hostOf(n.url))}</span><span>${fmt(n.createdAt)}</span></p>
        </li>`).join('');

      $('#stat').textContent = all.length + ' passages' +
        (settings.lastSync ? ' · synced ' + fmt(settings.lastSync) + ' ago' : '');
    });
  });

  $('#list').addEventListener('click', e => {
    const li = e.target.closest('.item');
    if (!li) return;
    const key = tab && tab.url ? NN.normalizeUrl(tab.url) : '';
    const url = li.dataset.url;
    if (NN.normalizeUrl(url) === key) {
      // already on the right page → just flash it
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
    $('#syncBtn').textContent = T('Syncing…');
    chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, res => {
      if (res && res.ok) {
        $('#syncBtn').textContent = T('Done');
        $('#stat').textContent = T2('{n} passages · just synced', { n: res.total });
      } else {
        $('#syncBtn').textContent = T('Error');
        $('#stat').textContent = (res && res.error) || T('Could not connect');
      }
      setTimeout(() => { $('#syncBtn').textContent = T('Sync'); }, 1800);
    });
  });
})();
