/* Neuron Note — library */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = NN.escapeHtml;

  const state = {
    notes: {},
    settings: {},
    q: '',
    tags: [],          // multiple labels at once
    tagMode: 'any',    // 'any' = has any | 'all' = has all
    site: null,
    sort: 'new'
  };

  /* ---------- time ---------- */
  function when(ts) {
    if (!ts) return '';
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    const day = Math.floor(h / 24);
    if (day < 7) return day + ' days ago';
    return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /* ---------- load data ---------- */
  function load() {
    return NN.getAll().then(r => {
      state.notes = r.notes;
      state.settings = r.settings;
      render();
      paintSync();
    });
  }

  function visible() {
    let list = NN.live(state.notes);
    if (state.tags.length) {
      list = list.filter(n => {
        const have = n.tags || [];
        return state.tagMode === 'all'
          ? state.tags.every(t => have.includes(t))
          : state.tags.some(t => have.includes(t));
      });
    }
    if (state.site) list = list.filter(n => NN.hostOf(n.url) === state.site);
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(n =>
        (n.text || '').toLowerCase().includes(q) ||
        (n.note || '').toLowerCase().includes(q) ||
        (n.title || '').toLowerCase().includes(q) ||
        (n.tags || []).join(' ').toLowerCase().includes(q));
    }
    if (state.sort === 'old') list = list.slice().reverse();
    else if (state.sort === 'site') {
      list = list.slice().sort((a, b) => {
        const h = NN.hostOf(a.url).localeCompare(NN.hostOf(b.url));
        return h !== 0 ? h : (b.createdAt || 0) - (a.createdAt || 0);
      });
    }
    return list;
  }

  /* ---------- render ---------- */
  function render() {
    const list = visible();
    const all = NN.live(state.notes);

    $('#count').textContent = list.length + ' passages';
    $('#crumb').textContent = state.tags.length ? state.tags.map(t => '#' + t).join(state.tagMode === 'all' ? ' + ' : ' / ')
      : state.site ? state.site
      : state.q ? 'Search results' : 'All';

    // My labels (predefined) + count of notes using each
    const usedCount = {};
    all.forEach(n => (n.tags || []).forEach(t => { usedCount[t] = (usedCount[t] || 0) + 1; }));
    const labels = state.settings.labels || [];
    const active = state.settings.activeLabel || '';
    // predefined labels first, then ad-hoc labels used but not predefined
    const defined = labels.map(l => l.name);
    const extras = Object.keys(usedCount).filter(t => !defined.includes(t)).sort();

    let labHtml = labels.map(l => `
      <li><button class="lab" data-tag="${esc(l.name)}" aria-pressed="${state.tags.includes(l.name)}">
        <span class="dot ${esc(l.color || 'amber')}"></span>
        <span class="nm">${esc(l.name)}</span>
        <span class="n">${usedCount[l.name] || 0}</span>
        <span class="star ${active === l.name ? 'on' : ''}" title="Default label">${active === l.name ? '★' : '☆'}</span>
      </button></li>`).join('');
    labHtml += extras.map(t => `
      <li><button class="lab" data-tag="${esc(t)}" aria-pressed="${state.tags.includes(t)}">
        <span class="dot amber" style="opacity:.35"></span>
        <span class="nm">${esc(t)}</span><span class="n">${usedCount[t]}</span>
      </button></li>`).join('');
    if (!labels.length && !extras.length) {
      labHtml = '<li class="empty-note">No labels yet. Click ＋ to create your first.</li>';
    }
    $('#labelList').innerHTML = labHtml;

    // label filter toolbar: AND/OR + clear, only shown when labels are selected
    const bar = $('#tagFilterBar');
    if (state.tags.length) {
      bar.hidden = false;
      bar.querySelector('[data-mode="any"]').setAttribute('aria-pressed', String(state.tagMode === 'any'));
      bar.querySelector('[data-mode="all"]').setAttribute('aria-pressed', String(state.tagMode === 'all'));
      $('#tagFilterCount').textContent = state.tags.length + ' labels';
    } else {
      bar.hidden = true;
    }

    // sources
    const siteCount = {};
    all.forEach(n => { const h = NN.hostOf(n.url); if (h) siteCount[h] = (siteCount[h] || 0) + 1; });
    const sites = Object.keys(siteCount).sort((a, b) => siteCount[b] - siteCount[a]);
    $('#siteList').innerHTML = sites.length
      ? sites.map(h => `<li><button class="site" data-site="${esc(h)}" aria-pressed="${state.site === h}"><span class="host">${esc(h)}</span><span class="n">${siteCount[h]}</span></button></li>`).join('')
      : '<li class="hint" style="font-size:12px;color:var(--muted)">No sources yet</li>';

    // list
    $('#empty').hidden = list.length > 0;
    $('#list').innerHTML = list.map(cardHtml).join('');
    updateDuePill();
  }

  function labelDot(color) {
    return color
      ? `<span class="ldot" style="background:var(--${esc(color)})"></span>`
      : `<span class="ldot muted"></span>`;
  }

  function pickerHtml(n) {
    const have = new Set(n.tags || []);
    const defined = state.settings.labels || [];
    let html = defined.map(l =>
      `<button type="button" class="lchip" data-name="${esc(l.name)}" aria-pressed="${have.has(l.name)}">
        ${labelDot(l.color)}${esc(l.name)}</button>`).join('');
    const adhoc = (n.tags || []).filter(t => !defined.some(l => l.name === t));
    html += adhoc.map(t =>
      `<button type="button" class="lchip" data-name="${esc(t)}" aria-pressed="true">
        ${labelDot('')}${esc(t)}</button>`).join('');
    html += `<span class="lchip-add">
        <button type="button" class="lchip add" data-act="addlabel">＋ label</button>
        <input type="text" class="lchip-input" placeholder="New label name" maxlength="40" hidden>
      </span>`;
    return html;
  }

  function dueLabel(ts) {
    const now = Date.now();
    if (ts <= now) return 'due';
    const days = Math.ceil((ts - now) / NN.DAY);
    if (days <= 1) return 'tomorrow';
    if (days < 30) return 'in ' + days + ' days';
    const mo = Math.round(days / 30);
    return 'in ~' + mo + ' months';
  }
  function srsBadge(n) {
    const s = n.srs || {};
    if (s.known) return '<span class="srs known">✓ mastered</span>';
    if (s.learn === false) return '<span class="srs off">snoozed</span>';
    const due = (s.due || 0) <= Date.now();
    return `<span class="srs ${due ? 'due' : ''}">level ${s.box || 0} · ${dueLabel(s.due || Date.now())}</span>`;
  }
  function studyToggleLabel(n) {
    const s = n.srs || {};
    if (s.known) return 'Study again';
    return s.learn === false ? 'Back to study' : 'Snooze';
  }

  function cardHtml(n) {
    const hasNote = !!(NN.squash(n.note) || (n.tags || []).length);
    const tags = (n.tags || []).map(t => {
      const c = NN.labelColor(state.settings, t);
      return `<button class="t" data-tag="${esc(t)}"${c ? ` style="background:var(--${esc(c)});color:#2A2E35"` : ''}>${esc(t)}</button>`;
    }).join('');
    return `
    <article class="note${hasNote ? ' has-note' : ''}" data-id="${esc(n.id)}" data-color="${esc(n.color || 'amber')}">
      <div class="card-note">
        <blockquote class="quote">${esc(n.text)}</blockquote>
        ${NN.squash(n.note) ? `<p class="mynote">${esc(n.note)}</p>` : ''}
        ${tags ? `<div class="tagrow">${tags}</div>` : ''}
        <div class="editor">
          <textarea placeholder="Your note…">${esc(n.note || '')}</textarea>
          <label class="editor-lbl">Labels</label>
          <div class="lbl-picker">${pickerHtml(n)}</div>
          <div class="study-ctl">
            <label class="mini-check"><input type="checkbox" data-srs="learn" ${(n.srs && n.srs.learn === false) ? '' : 'checked'}> Add to study schedule</label>
            <label class="mini-check"><input type="checkbox" data-srs="known" ${(n.srs && n.srs.known) ? 'checked' : ''}> Mastered (remove from study)</label>
          </div>
          <div class="row">
            <div class="swatches">
              ${['amber','mint','sky','rose','lilac'].map(c =>
                `<button class="sw" data-color="${c}" style="background:var(--${c})" aria-pressed="${(n.color || 'amber') === c}" title="${NN.COLOR_LABEL[c]}"></button>`).join('')}
            </div>
            <button class="btn sm" data-act="save">Save</button>
            <button class="btn ghost sm" data-act="cancel">Cancel</button>
          </div>
        </div>
        <div class="meta">
          <a class="src" href="${esc(n.fragUrl || n.url)}" target="_blank" rel="noopener">${esc(n.title || n.url)}</a>
          <span class="sep">·</span><span>${esc(NN.hostOf(n.url))}</span>
          <span class="sep">·</span><span>${when(n.createdAt)}</span>
          <span class="srs-tag">${srsBadge(n)}</span>
          <span class="acts">
            <button class="btn link" data-act="open">Open passage</button>
            <button class="btn link" data-act="copy">Copy link</button>
            <button class="btn link" data-act="study-toggle">${studyToggleLabel(n)}</button>
            <button class="btn link" data-act="edit">Edit</button>
            <button class="btn link danger" data-act="del">Delete</button>
          </span>
        </div>
      </div>
    </article>`;
  }

  /* ---------- interactions in the list ---------- */
  $('#list').addEventListener('click', e => {
    const tagBtn = e.target.closest('.tagrow .t');
    if (tagBtn) { toggleTag(tagBtn.dataset.tag); return; }

    // toggle a label chip in the editor
    const lchip = e.target.closest('.lbl-picker .lchip');
    if (lchip && !lchip.classList.contains('add')) {
      const on = lchip.getAttribute('aria-pressed') === 'true';
      lchip.setAttribute('aria-pressed', String(!on));
      return;
    }
    // open the new-label input
    if (e.target.closest('.lchip.add')) {
      const wrap = e.target.closest('.lchip-add');
      const inp = wrap.querySelector('.lchip-input');
      inp.hidden = false; inp.focus();
      return;
    }

    const sw = e.target.closest('.sw');
    if (sw) {
      sw.parentNode.querySelectorAll('.sw').forEach(x => x.setAttribute('aria-pressed', String(x === sw)));
      return;
    }

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const art = btn.closest('.note');
    const id = art.dataset.id;
    const note = state.notes[id];
    if (!note) return;

    switch (btn.dataset.act) {
      case 'open':
        chrome.tabs.create({ url: note.fragUrl || note.url });
        break;
      case 'copy':
        navigator.clipboard.writeText(note.fragUrl || note.url)
          .then(() => toast('Copied a link to this passage'), () => toast('Could not copy the link'));
        break;
      case 'edit':
        art.classList.add('editing');
        art.querySelector('.editor textarea').focus();
        break;
      case 'cancel':
        art.classList.remove('editing');
        render();   // discard any unsaved changes
        break;
      case 'save': {
        const tags = Array.from(art.querySelectorAll('.lbl-picker .lchip[aria-pressed="true"]'))
          .map(c => c.dataset.name).filter(Boolean);
        // any freshly created label (not yet in the list) gets added to settings
        const newLabels = tags.filter(t => t && !( state.settings.labels || []).some(l => l.name === t)
          && art.querySelector('.lbl-picker .lchip[data-name="' + cssq(t) + '"].new'));
        const picked = art.querySelector('.sw[aria-pressed="true"]');
        const next = Object.assign({}, note, {
          note: art.querySelector('.editor textarea').value.trim(),
          tags,
          color: picked ? picked.dataset.color : (note.color || 'amber')
        });
        // study state
        NN.ensureSrs(next);
        next.srs = Object.assign({}, next.srs);
        const learnCb = art.querySelector('input[data-srs="learn"]');
        const knownCb = art.querySelector('input[data-srs="known"]');
        if (knownCb && knownCb.checked) { next.srs.known = true; }
        else {
          next.srs.known = false;
          next.srs.learn = !(learnCb && !learnCb.checked);
        }
        next.fragUrl = NN.buildFragmentUrl(next);

        const afterSettings = newLabels.length
          ? NN.saveSettings({ labels: NN.withNewLabels(state.settings, newLabels) }).then(s => { state.settings = s; })
          : Promise.resolve();

        afterSettings
          .then(() => NN.putNote(next))
          .then(() => { state.notes[id] = next; render(); toast('Saved'); autoSync(); });
        break;
      }
      case 'study-toggle': {
        const next = Object.assign({}, note);
        NN.ensureSrs(next);
        next.srs = Object.assign({}, next.srs);
        const s = next.srs;
        let msg;
        if (s.known) { s.known = false; s.learn = true; msg = 'Back to study'; }
        else if (s.learn === false) { s.learn = true; msg = 'Back to study'; }
        else { s.learn = false; msg = 'Snoozed from study'; }
        NN.putNote(next).then(() => { state.notes[id] = next; render(); toast(msg); autoSync(); });
        break;
      }
      case 'del':
        NN.removeNote(id).then(() => {
          state.notes[id] = { id, deleted: true, updatedAt: Date.now(), url: note.url, createdAt: note.createdAt };
          render();
          toast('Deleted');
          autoSync();
        });
        break;
    }
  });

  function cssq(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  // create a new label right in the editor (Enter)
  $('#list').addEventListener('keydown', e => {
    const inp = e.target.closest && e.target.closest('.lchip-input');
    if (!inp) return;
    if (e.key === 'Escape') { inp.hidden = true; inp.value = ''; return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const name = NN.squash(inp.value);
    if (!name) return;
    const picker = inp.closest('.lbl-picker');
    if (picker.querySelector('.lchip[data-name="' + cssq(name) + '"]')) {
      // already exists → just turn it on
      picker.querySelector('.lchip[data-name="' + cssq(name) + '"]').setAttribute('aria-pressed', 'true');
    } else {
      const color = NN.nextLabelColor(state.settings);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'lchip new';
      chip.dataset.name = name;
      chip.setAttribute('aria-pressed', 'true');
      chip.innerHTML = '<span class="ldot" style="background:var(--' + esc(color) + ')"></span>' + esc(name);
      inp.closest('.lchip-add').before(chip);
    }
    inp.value = ''; inp.hidden = true;
  });

  /* ---------- filters ---------- */
  function toggleTag(name) {
    const i = state.tags.indexOf(name);
    if (i >= 0) state.tags.splice(i, 1);
    else state.tags.push(name);
    state.site = null;
    render();
  }

  $('#labelList').addEventListener('click', e => {
    const star = e.target.closest('.star');
    if (star) {
      e.stopPropagation();
      const b = star.closest('.lab');
      const name = b.dataset.tag;
      const next = state.settings.activeLabel === name ? '' : name;
      NN.saveSettings({ activeLabel: next }).then(s => { state.settings = s; render(); });
      return;
    }
    const b = e.target.closest('.lab');
    if (!b) return;
    toggleTag(b.dataset.tag);
  });
  $('#addLabel').addEventListener('click', () => { openSheet(); setTimeout(() => $('#newLabelName').focus(), 60); });

  // AND/OR bar
  $('#tagFilterBar').addEventListener('click', e => {
    const m = e.target.closest('[data-mode]');
    if (m) { state.tagMode = m.dataset.mode; render(); return; }
    if (e.target.closest('[data-clear]')) { state.tags = []; render(); }
  });

  $('#siteList').addEventListener('click', e => {
    const b = e.target.closest('.site');
    if (!b) return;
    state.site = state.site === b.dataset.site ? null : b.dataset.site;
    render();
  });
  $('#brandHome').addEventListener('click', e => {
    e.preventDefault();
    state.tags = []; state.site = null; state.q = ''; $('#q').value = '';
    render();
  });

  let qt;
  $('#q').addEventListener('input', e => {
    clearTimeout(qt);
    qt = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 140);
  });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });

  /* ---------- export / import ---------- */
  function download(name, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  function exportJson() {
    download('neuron-note-backup-' + stamp() + '.json',
      JSON.stringify({ app: 'neuron-note', version: 1, exportedAt: Date.now(), notes: state.notes }, null, 2),
      'application/json');
  }
  function exportMarkdown() {
    const list = visible();
    const byHost = {};
    list.forEach(n => { (byHost[NN.hostOf(n.url)] = byHost[NN.hostOf(n.url)] || []).push(n); });
    let out = '# Neuron Note — ' + stamp() + '\n\n';
    Object.keys(byHost).sort().forEach(h => {
      out += '## ' + h + '\n\n';
      byHost[h].forEach(n => {
        out += '> ' + n.text.replace(/\n/g, '\n> ') + '\n\n';
        if (NN.squash(n.note)) out += n.note + '\n\n';
        if ((n.tags || []).length) out += (n.tags.map(t => '`#' + t + '`').join(' ')) + '\n\n';
        out += '[' + (n.title || n.url) + '](' + (n.fragUrl || n.url) + ')\n\n---\n\n';
      });
    });
    download('neuron-note-' + stamp() + '.md', out, 'text/markdown');
  }
  function exportCsv() {
    const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const rows = [['text', 'note', 'tags', 'title', 'url', 'link', 'createdAt']];
    visible().forEach(n => rows.push([
      n.text, n.note || '', (n.tags || []).join(' '), n.title || '',
      n.url, n.fragUrl || n.url, new Date(n.createdAt || 0).toISOString()
    ]));
    download('neuron-note-' + stamp() + '.csv', '\uFEFF' + rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv');
  }

  $('#btnExport').addEventListener('click', exportMarkdown);
  $('#btnBackup').addEventListener('click', exportJson);
  $('#btnMd').addEventListener('click', exportMarkdown);
  $('#btnCsv').addEventListener('click', exportCsv);

  $('#btnImport').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const incoming = data.notes || data;
        if (typeof incoming !== 'object') throw new Error('bad');
        const m = NN.merge(state.notes, incoming);
        NN.setNotes(m.notes).then(() => {
          state.notes = m.notes;
          render();
          toast('Imported ' + m.added + ' new, updated ' + m.updated);
        });
      } catch (err) {
        toast('Could not read the file — needs a valid Neuron Note JSON backup');
      }
      e.target.value = '';
    };
    r.readAsText(f);
  });

  /* ---------- manage labels ---------- */
  const PALETTE = ['amber', 'mint', 'sky', 'rose', 'lilac'];

  function swatchRow(selected, cls) {
    return `<div class="swatches ${cls || ''}">` + PALETTE.map(c =>
      `<button class="sw" data-color="${c}" style="background:var(--${c})" aria-pressed="${selected === c}" title="${NN.COLOR_LABEL[c]}"></button>`
    ).join('') + '</div>';
  }

  function renderLabelEditor() {
    const labels = state.settings.labels || [];
    const active = state.settings.activeLabel || '';
    $('#labelEditor').innerHTML = labels.length
      ? labels.map((l, i) => `
        <div class="label-row" data-i="${i}">
          <span class="dot ${esc(l.color)}"></span>
          <input class="rn" type="text" value="${esc(l.name)}" maxlength="40" aria-label="Label name">
          ${swatchRow(l.color)}
          <button class="set-active ${active === l.name ? 'on' : ''}" title="Set as default label">${active === l.name ? '★ default' : 'set default'}</button>
          <button class="del" title="Delete label">🗑</button>
        </div>`).join('')
      : '<p class="hint">No labels yet.</p>';
    $('#newLabelColors').innerHTML = swatchRow('amber').replace('<div class="swatches ', '<div data-newcolors class="swatches ');
    // set the default color for the new-label input
    const first = $('#newLabelColors .sw');
    if (first) first.setAttribute('aria-pressed', 'true');
  }

  function persistLabels(labels, activeLabel) {
    const patch = { labels };
    if (activeLabel !== undefined) patch.activeLabel = activeLabel;
    return NN.saveSettings(patch).then(s => { state.settings = s; renderLabelEditor(); render(); });
  }

  // pick a color in any .swatches within the settings sheet
  $('#sheet').addEventListener('click', e => {
    const sw = e.target.closest('.swatches .sw');
    if (sw) {
      sw.parentNode.querySelectorAll('.sw').forEach(x => x.setAttribute('aria-pressed', String(x === sw)));
    }
  });

  $('#labelEditor').addEventListener('click', e => {
    const row = e.target.closest('.label-row');
    if (!row) return;
    const i = +row.dataset.i;
    const labels = (state.settings.labels || []).slice();
    const l = labels[i];
    if (!l) return;

    if (e.target.closest('.del')) {
      if (!confirm('Delete the label "' + l.name + '"? Passages carrying it are kept.')) return;
      const removed = l.name;
      labels.splice(i, 1);
      const activeLabel = state.settings.activeLabel === removed ? '' : state.settings.activeLabel;
      persistLabels(labels, activeLabel);
      return;
    }
    if (e.target.closest('.set-active')) {
      const activeLabel = state.settings.activeLabel === l.name ? '' : l.name;
      persistLabels(labels, activeLabel);
      return;
    }
    const sw = e.target.closest('.sw');
    if (sw) {
      labels[i] = { name: l.name, color: sw.dataset.color };
      persistLabels(labels);
    }
  });

  // rename when leaving the input
  $('#labelEditor').addEventListener('change', e => {
    const inp = e.target.closest('.rn');
    if (!inp) return;
    const row = inp.closest('.label-row');
    const i = +row.dataset.i;
    const labels = (state.settings.labels || []).slice();
    const old = labels[i] && labels[i].name;
    const name = NN.squash(inp.value);
    if (!name || !old || name === old) { inp.value = old || ''; return; }
    if (labels.some((x, j) => j !== i && x.name === name)) { alert('A label with this name already exists.'); inp.value = old; return; }
    labels[i] = { name, color: labels[i].color };
    const activeLabel = state.settings.activeLabel === old ? name : state.settings.activeLabel;
    persistLabels(labels, activeLabel);
  });

  function addLabel() {
    const name = NN.squash($('#newLabelName').value);
    if (!name) { $('#newLabelName').focus(); return; }
    const labels = (state.settings.labels || []).slice();
    if (labels.some(x => x.name === name)) { alert('A label with this name already exists.'); return; }
    const picked = $('#newLabelColors .sw[aria-pressed="true"]');
    const color = picked ? picked.dataset.color : 'amber';
    labels.push({ name, color });
    $('#newLabelName').value = '';
    persistLabels(labels);
  }
  $('#newLabelAdd').addEventListener('click', addLabel);
  $('#newLabelName').addEventListener('keydown', e => { if (e.key === 'Enter') addLabel(); });

  /* ---------- settings ---------- */
  function openSheet() {
    const s = state.settings;
    $('#syncUrl').value = s.syncUrl || '';
    $('#syncKey').value = s.syncKey || '';
    $('#autoSync').checked = s.autoSync !== false;
    $('#autoHighlight').checked = s.autoHighlight !== false;
    $('#markColor').value = s.markColor || 'amber';
    renderLabelEditor();
    const all = NN.live(state.notes);
    const tombs = Object.values(state.notes).filter(n => n && n.deleted).length;
    $('#stat').textContent = all.length + ' saved passages · ' + tombs + ' pending deletions';
    $('#sheetMsg').textContent = '';
    $('#sheet').hidden = false;
  }
  $('#btnSettings').addEventListener('click', openSheet);
  $('#sheetClose').addEventListener('click', () => { $('#sheet').hidden = true; });
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') $('#sheet').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#sheet').hidden = true; });

  $('#sheetSave').addEventListener('click', () => {
    NN.saveSettings({
      syncUrl: $('#syncUrl').value.trim(),
      syncKey: $('#syncKey').value.trim(),
      autoSync: $('#autoSync').checked,
      autoHighlight: $('#autoHighlight').checked,
      markColor: $('#markColor').value
    }).then(s => {
      state.settings = s;
      $('#sheetMsg').textContent = 'Settings saved.';
      paintSync();
      setTimeout(() => { $('#sheet').hidden = true; }, 600);
    });
  });

  /* ---------- sync ---------- */
  function paintSync(msg, cls) {
    const dot = $('#syncDot'), txt = $('#syncText');
    dot.className = 'sync-dot' + (cls ? ' ' + cls : '');
    if (msg) { txt.textContent = msg; return; }
    if (!state.settings.syncUrl) { txt.textContent = 'Sync is off'; return; }
    dot.classList.add('on');
    txt.textContent = state.settings.lastSync
      ? 'Synced ' + when(state.settings.lastSync)
      : 'Ready to sync';
  }

  function doSync() {
    if (!state.settings.syncUrl) { openSheet(); return; }
    paintSync('Syncing…', 'busy');
    chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, res => {
      if (!res || !res.ok) {
        paintSync('Sync error', 'err');
        toast((res && res.error) || 'Could not reach the server');
        return;
      }
      load().then(() => toast('Synced · ' + res.total + ' passages'));
    });
  }
  $('#btnSync').addEventListener('click', doSync);

  function autoSync() {
    if (state.settings.autoSync !== false && state.settings.syncUrl) {
      chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, () => load());
    }
  }

  /* ---------- toast ---------- */
  let tt;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(tt);
    tt = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ---------- study mode (SRS) ---------- */
  const study = { queue: [], i: 0, revealed: false, done: 0 };

  function updateDuePill() {
    const st = NN.studyStats(state.notes);
    const pill = $('#duePill');
    if (st.due > 0) { pill.hidden = false; pill.textContent = st.due; }
    else { pill.hidden = true; }
  }

  function buildQueue() {
    const now = Date.now();
    // due within the current filter (if filtering by label/source, study just that set)
    let pool = visible().filter(n => NN.isDue(n, now));
    if (!pool.length) pool = NN.live(state.notes).filter(n => NN.isDue(n, now)); // nothing in filter → study everything
    // longest-overdue first
    pool.sort((a, b) => (a.srs.due || 0) - (b.srs.due || 0));
    return pool;
  }

  function openStudy() {
    study.queue = buildQueue();
    study.i = 0; study.revealed = false; study.done = 0;
    $('#study').hidden = false;
    if (!study.queue.length) showStudyDone(true);
    else { $('#studyDone').hidden = true; renderStudyCard(); }
  }
  function closeStudy() { $('#study').hidden = true; load(); }

  function showStudyDone(nothingDue) {
    $('#studyStage').innerHTML = '';
    $('#studyDone').hidden = false;
    $('#studyProgress').textContent = '';
    const st = NN.studyStats(state.notes);
    $('#doneTitle').textContent = nothingDue && !study.done ? 'Nothing due right now' : 'All caught up!';
    $('#doneBody').textContent = (study.done ? 'Reviewed ' + study.done + ' passages. ' : '') +
      st.studying + ' in the schedule, ' + st.due + ' due.';
  }

  function renderStudyCard() {
    const n = study.queue[study.i];
    if (!n) return showStudyDone(false);
    study.revealed = false;
    $('#studyProgress').textContent = (study.i + 1) + ' / ' + study.queue.length;
    const s = n.srs || {};
    const tags = (n.tags || []).map(t => {
      const c = NN.labelColor(state.settings, t);
      return `<span class="st-tag"${c ? ` style="background:var(--${esc(c)});color:#2A2E35"` : ''}>${esc(t)}</span>`;
    }).join('');

    $('#studyStage').innerHTML = `
      <div class="study-card" data-color="${esc(n.color || 'amber')}">
        <div class="st-meta">${esc(NN.hostOf(n.url))} · level ${s.box || 0} · reviewed ${s.reps || 0} times</div>
        <blockquote class="st-quote">${esc(n.text)}</blockquote>
        ${tags ? `<div class="st-tags">${tags}</div>` : ''}
        <div class="st-reveal" hidden>
          ${NN.squash(n.note) ? `<p class="st-note">${esc(n.note)}</p>` : '<p class="st-note muted">— no note yet —</p>'}
          <a class="st-open" href="${esc(n.fragUrl || n.url)}" target="_blank" rel="noopener">Open source passage ↗</a>
        </div>
        <div class="st-edit" hidden>
          <textarea class="st-edit-note" placeholder="Your note…">${esc(n.note || '')}</textarea>
          <label class="editor-lbl">Labels</label>
          <div class="lbl-picker">${pickerHtml(n)}</div>
          <div class="row">
            <div class="swatches">
              ${['amber','mint','sky','rose','lilac'].map(c =>
                `<button class="sw" data-color="${c}" style="background:var(--${c})" aria-pressed="${(n.color || 'amber') === c}" title="${NN.COLOR_LABEL[c]}"></button>`).join('')}
            </div>
            <button class="btn sm" data-st="save-edit">Save</button>
            <button class="btn ghost sm" data-st="cancel-edit">Cancel</button>
          </div>
        </div>
        <div class="st-actions">
          <button class="btn ghost" data-st="reveal">Show note</button>
          <div class="st-grade" hidden>
            <button class="btn ghost grade-no" data-st="no">Not yet</button>
            <button class="btn grade-yes" data-st="yes">Got it</button>
          </div>
        </div>
        <div class="st-side">
          <button class="btn link" data-st="edit">Edit note &amp; labels</button>
          <button class="btn link" data-st="hide">Snooze</button>
          <button class="btn link" data-st="known">Mastered</button>
        </div>
      </div>`;
  }

  function advance() {
    study.i += 1;
    if (study.i >= study.queue.length) { updateDuePill(); showStudyDone(false); }
    else renderStudyCard();
  }

  $('#studyStage').addEventListener('click', e => {
    // toggle a label chip in the study editor
    const lchip = e.target.closest('.lbl-picker .lchip');
    if (lchip && !lchip.classList.contains('add')) {
      const on = lchip.getAttribute('aria-pressed') === 'true';
      lchip.setAttribute('aria-pressed', String(!on));
      return;
    }
    // open the new-label input
    if (e.target.closest('.lchip.add')) {
      const wrap = e.target.closest('.lchip-add');
      const inp = wrap.querySelector('.lchip-input');
      inp.hidden = false; inp.focus();
      return;
    }
    // pick a highlight color
    const sw = e.target.closest('.st-edit .sw');
    if (sw) {
      sw.parentNode.querySelectorAll('.sw').forEach(x => x.setAttribute('aria-pressed', String(x === sw)));
      return;
    }

    const b = e.target.closest('[data-st]');
    if (!b) return;
    const n = study.queue[study.i];
    if (!n) return;
    const act = b.dataset.st;
    const card = $('#studyStage').querySelector('.study-card');

    if (act === 'edit') {
      card.classList.add('editing');
      card.querySelector('.st-edit').hidden = false;
      card.querySelector('.st-edit-note').focus();
      return;
    }
    if (act === 'cancel-edit') {
      card.classList.remove('editing');
      renderStudyCard();   // discard unsaved changes
      return;
    }
    if (act === 'save-edit') {
      const tags = Array.from(card.querySelectorAll('.lbl-picker .lchip[aria-pressed="true"]'))
        .map(c => c.dataset.name).filter(Boolean);
      const newLabels = tags.filter(t => t && !(state.settings.labels || []).some(l => l.name === t)
        && card.querySelector('.lbl-picker .lchip[data-name="' + cssq(t) + '"].new'));
      const picked = card.querySelector('.st-edit .sw[aria-pressed="true"]');
      const next = Object.assign({}, n, {
        note: card.querySelector('.st-edit-note').value.trim(),
        tags,
        color: picked ? picked.dataset.color : (n.color || 'amber')
      });
      next.updatedAt = Date.now();
      next.fragUrl = NN.buildFragmentUrl(next);

      const afterSettings = newLabels.length
        ? NN.saveSettings({ labels: NN.withNewLabels(state.settings, newLabels) }).then(s => { state.settings = s; })
        : Promise.resolve();

      afterSettings
        .then(() => NN.putNote(next))
        .then(() => {
          state.notes[next.id] = next;
          study.queue[study.i] = next;
          const wasRevealed = study.revealed;
          renderStudyCard();
          if (wasRevealed) {
            const c = $('#studyStage').querySelector('.study-card');
            c.querySelector('[data-st="reveal"]').click();
          }
          toast('Saved');
          autoSync();
        });
      return;
    }

    if (act === 'reveal') {
      card.querySelector('.st-reveal').hidden = false;
      card.querySelector('[data-st="reveal"]').hidden = true;
      card.querySelector('.st-grade').hidden = false;
      study.revealed = true;
      return;
    }
    if (act === 'yes' || act === 'no') {
      const next = Object.assign({}, n);
      NN.grade(next, act === 'yes');
      study.done += 1;
      NN.putNote(next).then(() => { state.notes[next.id] = next; autoSync(); });
      advance();
      return;
    }
    if (act === 'hide' || act === 'known') {
      const next = Object.assign({}, n);
      NN.ensureSrs(next); next.srs = Object.assign({}, next.srs);
      if (act === 'hide') next.srs.learn = false; else next.srs.known = true;
      next.updatedAt = Date.now();
      NN.putNote(next).then(() => { state.notes[next.id] = next; autoSync(); });
      toast(act === 'hide' ? 'Snoozed from study' : 'Marked as mastered');
      advance();
      return;
    }
  });

  // create a new label right in the study editor (Enter)
  $('#studyStage').addEventListener('keydown', e => {
    const inp = e.target.closest && e.target.closest('.lchip-input');
    if (!inp) return;
    if (e.key === 'Escape') { e.stopPropagation(); inp.hidden = true; inp.value = ''; return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const name = NN.squash(inp.value);
    if (!name) return;
    const picker = inp.closest('.lbl-picker');
    if (picker.querySelector('.lchip[data-name="' + cssq(name) + '"]')) {
      picker.querySelector('.lchip[data-name="' + cssq(name) + '"]').setAttribute('aria-pressed', 'true');
    } else {
      const color = NN.nextLabelColor(state.settings);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'lchip new';
      chip.dataset.name = name;
      chip.setAttribute('aria-pressed', 'true');
      chip.innerHTML = '<span class="ldot" style="background:var(--' + esc(color) + ')"></span>' + esc(name);
      inp.closest('.lchip-add').before(chip);
    }
    inp.value = ''; inp.hidden = true;
  });

  // study shortcuts: Space=flip, 1/←=Not yet, 2/→/Enter=Got it
  document.addEventListener('keydown', e => {
    if ($('#study').hidden) return;
    const card = $('#studyStage').querySelector('.study-card');
    // while editing a note/label, keep keystrokes out of the flashcard shortcuts
    const editing = card && card.classList.contains('editing');
    if (editing) {
      if (e.key === 'Escape') { card.querySelector('[data-st="cancel-edit"]').click(); }
      return;
    }
    if (e.key === 'Escape') { closeStudy(); return; }
    if (!card) return;
    if (!study.revealed) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); card.querySelector('[data-st="reveal"]').click(); }
    } else {
      if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); card.querySelector('[data-st="no"]').click(); }
      else if (e.key === '2' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); card.querySelector('[data-st="yes"]').click(); }
    }
  });

  $('#btnStudy').addEventListener('click', openStudy);
  $('#studyClose').addEventListener('click', closeStudy);
  $('#studyFinish').addEventListener('click', closeStudy);

  /* ---------- startup ---------- */
  chrome.storage.onChanged.addListener(ch => {
    if (ch.notes || ch.settings) load();
  });
  load().then(() => {
    if (location.hash === '#settings' || location.hash === '#labels') openSheet();
    if (location.hash === '#labels') setTimeout(() => $('#newLabelName') && $('#newLabelName').focus(), 80);
    if (location.hash === '#study') setTimeout(openStudy, 60);
  });
})();
