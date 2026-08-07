/* Neuron Note — Android app (Capacitor). Shares NN.* from shared.js. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = NN.escapeHtml;
  const PALETTE = ['amber', 'mint', 'sky', 'rose', 'lilac'];

  const state = {
    notes: {}, settings: {},
    tab: 'lib', q: '', tags: [], tagMode: 'any',
    addTags: [], editingId: null,
    study: { queue: [], i: 0, revealed: false, done: 0 }
  };

  /* ---------------- utilities ---------------- */
  function when(ts) {
    if (!ts) return '';
    const d = Date.now() - ts, m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    const day = Math.floor(h / 24);
    if (day < 7) return day + 'd';
    return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  function dueLabel(ts) {
    const now = Date.now();
    if (ts <= now) return 'due';
    const days = Math.ceil((ts - now) / NN.DAY);
    if (days <= 1) return 'tomorrow';
    if (days < 30) return 'in ' + days + ' days';
    return 'in ~' + Math.round(days / 30) + ' months';
  }
  function srsBadge(n) {
    const s = n.srs || {};
    if (s.known) return '<span class="srs known">✓ mastered</span>';
    if (s.learn === false) return '<span class="srs off">snoozed</span>';
    const due = (s.due || 0) <= Date.now();
    return `<span class="srs ${due ? 'due' : ''}">level ${s.box || 0} · ${dueLabel(s.due || Date.now())}</span>`;
  }
  function isHttp(u) { return /^https?:\/\//i.test(u || ''); }
  function toast(t) {
    const el = $('#toast'); el.textContent = t; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { el.hidden = true; }, 2400);
  }

  /* ---------------- load & save ---------------- */
  function load() {
    return NN.getAll().then(r => { state.notes = r.notes; state.settings = r.settings; renderAll(); });
  }
  function renderAll() { renderLib(); renderDue(); }

  /* ---------------- NOTEBOOK ---------------- */
  function visible() {
    let list = NN.live(state.notes);
    if (state.tags.length) {
      list = list.filter(n => {
        const have = n.tags || [];
        return state.tagMode === 'all' ? state.tags.every(t => have.includes(t)) : state.tags.some(t => have.includes(t));
      });
    }
    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(n =>
        (n.text || '').toLowerCase().includes(q) || (n.note || '').toLowerCase().includes(q) ||
        (n.title || '').toLowerCase().includes(q) || (n.tags || []).join(' ').toLowerCase().includes(q));
    }
    return list;
  }

  function labelColorOf(name) { return NN.labelColor(state.settings, name); }

  function renderLib() {
    const all = NN.live(state.notes);
    const list = visible();

    // filter chips: predefined labels + ad-hoc labels in use
    const used = {};
    all.forEach(n => (n.tags || []).forEach(t => { used[t] = (used[t] || 0) + 1; }));
    const defined = (state.settings.labels || []).map(l => l.name);
    const extras = Object.keys(used).filter(t => !defined.includes(t)).sort();
    let chips = (state.settings.labels || []).map(l =>
      `<button class="fchip" data-tag="${esc(l.name)}" aria-pressed="${state.tags.includes(l.name)}">
        <span class="d ${esc(l.color || 'amber')}"></span>${esc(l.name)}<span class="n">${used[l.name] || 0}</span></button>`).join('');
    chips += extras.map(t =>
      `<button class="fchip" data-tag="${esc(t)}" aria-pressed="${state.tags.includes(t)}">${esc(t)}<span class="n">${used[t]}</span></button>`).join('');
    $('#labelFilter').innerHTML = chips || '<span class="hint" style="padding:4px 0">No labels yet</span>';

    const bar = $('#tagFilterBar');
    if (state.tags.length) {
      bar.hidden = false;
      bar.querySelector('[data-mode="any"]').setAttribute('aria-pressed', String(state.tagMode === 'any'));
      bar.querySelector('[data-mode="all"]').setAttribute('aria-pressed', String(state.tagMode === 'all'));
      $('#tagFilterCount').textContent = state.tags.length + ' labels';
    } else bar.hidden = true;

    $('#libCount').textContent = list.length + ' passages' + (state.tags.length ? ' (filtered)' : '');
    $('#empty').hidden = list.length > 0;
    $('#list').innerHTML = list.map(cardHtml).join('');
  }

  function cardHtml(n) {
    const tags = (n.tags || []).map(t => {
      const c = labelColorOf(t);
      return `<span class="t"${c ? ` style="background:var(--${esc(c)});color:#2A2E35"` : ''}>${esc(t)}</span>`;
    }).join('');
    const s = n.srs || {};
    const toggleTxt = s.known ? 'Study again' : (s.learn === false ? 'To study' : 'Snooze');
    return `<div class="note" data-id="${esc(n.id)}" data-color="${esc(n.color || 'amber')}">
      <p class="q">${esc(n.text)}</p>
      ${NN.squash(n.note) ? `<p class="mynote">${esc(n.note)}</p>` : ''}
      ${tags ? `<div class="tagrow">${tags}</div>` : ''}
      <div class="meta">
        <span>${esc(NN.hostOf(n.url) || 'note')}</span><span>·</span><span>${when(n.createdAt)}</span>
        ${srsBadge(n)}
        <span class="meta-acts">
          ${NN.inStudy(n) ? '<button class="mact grade-no" data-act="grade-no">Not yet</button><button class="mact grade-yes" data-act="grade-yes">Got it</button>' : ''}
          ${isHttp(n.url) ? '<button class="mact" data-act="open">Open</button>' : ''}
          <button class="mact" data-act="toggle">${toggleTxt}</button>
          <button class="mact edit" data-act="edit">Edit</button>
        </span>
      </div>
    </div>`;
  }

  function toggleTag(name) {
    const i = state.tags.indexOf(name);
    if (i >= 0) state.tags.splice(i, 1); else state.tags.push(name);
    renderLib();
  }

  $('#labelFilter').addEventListener('click', e => {
    const b = e.target.closest('.fchip'); if (b) toggleTag(b.dataset.tag);
  });
  $('#tagFilterBar').addEventListener('click', e => {
    const m = e.target.closest('[data-mode]');
    if (m) { state.tagMode = m.dataset.mode; renderLib(); return; }
    if (e.target.closest('[data-clear]')) { state.tags = []; renderLib(); }
  });
  let qt;
  $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); renderLib(); }, 130); });

  $('#list').addEventListener('click', e => {
    const t = e.target.closest('.tagrow .t');
    if (t) { toggleTag(t.textContent); return; }
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const id = btn.closest('.note').dataset.id;
    const note = state.notes[id]; if (!note) return;
    const act = btn.dataset.act;
    if (act === 'open') { openUrl(note.fragUrl || note.url); return; }
    if (act === 'edit') { openEditor(note); return; }
    if (act === 'grade-yes' || act === 'grade-no') {
      const next = Object.assign({}, note); NN.ensureSrs(next); next.srs = Object.assign({}, next.srs);
      NN.grade(next, act === 'grade-yes');
      NN.putNote(next).then(() => {
        state.notes[id] = next; renderAll();
        toast((act === 'grade-yes' ? 'Got it → level ' : 'Not yet → level ') + next.srs.box + ' · ' + dueLabel(next.srs.due));
        autoSync();
      });
      return;
    }
    if (act === 'toggle') {
      const next = Object.assign({}, note); NN.ensureSrs(next); next.srs = Object.assign({}, next.srs);
      const s = next.srs; let msg;
      if (s.known) { s.known = false; s.learn = true; msg = 'Back to study'; }
      else if (s.learn === false) { s.learn = true; msg = 'Back to study'; }
      else { s.learn = false; msg = 'Snoozed from study'; }
      NN.putNote(next).then(() => { state.notes[id] = next; renderAll(); toast(msg); autoSync(); });
    }
  });

  // The phone browser has no extension, so drop the #nn=id part and keep only the
  // plain text-fragment (#:~:text=…) so the browser scrolls to and highlights the passage.
  function mobileFragUrl(u) {
    if (!u) return u;
    const idx = u.indexOf(':~:');
    if (idx === -1) return u;
    const hash = u.lastIndexOf('#', idx);
    const base = hash === -1 ? u.slice(0, idx) : u.slice(0, hash);
    return base + '#:~:' + u.slice(idx + 3);
  }
  function openUrl(u) {
    u = mobileFragUrl(u);
    if (!u) return;
    const B = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser;
    if (B) B.open({ url: u }); else window.open(u, '_blank');
  }

  /* ---------------- label picker (shared) ---------------- */
  function labelDot(color) {
    return color ? `<span class="ldot" style="background:var(--${esc(color)})"></span>` : '<span class="ldot muted"></span>';
  }
  function pickerHtml(selected) {
    const have = new Set(selected || []);
    const defined = state.settings.labels || [];
    let html = defined.map(l =>
      `<button type="button" class="lchip" data-name="${esc(l.name)}" aria-pressed="${have.has(l.name)}">${labelDot(l.color)}${esc(l.name)}</button>`).join('');
    (selected || []).filter(t => !defined.some(l => l.name === t)).forEach(t => {
      html += `<button type="button" class="lchip" data-name="${esc(t)}" aria-pressed="true">${labelDot('')}${esc(t)}</button>`;
    });
    html += `<span class="lchip-add"><button type="button" class="lchip add" data-add>＋ label</button>
      <input type="text" class="lchip-input" placeholder="New label name" maxlength="40" hidden></span>`;
    return html;
  }
  function bindPicker(root) {
    root.addEventListener('click', e => {
      const chip = e.target.closest('.lchip');
      if (chip && !chip.classList.contains('add')) { chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true'); return; }
      if (e.target.closest('[data-add]')) { const inp = root.querySelector('.lchip-input'); inp.hidden = false; inp.focus(); }
    });
    root.addEventListener('keydown', e => {
      const inp = e.target.closest && e.target.closest('.lchip-input'); if (!inp) return;
      if (e.key === 'Escape') { inp.hidden = true; inp.value = ''; return; }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const name = NN.squash(inp.value); if (!name) return;
      const exist = root.querySelector('.lchip[data-name="' + cssq(name) + '"]');
      if (exist) exist.setAttribute('aria-pressed', 'true');
      else {
        const color = NN.nextLabelColor(state.settings);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'lchip new'; b.dataset.name = name; b.setAttribute('aria-pressed', 'true');
        b.innerHTML = '<span class="ldot" style="background:var(--' + esc(color) + ')"></span>' + esc(name);
        inp.closest('.lchip-add').before(b);
      }
      inp.value = ''; inp.hidden = true;
    });
  }
  function readPicker(root) {
    const tags = Array.from(root.querySelectorAll('.lchip[aria-pressed="true"]')).map(c => c.dataset.name).filter(Boolean);
    const newLabels = Array.from(root.querySelectorAll('.lchip.new[aria-pressed="true"]')).map(c => c.dataset.name);
    return { tags, newLabels };
  }
  function cssq(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /* ---------------- ADD (paste & save) ---------------- */
  function renderAddPicker() {
    const sel = state.settings.activeLabel ? [state.settings.activeLabel] : [];
    $('#addPicker').innerHTML = pickerHtml(sel);
  }
  bindPicker($('#addPicker'));

  $('#addPaste').addEventListener('click', () => {
    const C = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Clipboard;
    if (C) C.read().then(r => { $('#addText').value = (r && r.value) || ''; }).catch(() => {});
    else if (navigator.clipboard && navigator.clipboard.readText)
      navigator.clipboard.readText().then(v => { $('#addText').value = v || ''; }).catch(() => toast('Could not read clipboard'));
  });

  $('#addSave').addEventListener('click', () => {
    const text = NN.squash($('#addText').value);
    if (!text) { toast('Nothing to save'); return; }
    const { tags, newLabels } = readPicker($('#addPicker'));
    saveNewNote({ text, note: $('#addNote').value.trim(), tags, newLabels }).then(() => {
      $('#addText').value = ''; $('#addNote').value = '';
      renderAddPicker();
      toast('Saved');
      switchTab('lib');
    });
  });

  function saveNewNote(o) {
    const now = Date.now();
    const color = (o.tags && o.tags.length && labelColorOf(o.tags[0])) || state.settings.markColor || 'amber';
    const note = {
      id: NN.uid(), text: o.text, note: o.note || '', tags: o.tags || [],
      color, url: isHttp(o.url) ? NN.normalizeUrl(o.url) : (o.url || ''),
      title: o.title || '', prefix: o.prefix || '', suffix: o.suffix || '',
      createdAt: now, updatedAt: now, deleted: false, srs: NN.freshSrs(now)
    };
    if (isHttp(note.url)) note.fragUrl = NN.buildFragmentUrl(note);
    const after = (o.newLabels && o.newLabels.length)
      ? NN.saveSettings({ labels: NN.withNewLabels(state.settings, o.newLabels) }).then(s => { state.settings = s; })
      : Promise.resolve();
    return after.then(() => NN.putNote(note)).then(() => { state.notes[note.id] = note; renderAll(); autoSync(); return note; });
  }

  /* ---------------- EDITOR ---------------- */
  function openEditor(note) {
    state.editingId = note.id;
    $('#editQuote').textContent = note.text;
    $('#editNote').value = note.note || '';
    $('#editPicker').innerHTML = pickerHtml(note.tags || []);
    const s = note.srs || {};
    $('#editLearn').checked = s.learn !== false;
    $('#editKnown').checked = !!s.known;
    $('#editSheet').hidden = false;
  }
  bindPicker($('#editPicker'));
  $('#editClose').addEventListener('click', () => { $('#editSheet').hidden = true; });
  $('#editSheet').addEventListener('click', e => { if (e.target.id === 'editSheet') $('#editSheet').hidden = true; });

  $('#editSave').addEventListener('click', () => {
    const note = state.notes[state.editingId]; if (!note) return;
    const { tags, newLabels } = readPicker($('#editPicker'));
    const next = Object.assign({}, note, { note: $('#editNote').value.trim(), tags });
    if (tags.length && !note.color) next.color = labelColorOf(tags[0]) || next.color;
    NN.ensureSrs(next); next.srs = Object.assign({}, next.srs);
    if ($('#editKnown').checked) next.srs.known = true;
    else { next.srs.known = false; next.srs.learn = $('#editLearn').checked; }
    if (isHttp(next.url)) next.fragUrl = NN.buildFragmentUrl(next);
    const after = newLabels.length
      ? NN.saveSettings({ labels: NN.withNewLabels(state.settings, newLabels) }).then(s => { state.settings = s; })
      : Promise.resolve();
    after.then(() => NN.putNote(next)).then(() => {
      state.notes[next.id] = next; $('#editSheet').hidden = true; renderAll(); toast('Saved'); autoSync();
      // if we edited the current study card, refresh it in place
      if (state.tab === 'study' && state.study.queue) {
        const idx = state.study.queue.findIndex(x => x.id === next.id);
        if (idx >= 0) {
          state.study.queue[idx] = next;
          if (idx === state.study.i) {
            const wasRevealed = state.study.revealed;
            renderStudyCard();
            if (wasRevealed) $('#studyStage').querySelector('.st-reveal-btn').click();
          }
        }
      }
    });
  });
  $('#editDelete').addEventListener('click', () => {
    const id = state.editingId; if (!id) return;
    if (!confirm('Delete this passage?')) return;
    NN.removeNote(id).then(() => {
      state.notes[id] = { id, deleted: true, updatedAt: Date.now(), url: (state.notes[id] || {}).url || '', createdAt: (state.notes[id] || {}).createdAt || Date.now() };
      $('#editSheet').hidden = true; renderAll(); toast('Deleted'); autoSync();
    });
  });

  /* ---------------- STUDY (SRS) ---------------- */
  function renderDue() {
    const st = NN.studyStats(state.notes);
    const b = $('#tabDue');
    if (st.due > 0) { b.hidden = false; b.textContent = st.due; } else b.hidden = true;
  }
  function buildQueue() {
    const now = Date.now();
    let pool = NN.live(state.notes).filter(n => NN.isDue(n, now));
    pool.sort((a, b) => (a.srs.due || 0) - (b.srs.due || 0));
    return pool;
  }
  function openStudy() {
    state.study = { queue: buildQueue(), i: 0, revealed: false, done: 0 };
    if (!state.study.queue.length) showDone(true); else { $('#studyDone').hidden = true; renderStudyCard(); }
  }
  function showDone(nothing) {
    $('#studyStage').innerHTML = ''; $('#studyDone').hidden = false; $('#studyProgress').textContent = '';
    const st = NN.studyStats(state.notes);
    $('#doneTitle').textContent = nothing && !state.study.done ? 'Nothing due right now' : 'All caught up!';
    $('#doneBody').textContent = (state.study.done ? 'Reviewed ' + state.study.done + ' passages. ' : '') + st.studying + ' in the schedule, ' + st.due + ' due.';
  }
  function renderStudyCard() {
    const n = state.study.queue[state.study.i];
    if (!n) return showDone(false);
    state.study.revealed = false;
    $('#studyProgress').textContent = (state.study.i + 1) + ' / ' + state.study.queue.length;
    const s = n.srs || {};
    const tags = (n.tags || []).map(t => {
      const c = labelColorOf(t);
      return `<span class="st-tag"${c ? ` style="background:var(--${esc(c)});color:#2A2E35"` : ''}>${esc(t)}</span>`;
    }).join('');
    $('#studyStage').innerHTML = `
      <div class="study-card" data-color="${esc(n.color || 'amber')}">
        <div class="st-meta">${esc(NN.hostOf(n.url) || 'note')} · level ${s.box || 0} · reviewed ${s.reps || 0} times</div>
        <blockquote class="st-quote">${esc(n.text)}</blockquote>
        ${tags ? `<div class="st-tags">${tags}</div>` : ''}
        <div class="st-reveal" hidden>
          ${NN.squash(n.note) ? `<p class="st-note">${esc(n.note)}</p>` : '<p class="st-note muted">— no note yet —</p>'}
          ${isHttp(n.url) ? `<a class="st-open" data-open>Open source passage ↗</a>` : ''}
        </div>
        <button class="btn ghost st-reveal-btn" data-st="reveal">Show note</button>
        <div class="st-actions" hidden>
          <button class="btn grade-no" data-st="no">Not yet</button>
          <button class="btn grade-yes" data-st="yes">Got it</button>
        </div>
        <div class="st-side">
          <button class="mact" data-st="edit">Edit</button>
          <button class="mact" data-st="hide">Snooze</button>
          <button class="mact" data-st="known">Mastered</button>
        </div>
      </div>`;
  }
  function advance() {
    state.study.i += 1;
    renderDue();
    if (state.study.i >= state.study.queue.length) showDone(false); else renderStudyCard();
  }
  $('#studyStage').addEventListener('click', e => {
    if (e.target.closest('[data-open]')) { const n = state.study.queue[state.study.i]; openUrl(n.fragUrl || n.url); return; }
    const b = e.target.closest('[data-st]'); if (!b) return;
    const n = state.study.queue[state.study.i]; if (!n) return;
    const act = b.dataset.st;
    if (act === 'edit') { openEditor(n); return; }
    if (act === 'reveal') {
      const card = $('#studyStage').querySelector('.study-card');
      card.querySelector('.st-reveal').hidden = false;
      card.querySelector('.st-reveal-btn').hidden = true;
      card.querySelector('.st-actions').hidden = false;
      state.study.revealed = true;
      return;
    }
    if (act === 'yes' || act === 'no') {
      const next = Object.assign({}, n); NN.grade(next, act === 'yes');
      state.study.done += 1;
      NN.putNote(next).then(() => { state.notes[next.id] = next; autoSync(); });
      advance();
      return;
    }
    if (act === 'hide' || act === 'known') {
      const next = Object.assign({}, n); NN.ensureSrs(next); next.srs = Object.assign({}, next.srs);
      if (act === 'hide') next.srs.learn = false; else next.srs.known = true;
      next.updatedAt = Date.now();
      NN.putNote(next).then(() => { state.notes[next.id] = next; autoSync(); });
      toast(act === 'hide' ? 'Snoozed from study' : 'Marked as mastered');
      advance();
    }
  });

  /* ---------------- SETTINGS ---------------- */
  function swatchRow(sel, id) {
    return `<div class="swatches"${id ? ` id="${id}"` : ''}>` + PALETTE.map(c =>
      `<button type="button" class="sw" data-color="${c}" style="background:var(--${c})" aria-pressed="${sel === c}"></button>`).join('') + '</div>';
  }
  function renderLabelEditor() {
    const labels = state.settings.labels || [], active = state.settings.activeLabel || '';
    $('#labelEditor').innerHTML = labels.length ? labels.map((l, i) => `
      <div class="label-row" data-i="${i}">
        <span class="dot ${esc(l.color)}"></span>
        <input class="rn" type="text" value="${esc(l.name)}" maxlength="40">
        ${swatchRow(l.color)}
        <button class="set-active ${active === l.name ? 'on' : ''}">${active === l.name ? '★' : '☆'}</button>
        <button class="del">🗑</button>
      </div>`).join('') : '<p class="hint">No labels yet.</p>';
    $('#newLabelColors').innerHTML = PALETTE.map((c, i) =>
      `<button type="button" class="sw" data-color="${c}" style="background:var(--${c})" aria-pressed="${i === 0}"></button>`).join('');
    // default label
    $('#activePicker').innerHTML =
      `<button type="button" class="lchip" data-active="" aria-pressed="${!active}">None</button>` +
      labels.map(l => `<button type="button" class="lchip" data-active="${esc(l.name)}" aria-pressed="${active === l.name}">${labelDot(l.color)}${esc(l.name)}</button>`).join('');
  }
  function persistLabels(labels, activeLabel) {
    const patch = { labels }; if (activeLabel !== undefined) patch.activeLabel = activeLabel;
    return NN.saveSettings(patch).then(s => { state.settings = s; renderLabelEditor(); renderAll(); renderAddPicker(); });
  }

  $('#setSheet').addEventListener('click', e => {
    const sw = e.target.closest('.swatches .sw');
    if (sw) sw.parentNode.querySelectorAll('.sw').forEach(x => x.setAttribute('aria-pressed', String(x === sw)));
  });
  $('#labelEditor').addEventListener('click', e => {
    const row = e.target.closest('.label-row'); if (!row) return;
    const i = +row.dataset.i, labels = (state.settings.labels || []).slice(), l = labels[i]; if (!l) return;
    if (e.target.closest('.del')) {
      if (!confirm('Delete the label "' + l.name + '"? Passages carrying it are kept.')) return;
      const removed = l.name; labels.splice(i, 1);
      persistLabels(labels, state.settings.activeLabel === removed ? '' : state.settings.activeLabel); return;
    }
    if (e.target.closest('.set-active')) { persistLabels(labels, state.settings.activeLabel === l.name ? '' : l.name); return; }
    const sw = e.target.closest('.sw');
    if (sw) { labels[i] = { name: l.name, color: sw.dataset.color }; persistLabels(labels); }
  });
  $('#labelEditor').addEventListener('change', e => {
    const inp = e.target.closest('.rn'); if (!inp) return;
    const i = +inp.closest('.label-row').dataset.i, labels = (state.settings.labels || []).slice(), old = labels[i] && labels[i].name;
    const name = NN.squash(inp.value);
    if (!name || !old || name === old) { inp.value = old || ''; return; }
    if (labels.some((x, j) => j !== i && x.name === name)) { alert('A label with this name already exists.'); inp.value = old; return; }
    labels[i] = { name, color: labels[i].color };
    persistLabels(labels, state.settings.activeLabel === old ? name : state.settings.activeLabel);
  });
  $('#newLabelAdd').addEventListener('click', addLabel);
  $('#newLabelName').addEventListener('keydown', e => { if (e.key === 'Enter') addLabel(); });
  function addLabel() {
    const name = NN.squash($('#newLabelName').value); if (!name) return;
    const labels = (state.settings.labels || []).slice();
    if (labels.some(x => x.name === name)) { alert('A label with this name already exists.'); return; }
    const picked = $('#newLabelColors .sw[aria-pressed="true"]');
    labels.push({ name, color: picked ? picked.dataset.color : 'amber' });
    $('#newLabelName').value = ''; persistLabels(labels);
  }
  $('#activePicker').addEventListener('click', e => {
    const b = e.target.closest('[data-active]'); if (!b) return;
    persistLabels(state.settings.labels || [], b.dataset.active || '');
  });

  function openSettings() {
    const s = state.settings;
    $('#syncUrl').value = s.syncUrl || ''; $('#syncKey').value = s.syncKey || '';
    $('#autoSync').checked = s.autoSync !== false;
    renderLabelEditor();
    const all = NN.live(state.notes), st = NN.studyStats(state.notes);
    $('#stat').textContent = all.length + ' passages · ' + st.studying + ' in study · ' + st.due + ' due' + (s.lastSync ? ' · synced ' + when(s.lastSync) + ' ago' : '');
    $('#setMsg').textContent = '';
    $('#setSheet').hidden = false;
  }
  $('#btnSettings').addEventListener('click', openSettings);
  $('#setClose').addEventListener('click', saveSettingsClose);
  $('#setSave').addEventListener('click', saveSettingsClose);
  $('#setSheet').addEventListener('click', e => { if (e.target.id === 'setSheet') saveSettingsClose(); });
  function saveSettingsClose() {
    NN.saveSettings({
      syncUrl: $('#syncUrl').value.trim(), syncKey: $('#syncKey').value.trim(), autoSync: $('#autoSync').checked
    }).then(s => { state.settings = s; $('#setSheet').hidden = true; renderAll(); });
  }

  /* ---------------- SYNC ---------------- */
  function nnPost(url, bodyObj) {
    const body = JSON.stringify(bodyObj);
    const H = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp;
    if (H) {
      return H.request({ url, method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, data: body })
        .then(r => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
    }
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body })
      .then(r => r.text()).then(t => JSON.parse(t));
  }
  let syncing = false;
  function syncNow() {
    const s = state.settings;
    if (!s.syncUrl) { toast('No sync URL configured'); openSettings(); return Promise.resolve(); }
    if (syncing) return Promise.resolve();
    syncing = true;
    toast('Syncing…');
    return NN.getNotes().then(local =>
      nnPost(s.syncUrl, { action: 'sync', key: s.syncKey || '', notes: local }).then(data => {
        if (!data || !data.ok) throw new Error((data && data.error) || 'Server error');
        // Re-read local right before merging so a grade/edit made *during* the
        // slow network round-trip isn't clobbered by the stale snapshot we sent
        // (e.g. a "Got it" bumping level 0→1 would otherwise revert to 0).
        return NN.getNotes().then(freshLocal => {
          const m = NN.merge(freshLocal, data.notes || {});
          return NN.setNotes(m.notes).then(() => NN.saveSettings({ lastSync: Date.now() })).then(() => {
            return load().then(() => toast('Synced · ' + NN.live(m.notes).length + ' passages'));
          });
        });
      })
    ).catch(err => { toast('Sync error: ' + (err.message || err)); }).then(() => { syncing = false; });
  }
  function autoSync() { if (state.settings.autoSync !== false && state.settings.syncUrl) syncNow(); }
  $('#btnSync').addEventListener('click', syncNow);
  $('#syncNow2').addEventListener('click', () => { saveSettingsClose(); setTimeout(syncNow, 50); });

  /* ---------------- FIND & MERGE DUPLICATES ---------------- */
  $('#btnDedup').addEventListener('click', () => {
    const groups = NN.duplicateGroups(state.notes);
    if (!groups.length) { $('#dedupMsg').textContent = 'No duplicates found — nothing to merge.'; return; }
    const extra = groups.reduce((a, g) => a + (g.length - 1), 0);
    if (!confirm('Found ' + groups.length + ' passage(s) saved more than once (' + extra + ' extra copies). '
      + 'Merge each into a single card? Labels, notes and the best study progress are kept.')) return;
    const res = NN.mergeDuplicates(state.notes);
    NN.setNotes(res.notes)
      .then(() => load())
      .then(() => {
        $('#dedupMsg').textContent = 'Merged ' + res.groups + ' group(s), removed ' + res.removed + ' duplicate(s).';
        toast('Merged ' + res.removed + ' duplicate passage(s)');
        autoSync();
      });
  });

  /* ---------------- BACKUP / IMPORT ---------------- */
  $('#btnBackup').addEventListener('click', () => {
    NN.getNotes().then(notes => {
      const data = JSON.stringify({ app: 'neuron-note', version: 1, exportedAt: Date.now(), notes }, null, 2);
      const a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
      a.download = 'neuron-note-backup.json'; a.click();
      toast('Backup created');
    });
  });
  $('#btnRestore').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result), incoming = data.notes || data;
        NN.getNotes().then(local => {
          const m = NN.merge(local, incoming);
          NN.setNotes(m.notes).then(() => load()).then(() => toast('Imported ' + m.added + ' new passages'));
        });
      } catch (err) { toast('Could not read the file'); }
      e.target.value = '';
    };
    r.readAsText(f);
  });

  /* ---------------- RECEIVE SYSTEM TEXT (ACTION_PROCESS_TEXT / SEND) ---------------- */
  function checkIncoming() {
    const p = (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Preferences);
    const readKey = () => p ? p.get({ key: 'incomingText' }) : Promise.resolve({ value: (function () { try { return localStorage.getItem('incomingText'); } catch (e) { return null; } })() });
    const removeKey = () => p ? p.remove({ key: 'incomingText' }) : Promise.resolve((function () { try { localStorage.removeItem('incomingText'); } catch (e) {} })());
    return readKey().then(r => {
      const raw = r && r.value; if (!raw) return;
      let obj; try { obj = JSON.parse(raw); } catch (e) { obj = { text: raw, ts: Date.now() }; }
      return removeKey().then(() => {
        if (!obj || !obj.text) return;
        if (obj.ts && Date.now() - obj.ts > 60000) return; // too old, skip
        const text = NN.squash(obj.text); if (!text) return;
        const active = state.settings.activeLabel || '';
        saveNewNote({ text, tags: active ? [active] : [], url: isHttp(obj.text) ? obj.text : '' })
          .then(() => { toast('Saved to Neuron Note' + (active ? ' · #' + active : '')); switchTab('lib'); });
      });
    }).catch(() => {});
  }
  window.addEventListener('nn-incoming-text', checkIncoming);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkIncoming(); });
  if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) {
    Capacitor.Plugins.App.addListener('resume', checkIncoming);
    Capacitor.Plugins.App.addListener('appStateChange', st => { if (st && st.isActive) checkIncoming(); });
  }

  /* ---------------- TABS ---------------- */
  function switchTab(tab) {
    state.tab = tab;
    $$('.screen').forEach(s => { s.hidden = s.id !== 'scr-' + tab; });
    $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    if (tab === 'study') openStudy();
    if (tab === 'add') renderAddPicker();
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  /* ---------------- ANDROID HARDWARE / GESTURE BACK ---------------- */
  // Give the physical + edge-swipe "back" a predictable stack: close an open sheet,
  // then fall back to the library tab, and only leave the app from there. Without a
  // listener Android's back — especially the gesture-navigation edge swipe — has no
  // history to pop and drops straight out of the app.
  const AppPlugin = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
  if (AppPlugin) {
    AppPlugin.addListener('backButton', () => {
      // 1) A modal sheet is open → close it (same as tapping its ✕ / the backdrop).
      if (!$('#setSheet').hidden) { saveSettingsClose(); return; }
      if (!$('#editSheet').hidden) { $('#editSheet').hidden = true; return; }
      // 2) Not on the main library screen → go back to it instead of exiting.
      if (state.tab !== 'lib') { switchTab('lib'); return; }
      // 3) Already at the top of the app → let back leave the app.
      AppPlugin.exitApp();
    });
  }

  /* ---------------- STARTUP ---------------- */
  load().then(() => { checkIncoming(); });

  // expose for tests
  window.__NN_APP__ = { state, load, saveNewNote, switchTab, checkIncoming, syncNow, openStudy, mobileFragUrl };
})();
