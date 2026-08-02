/* Neuron Note — shared helpers (used by background + all pages) */
(function (root) {
  'use strict';

  const NN = {};

  /* ---------- constants ---------- */
  NN.DEFAULT_SETTINGS = {
    syncUrl: '',
    syncKey: '',
    autoSync: true,
    autoHighlight: true,
    markColor: 'amber',
    labels: [],          // predefined labels: [{ name, color }]
    activeLabel: ''       // default label for the shortcut / quick-save button
  };
  NN.COLORS = ['amber', 'mint', 'sky', 'rose', 'lilac'];
  NN.COLOR_LABEL = {
    amber: 'Amber', mint: 'Mint', sky: 'Sky', rose: 'Rose', lilac: 'Lilac'
  };
  NN.TOMBSTONE_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

  /* ---------- spaced repetition (SRS) ---------- */
  // levels 0..7; wait days per level. Level 0 = new, never reviewed.
  NN.SRS_INTERVALS = [1, 1, 3, 7, 14, 30, 60, 120]; // days
  NN.DAY = 24 * 60 * 60 * 1000;

  /** Default study state attached to a note when needed. */
  NN.freshSrs = function (now) {
    now = now || Date.now();
    return { box: 0, due: now, reps: 0, lapses: 0, last: 0, learn: true, known: false };
  };

  /** Ensure a note has a valid .srs block (patch old notes). Returns the note. */
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

  /** Is this note in the study schedule (learning on, not mastered, not deleted). */
  NN.inStudy = function (note) {
    if (!note || note.deleted || !note.text) return false;
    const s = note.srs || {};
    return s.learn !== false && s.known !== true;
  };

  /** Is it due for review. */
  NN.isDue = function (note, now) {
    if (!NN.inStudy(note)) return false;
    NN.ensureSrs(note);
    return (note.srs.due || 0) <= (now || Date.now());
  };

  /** Grade one review. ok: true = Got it (level up), false = Not yet (back to level 1). */
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
      s.box = 1; // back to the shortest interval, review again after 1 day
    }
    const days = NN.SRS_INTERVALS[s.box] || 1;
    s.due = now + days * NN.DAY;
    note.updatedAt = now;
    return note;
  };

  /** Count notes that are due / total in study. */
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

  /* ---------- utilities ---------- */
  NN.uid = function () {
    return 'nn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  };

  NN.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // Collapse every Unicode whitespace run — including the ideographic space (U+3000,
  // common in Japanese text) and the zero-width space (U+200B) — to one plain space.
  // Must match content.js squash()/makeIndex() so saved text and the on-page text
  // index normalize identically (otherwise CJK passages fail to re-highlight).
  NN.squash = function (s) {
    return String(s || '').replace(/[\s\u200b]+/g, ' ').trim();
  };

  const TRACKERS = /^(utm_|fbclid$|gclid$|mc_eid$|mc_cid$|igshid$|ref_src$|s_cid$|yclid$|_hs)/i;

  /** Strip hash + tracking params so the same page always yields one key. */
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

  /** Color of a predefined label; empty if none. */
  NN.labelColor = function (settings, name) {
    if (!name) return '';
    const l = (settings && settings.labels || []).find(x => x.name === name);
    return l ? l.color : '';
  };

  /** Suggested color for a new label, cycling through the palette. */
  NN.nextLabelColor = function (settings) {
    const n = (settings && settings.labels || []).length;
    return NN.COLORS[n % NN.COLORS.length];
  };

  /** Add label names not yet present to settings.labels (keep existing ones). Returns the new labels array. */
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
   * Build the return link: <url>#nn=<id>:~:text=[prefix-,]start[,end][,-suffix]
   * The browser scrolls to that passage; the #nn=<id> part tells the extension which note to flash.
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

  /* ---------- data store ---------- */
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

  /** Write/overwrite a note and stamp the time. */
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

  /** List of live notes, newest first. */
  NN.live = function (notes) {
    return Object.values(notes || {})
      .filter(n => n && !n.deleted && n.text)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  };

  /* ---------- sync merge: newer wins ---------- */
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
    // clean up expired tombstones
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
