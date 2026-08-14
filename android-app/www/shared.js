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

  NN.squash = function (s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
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

  /* ---------- data store (Android: Capacitor Preferences, fallback localStorage) ---------- */
  const STORE_KEY = 'nn';

  function prefs() {
    return (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Preferences) || null;
  }
  function rawGet() {
    const p = prefs();
    if (p) {
      return p.get({ key: STORE_KEY }).then(r => {
        try { return r && r.value ? JSON.parse(r.value) : {}; } catch (e) { return {}; }
      });
    }
    return new Promise(resolve => {
      let v = null;
      try { v = localStorage.getItem(STORE_KEY); } catch (e) {}
      try { resolve(v ? JSON.parse(v) : {}); } catch (e) { resolve({}); }
    });
  }
  function rawSet(obj) {
    const s = JSON.stringify(obj);
    const p = prefs();
    if (p) return p.set({ key: STORE_KEY, value: s });
    return new Promise(resolve => { try { localStorage.setItem(STORE_KEY, s); } catch (e) {} resolve(); });
  }

  NN.getAll = function () {
    return rawGet().then(data => ({
      notes: (data && data.notes) || {},
      settings: Object.assign({}, NN.DEFAULT_SETTINGS, (data && data.settings) || {}),
      progress: (data && data.progress) || null
    }));
  };

  NN.getNotes = function () { return NN.getAll().then(r => r.notes); };
  NN.getSettings = function () { return NN.getAll().then(r => r.settings); };

  // Everything shares one blob under a single key, so each writer has to carry
  // the other fields through untouched — otherwise saving a note would quietly
  // wipe the progress record, and vice versa.
  NN.setNotes = function (notes) {
    return NN.getAll().then(all =>
      rawSet({ notes, settings: all.settings, progress: all.progress }).then(() => notes));
  };

  NN.saveSettings = function (patch) {
    return NN.getAll().then(all => {
      const next = Object.assign({}, all.settings, patch);
      return rawSet({ notes: all.notes, settings: next, progress: all.progress }).then(() => next);
    });
  };

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
        id, deleted: true, updatedAt: Date.now(),
        url: cur ? cur.url : '', createdAt: cur ? cur.createdAt : Date.now()
      };
      return NN.setNotes(notes);
    });
  };


  NN.getProgress = function () {
    return rawGet().then(function (data) { return (data && data.progress) || null; });
  };
  NN.setProgress = function (d) {
    return rawGet().then(function (data) {
      return rawSet({
        notes: (data && data.notes) || {},
        settings: (data && data.settings) || {},
        progress: d
      });
    });
  };


  /* ---------- progress tracking (model & rendering live in progress.js) ----------
     Stored apart from the notes: it is a single small record that changes on a
     different rhythm (once per graded card) and merges by a different rule
     (larger count wins, not newer timestamp). Folding it into the notes map
     would put it through the notes' newest-wins merge and lose reviews. */

  /** Read-modify-write the progress record in one hop. */
  NN.updateProgress = function (fn) {
    return NN.getProgress().then(function (cur) {
      var next = fn(cur) || cur;
      return NN.setProgress(next).then(function () { return next; });
    });
  };

  /** Today's bucket in the log, created on demand. */
  function todayBucket(d) {
    var iso = NN.pDay();
    if (!d.log[iso]) d.log[iso] = { r: 0, y: 0, n: 0, s: 0, dawn: 0, night: 0 };
    return d.log[iso];
  }

  /**
   * Record one graded review.
   *
   * Both answers count. Grading "not yet" costs the same effort as grading
   * "got it", and only counting the wins would quietly push people to mark
   * things known that they do not know.
   *
   * @returns {Promise<string[]>} ids of badges unlocked by this review
   */
  NN.recordReview = function (ok, stats) {
    return NN.updateProgress(function (cur) {
      var d = NN.normalizeProgress(cur);
      var t = todayBucket(d);
      t.r += 1;
      if (ok) t.y += 1; else t.n += 1;
      var hour = new Date().getHours();
      if (hour < 6) t.dawn = 1;
      if (hour >= 23) t.night = 1;
      return d;
    }).then(function () { return NN.checkBadges(stats); });
  };

  /** Record newly saved passages (only brand-new ones, not re-saves). */
  NN.recordSaved = function (count, stats) {
    return NN.updateProgress(function (cur) {
      var d = NN.normalizeProgress(cur);
      todayBucket(d).s += (count || 1);
      return d;
    }).then(function () { return NN.checkBadges(stats); });
  };

  /**
   * Re-evaluate every badge and store the ones just unlocked.
   * Worth calling on start-up too: some milestones depend only on how many
   * passages are in the notebook, which can grow from another device.
   */
  NN.checkBadges = function (stats) {
    return Promise.all([NN.getProgress(), stats ? stats() : {}]).then(function (r) {
      var d = NN.normalizeProgress(r[0]);
      var view = NN.progressOverview(d, r[1] || {});
      var fresh = NN.newlyEarnedBadges(view, d.badges, NN.pDay());
      var ids = Object.keys(fresh);
      if (!ids.length) return [];
      Object.keys(fresh).forEach(function (id) { d.badges[id] = fresh[id]; });
      return NN.setProgress(d).then(function () { return ids; });
    });
  };

  /** The numbers the badges need that only the notes themselves can answer. */
  NN.noteStats = function (notes) {
    var live = NN.live(notes);
    var now = Date.now();
    var out = { total: live.length, longTerm: 0, annotated: 0, due: 0, studying: 0 };
    var labels = {}, sites = {};
    live.forEach(function (n) {
      var s = n.srs || {};
      // Box 4 is the 14-day interval — the point where a passage has plausibly
      // moved into long-term memory rather than being freshly crammed.
      if ((s.box || 0) >= 4) out.longTerm += 1;
      if (n.note && String(n.note).trim()) out.annotated += 1;
      if (NN.inStudy(n)) out.studying += 1;
      if (NN.isDue(n, now)) out.due += 1;
      (n.tags || []).forEach(function (t) { labels[t] = 1; });
      var h = NN.hostOf(n.url);
      if (h) sites[h] = 1;
    });
    out.labels = Object.keys(labels).length;
    out.sources = Object.keys(sites).length;
    return out;
  };

  NN.live = function (notes) {
    return Object.values(notes || {})
      .filter(n => n && !n.deleted && n.text)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  };

  /* ---------- duplicate detection & merge ---------- */
  // Two live notes are duplicates when they point at the same page and their
  // (normalized) text is identical — i.e. the same passage saved more than once.
  NN.dupKey = function (n) {
    var t = NN.squash(n.text).toLowerCase();
    if (!t) return '';
    return NN.normalizeUrl(n.url) + ' ' + t;
  };

  /** Groups of live notes that are duplicates of each other (each group length >= 2). */
  NN.duplicateGroups = function (notes) {
    var byKey = {};
    NN.live(notes).forEach(function (n) {
      var k = NN.dupKey(n);
      if (!k) return;
      (byKey[k] = byKey[k] || []).push(n);
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; }).filter(function (g) { return g.length > 1; });
  };

  /**
   * Merge duplicate passages. For each group: keep the earliest-created note as the
   * canonical one, union its labels, combine distinct notes, keep the most-advanced
   * study level with the soonest due date, and bias toward staying in study. The
   * other copies become tombstones so the deletion syncs. Returns { notes, groups, removed }.
   */
  NN.mergeDuplicates = function (notes) {
    var out = Object.assign({}, notes);
    var groups = NN.duplicateGroups(notes);
    var removed = 0;
    var now = Date.now();

    groups.forEach(function (group) {
      var sorted = group.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      var keep = Object.assign({}, sorted[0]);
      NN.ensureSrs(keep);
      keep.srs = Object.assign({}, keep.srs);

      var tags = {};
      (keep.tags || []).forEach(function (t) { tags[t] = 1; });
      var noteParts = [];
      if (NN.squash(keep.note)) noteParts.push(keep.note.trim());
      var anyActive = NN.inStudy(keep);

      sorted.slice(1).forEach(function (dup) {
        (dup.tags || []).forEach(function (t) { tags[t] = 1; });
        var dn = (dup.note || '').trim();
        if (dn && noteParts.indexOf(dn) === -1) noteParts.push(dn);
        NN.ensureSrs(dup);
        if ((dup.srs.box || 0) > (keep.srs.box || 0)) keep.srs.box = dup.srs.box;
        keep.srs.reps = Math.max(keep.srs.reps || 0, dup.srs.reps || 0);
        keep.srs.lapses = (keep.srs.lapses || 0) + (dup.srs.lapses || 0);
        keep.srs.due = Math.min(keep.srs.due || now, dup.srs.due || now);
        if (NN.inStudy(dup)) anyActive = true;
        out[dup.id] = { id: dup.id, deleted: true, updatedAt: now, url: dup.url || '', createdAt: dup.createdAt || now };
        removed++;
      });

      if (anyActive) { keep.srs.known = false; keep.srs.learn = true; }
      keep.tags = Object.keys(tags);
      if (noteParts.length) keep.note = noteParts.join('\n\n');
      keep.updatedAt = now;
      // text is identical across duplicates, so the canonical note's fragUrl already matches.
      out[keep.id] = keep;
    });

    return { notes: out, groups: groups.length, removed: removed };
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
