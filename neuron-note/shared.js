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


  /* ================= math (LaTeX) =================
     Two jobs live here:
       1. Text copied out of a PDF or a rendered page arrives as Unicode glyphs
          ("x² + √2 ≤ ∞"). unicodeToLatex() turns those back into LaTeX.
       2. Text captured from KaTeX/MathJax already carries real LaTeX (content.js
          reads it out of <annotation encoding="application/x-tex">), so it only
          needs the segment markers.
     Formulas are stored inline in the note text as $…$ (inline) or $$…$$ (block),
     which is what the renderer looks for. */

  // Characters that survive a copy but are not what the author typed.
  const TEXT_ARTIFACTS = [
    [/\u00ad/g, ''],            // soft hyphen — PDF line-break leftovers
    [/\ufeff/g, ''],            // zero-width no-break space
    [/\u00a0/g, ' '],           // non-breaking space
    [/\ufb01/g, 'fi'], [/\ufb02/g, 'fl'],   // ligatures PDFs love
    [/\ufb00/g, 'ff'], [/\ufb03/g, 'ffi'], [/\ufb04/g, 'ffl']
  ];

  /** Cleanup that is safe on ANY text, math or prose. */
  NN.fixCopyArtifacts = function (s) {
    let out = String(s || '');
    TEXT_ARTIFACTS.forEach(p => { out = out.replace(p[0], p[1]); });
    return out;
  };

  const SUP = { '\u2070':'0','\u00b9':'1','\u00b2':'2','\u00b3':'3','\u2074':'4','\u2075':'5',
    '\u2076':'6','\u2077':'7','\u2078':'8','\u2079':'9','\u207a':'+','\u207b':'-','\u207c':'=',
    '\u207d':'(','\u207e':')','\u207f':'n','\u2071':'i' };
  const SUB = { '\u2080':'0','\u2081':'1','\u2082':'2','\u2083':'3','\u2084':'4','\u2085':'5',
    '\u2086':'6','\u2087':'7','\u2088':'8','\u2089':'9','\u208a':'+','\u208b':'-','\u208c':'=',
    '\u208d':'(','\u208e':')','\u2090':'a','\u2091':'e','\u2092':'o','\u2093':'x','\u2095':'h',
    '\u2096':'k','\u2097':'l','\u2098':'m','\u2099':'n','\u209a':'p','\u209b':'s','\u209c':'t' };

  const GREEK = {
    '\u03b1':'\\alpha','\u03b2':'\\beta','\u03b3':'\\gamma','\u03b4':'\\delta','\u03b5':'\\varepsilon',
    '\u03b6':'\\zeta','\u03b7':'\\eta','\u03b8':'\\theta','\u03b9':'\\iota','\u03ba':'\\kappa',
    '\u03bb':'\\lambda','\u03bc':'\\mu','\u03bd':'\\nu','\u03be':'\\xi','\u03c0':'\\pi',
    '\u03c1':'\\rho','\u03c3':'\\sigma','\u03c2':'\\varsigma','\u03c4':'\\tau','\u03c5':'\\upsilon',
    '\u03c6':'\\varphi','\u03c7':'\\chi','\u03c8':'\\psi','\u03c9':'\\omega',
    '\u0393':'\\Gamma','\u0394':'\\Delta','\u0398':'\\Theta','\u039b':'\\Lambda','\u039e':'\\Xi',
    '\u03a0':'\\Pi','\u03a3':'\\Sigma','\u03a5':'\\Upsilon','\u03a6':'\\Phi','\u03a8':'\\Psi','\u03a9':'\\Omega'
  };

  const SYMBOL = {
    '\u2212':'-','\u2013':'-','\u00d7':'\\times','\u00f7':'\\div','\u00b1':'\\pm','\u2213':'\\mp',
    '\u2264':'\\leq','\u2265':'\\geq','\u2260':'\\neq','\u2248':'\\approx','\u2261':'\\equiv',
    '\u221d':'\\propto','\u223c':'\\sim','\u2245':'\\cong',
    '\u221e':'\\infty','\u222b':'\\int','\u222c':'\\iint','\u222d':'\\iiint','\u222e':'\\oint',
    '\u2211':'\\sum','\u220f':'\\prod','\u221a':'\\sqrt','\u2202':'\\partial','\u2207':'\\nabla',
    '\u2208':'\\in','\u2209':'\\notin','\u220b':'\\ni','\u2282':'\\subset','\u2283':'\\supset',
    '\u2286':'\\subseteq','\u2287':'\\supseteq','\u222a':'\\cup','\u2229':'\\cap',
    '\u2205':'\\emptyset','\u2200':'\\forall','\u2203':'\\exists','\u2204':'\\nexists',
    '\u00ac':'\\neg','\u2227':'\\wedge','\u2228':'\\vee',
    '\u2192':'\\to','\u2190':'\\leftarrow','\u2194':'\\leftrightarrow',
    '\u21d2':'\\Rightarrow','\u21d0':'\\Leftarrow','\u21d4':'\\iff','\u21a6':'\\mapsto',
    '\u22c5':'\\cdot','\u2218':'\\circ','\u2295':'\\oplus','\u2297':'\\otimes',
    '\u2220':'\\angle','\u22a5':'\\perp','\u2225':'\\parallel','\u00b0':'^{\\circ}',
    '\u2026':'\\dots','\u22ef':'\\cdots','\u22ee':'\\vdots','\u22f1':'\\ddots',
    '\u211d':'\\mathbb{R}','\u2115':'\\mathbb{N}','\u2124':'\\mathbb{Z}','\u211a':'\\mathbb{Q}',
    '\u2102':'\\mathbb{C}','\u2135':'\\aleph','\u2113':'\\ell','\u210f':'\\hbar'
  };

  /** Collapse a run of Unicode super/subscripts into ^{…} / _{…}. */
  function foldScripts(s) {
    return s
      .replace(/[\u2070\u00b9\u00b2\u00b3\u2074-\u207f\u2071]+/g, run => {
        const t = run.split('').map(c => SUP[c] || '').join('');
        return t ? (t.length === 1 ? '^' + t : '^{' + t + '}') : '';
      })
      .replace(/[\u2080-\u208e\u2090-\u209c]+/g, run => {
        const t = run.split('').map(c => SUB[c] || '').join('');
        return t ? (t.length === 1 ? '_' + t : '_{' + t + '}') : '';
      });
  }

  /** Convert a string that IS math into LaTeX source. */
  NN.unicodeToLatex = function (s) {
    let out = NN.fixCopyArtifacts(s);
    out = foldScripts(out);
    out = out.replace(/[\u0370-\u03ff]/g, c => GREEK[c] || c);
    out = out.replace(/[\u2013\u2212\u00d7\u00f7\u00b1\u2213\u2264\u2265\u2260\u2248\u2261\u221d\u223c\u2245\u221e\u222b-\u222e\u2211\u220f\u221a\u2202\u2207\u2208\u2209\u220b\u2282\u2283\u2286\u2287\u222a\u2229\u2205\u2200\u2203\u2204\u00ac\u2227\u2228\u2192\u2190\u2194\u21d2\u21d0\u21d4\u21a6\u22c5\u2218\u2295\u2297\u2220\u22a5\u2225\u00b0\u2026\u22ef\u22ee\u22f1\u211d\u2115\u2124\u211a\u2102\u2135\u2113\u210f]/g,
      c => {
        const tex = SYMBOL[c];
        if (!tex) return c;
        // a control word needs a break before a following letter: \alpha x, not \alphax
        return /^\\[a-zA-Z]+$/.test(tex) ? tex + ' ' : tex;
      });
    // √x with no braces is not valid LaTeX — \sqrt needs an argument
    out = out.replace(/\\sqrt\s*\{/g, '\\sqrt{')
             .replace(/\\sqrt\s+([A-Za-z0-9])/g, '\\sqrt{$1}');
    // a script binds tight: \int_0, never \int _0
    out = out.replace(/\\([a-zA-Z]+)[ \t]+(?=[_^])/g, '\\$1');
    return out.replace(/[ \t]+/g, ' ').trim();
  };

  // A character that only ever shows up in mathematics.
  const MATH_SIGNAL = /[\u2070\u00b9\u00b2\u00b3\u2074-\u207f\u2080-\u209c\u0370-\u03ff\u2212\u00d7\u00f7\u00b1\u2264\u2265\u2260\u2248\u2261\u221e\u222b\u2211\u220f\u221a\u2202\u2207\u2208\u2282\u222a\u2229\u2200\u2203\u2192\u21d2\u22c5\u211d\u2115\u2124\u211a\u2102]/;

  /** Is this string already carrying LaTeX segment markers? */
  NN.hasMath = function (s) { return /\$\$?[^$]+\$\$?/.test(String(s || '')); };

  /**
   * Best-effort: find formula-looking runs in loose text (a PDF paste) and turn
   * them into $…$ LaTeX. Text already containing $…$ is left alone so running
   * this twice is harmless. Deliberately conservative — a run must hold a
   * character that has no meaning outside mathematics.
   */
  // A token made only of symbols/digits (no letters at all) — the glue between
  // formula pieces, e.g. the "+" and "=" in "x\u00b2 + y\u00b2 = z\u00b2".
  function isGlue(tok) { return !/[A-Za-z\u00c0-\u024f\u1e00-\u1eff\u0370-\u03ff\u3000-\u9fff]/.test(tok); }

  /**
   * Wrap the formula-looking tokens of one chunk, leaving prose alone. Works token
   * by token (never across a whole sentence) and then grows each hit outward over
   * neighbouring glue tokens so "x\u00b2 + y\u00b2" comes out as one formula.
   */
  function mathifyChunk(chunk) {
    const toks = chunk.split(/([ \t]+)/);          // keeps the separators
    const isTok = i => i % 2 === 0;
    const sig = toks.map((t, i) => isTok(i) && MATH_SIGNAL.test(t));
    if (!sig.some(Boolean)) return chunk;

    const take = toks.map(() => false);
    for (let i = 0; i < toks.length; i++) {
      if (!sig[i]) continue;
      take[i] = true;
      for (let j = i - 2; j >= 0 && isGlue(toks[j]); j -= 2) { take[j] = true; take[j + 1] = true; }
      for (let j = i + 2; j < toks.length && isGlue(toks[j]); j += 2) { take[j] = true; take[j - 1] = true; }
    }
    // stitch the marked tokens back together, one $…$ per contiguous run
    let out = '', run = '';
    const flush = () => {
      if (!run) return;
      const m = run.match(/^([\s\S]*?)([.,;:!?)\]]*)$/);
      const core = (m[1] || '').trim(), tail = m[2] || '';
      out += core && MATH_SIGNAL.test(core) ? '$' + NN.unicodeToLatex(core) + '$' + tail : run;
      run = '';
    };
    for (let i = 0; i < toks.length; i++) {
      if (take[i]) run += toks[i];
      else { flush(); out += toks[i]; }
    }
    flush();
    return out;
  }

  NN.autoMath = function (s) {
    const src = NN.fixCopyArtifacts(s);
    if (!src) return '';
    // split on existing $…$ so we never touch what is already marked up
    const parts = src.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/);
    return parts.map(part => {
      if (!part || /^\$/.test(part)) return part;
      return part.replace(/\S+(?:[ \t]+\S+)*/g, chunk => mathifyChunk(chunk));
    }).join('');
  };

  /**
   * Bring loose LaTeX to the standard form KaTeX accepts. PDFs and chat exports
   * are full of near-miss source: \(…\) and \[…\] delimiters, environments with
   * no delimiters at all, backslashes doubled by a JSON round-trip, and dollar
   * signs that a copy step turned into \$. Everything here is idempotent.
   */
  NN.repairLatex = function (s) {
    let out = NN.fixCopyArtifacts(s);
    // \$ that meant a literal delimiter, not an escaped dollar
    out = out.replace(/\\\$/g, '$');
    // a JSON/markdown round-trip doubles every control sequence
    out = out.replace(/\\\\([a-zA-Z]{2,})/g, '\\$1');
    // \(inline\) and \[display\] → $…$ / $$…$$
    out = out.replace(/\\\(([\s\S]*?)\\\)/g, (m, g) => '$' + g.trim() + '$');
    out = out.replace(/\\\[([\s\S]*?)\\\]/g, (m, g) => '$$' + g.trim() + '$$');
    // a bare environment is display math even without delimiters
    out = out.replace(/(^|[^$])(\\begin\{(align|equation|gather|aligned|cases|array|matrix|[bpvBV]matrix)\*?\}[\s\S]*?\\end\{\3\*?\})/g,
      (m, pre, env) => pre + '$$' + env + '$$');
    // "$ x^2 $" → "$x^2$" so the delimiters hug the formula
    out = out.replace(/\$\$\s+([\s\S]*?)\s+\$\$/g, '$$$$$1$$$$');
    out = out.replace(/\$[ \t]+([^$\n]*?)[ \t]+\$/g, '$$$1$$');
    return out;
  };

  // Delimiters recognised when splitting: $$…$$, $…$, \[…\], \(…\), and bare
  // environments. Kept in one place so repairLatex and splitMath agree.
  const MATH_SPAN = new RegExp(
    '\\$\\$([\\s\\S]+?)\\$\\$' +                       // $$ … $$
    '|\\\\\\[([\\s\\S]+?)\\\\\\]' +                    // \[ … \]
    '|\\\\\\(([\\s\\S]+?)\\\\\\)' +                    // \( … \)
    '|\\\\begin\\{([a-zA-Z]+\\*?)\\}([\\s\\S]+?)\\\\end\\{\\4\\}' +  // \begin{env} … \end{env}
    '|\\$([^$\\n]+?)\\$',                              // $ … $
    'g');

  /**
   * Split note text into renderable pieces: {type:'text'|'math', value, display}.
   * The renderer walks this; nothing here touches the DOM so it stays testable.
   */
  NN.splitMath = function (s) {
    const out = [];
    const src = String(s || '');
    MATH_SPAN.lastIndex = 0;
    let last = 0, m;
    while ((m = MATH_SPAN.exec(src))) {
      if (m.index > last) out.push({ type: 'text', value: src.slice(last, m.index) });
      let value, display;
      if (m[1] != null) { value = m[1]; display = true; }            // $$
      else if (m[2] != null) { value = m[2]; display = true; }       // \[
      else if (m[3] != null) { value = m[3]; display = false; }      // \(
      else if (m[5] != null) { value = m[0]; display = true; }       // whole environment
      else { value = m[6]; display = false; }                        // $
      out.push({ type: 'math', value: String(value).trim(), display });
      last = m.index + m[0].length;
    }
    if (last < src.length) out.push({ type: 'text', value: src.slice(last) });
    return out;
  };

  /**
   * The one call the UI makes: take whatever was highlighted — rendered math,
   * raw LaTeX from a PDF, or Unicode glyphs — and return text whose formulas are
   * standard LaTeX between $…$. Safe to run repeatedly.
   */
  NN.toStandardMath = function (s) {
    const repaired = NN.repairLatex(s);
    // Unicode glyphs only get converted where no delimiters exist yet
    return NN.hasMath(repaired) ? repaired : NN.autoMath(repaired);
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
  /**
   * Every label worth offering in a picker, in the order a picker should show them.
   *
   * The library filter row has always listed predefined labels PLUS ad-hoc ones
   * already in use; the pickers only listed predefined ones plus whatever this
   * one note carried. So a label you had typed onto some other passage was not
   * offered anywhere — you had to retype it by hand, and a typo quietly made a
   * second label. Both places read this now, so they cannot drift apart again.
   *
   * @param {string[]} [selected] labels ticked right now (may include ones used nowhere else).
   * @returns {{name: string, color: string, on: boolean}[]}
   */
  /**
   * Đoạn văn đem ra hiển thị: bản LaTeX khi trang gốc có công thức, không thì
   * bản chữ thường. Một định nghĩa duy nhất cho cả extension lẫn app.
   */
  NN.bodyOf = function (n) { return (n && (n.rich || n.text)) || ''; };

  /**
   * Áp một đoạn văn vừa được sửa tay lên ghi chú.
   *
   * Đoạn văn chép về vốn không sửa được: chép hụt mất nửa câu, hay dính thêm
   * dòng quảng cáo, thì chỉ còn nước xoá đi chép lại — mà chép lại là mất sạch
   * nhãn, ghi chú riêng và tiến độ ôn của mục đó.
   *
   * Người ta sửa đúng cái đang NHÌN THẤY, tức là bản LaTeX nếu có. Nên chuỗi
   * vừa sửa vào thẳng `text`, và chỉ giữ lại `rich` khi trong đó thật sự còn
   * công thức — sửa hết công thức đi thì `rich` không còn lý do tồn tại.
   *
   * Hàm thuần: trả về bản mới, không đụng vào bản cũ.
   * @returns {{note: object, changed: boolean}}
   */
  NN.applyBodyEdit = function (note, raw) {
    const body = String(raw == null ? '' : raw).trim();
    // Rỗng thì bỏ qua: xoá trắng đoạn văn là xoá ghi chú, mà xoá thì có nút xoá.
    if (!body || body === NN.bodyOf(note)) return { note: note, changed: false };
    const next = Object.assign({}, note, { text: body });
    if (NN.hasMath(body)) next.rich = body;
    else delete next.rich;
    return { note: next, changed: true };
  };

  NN.labelChoices = function (settings, notes, selected) {
    const on = new Set(selected || []);
    const defined = (settings && settings.labels) || [];
    const seen = new Set();
    const out = [];
    defined.forEach(function (l) {
      if (!l || !l.name || seen.has(l.name)) return;
      seen.add(l.name);
      out.push({ name: l.name, color: l.color || '', on: on.has(l.name) });
    });
    const adhoc = {};
    NN.live(notes || {}).forEach(function (n) {
      (n.tags || []).forEach(function (t) { if (t && !seen.has(t)) adhoc[t] = 1; });
    });
    (selected || []).forEach(function (t) { if (t && !seen.has(t)) adhoc[t] = 1; });
    Object.keys(adhoc).sort().forEach(function (t) {
      out.push({ name: t, color: '', on: on.has(t) });
    });
    return out;
  };

  /**
   * Rename a label on every passage that carries it.
   *
   * Renaming used to touch only settings.labels, so each passage kept the OLD
   * name: the renamed label showed 0 passages, and every passage that had it
   * turned into a colourless ad-hoc tag. Pure function — the caller writes.
   * `updatedAt` moves so the rename travels through sync like any other edit.
   */
  NN.renameTag = function (notes, old, name) {
    const out = {};
    const now = Date.now();
    let changed = 0;
    Object.keys(notes || {}).forEach(function (id) {
      const n = notes[id];
      if (!n || n.deleted || !(n.tags || []).includes(old)) { out[id] = n; return; }
      const tags = n.tags.map(function (t) { return t === old ? name : t; })
        .filter(function (t, i, a) { return a.indexOf(t) === i; });   // gộp nếu trùng tên có sẵn
      out[id] = Object.assign({}, n, { tags: tags, updatedAt: now });
      changed++;
    });
    return { notes: out, changed: changed };
  };

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

  /* ---------- one writer at a time ----------
     Every write below is a read-modify-write of the whole store: read the map,
     change one entry, write the map back. Fire two of those at once — which is
     exactly what grading three cards in two seconds does — and the second read
     happens before the first write lands, so the second write puts back a map
     that still holds the OLD version of the first note. The grade is silently
     gone, and it only becomes visible seconds later when the next sync or
     re-render reads from disk again: the due count drops, then climbs back.

     The fix is a single-file queue. Every mutation waits for the previous one
     to finish, so read and write always see the same state. Reads that do not
     modify anything (getNotes, getSettings) stay outside the queue — they can
     be a few milliseconds stale without harm and must not be able to stall it. */
  var chain = Promise.resolve();
  function critical(fn) {
    // .then(fn, fn) so one failed write cannot jam every later write.
    var run = chain.then(fn, fn);
    chain = run.then(function () {}, function () {});
    return run;
  }

  /* Raw access, NOT queued — only ever called from inside critical(). */
  function readKey(key, fallback) {
    var def = {};
    def[key] = fallback;
    return new Promise(function (resolve) {
      chrome.storage.local.get(def, function (res) { resolve(res[key] === undefined ? fallback : res[key]); });
    });
  }
  function writeKey(key, value) {
    var obj = {};
    obj[key] = value;
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }

  /** Read the notes map, hand it to fn, write back whatever fn leaves behind. */
  function mutateNotes(fn) {
    return critical(function () {
      return readKey('notes', {}).then(function (notes) {
        var out = fn(notes);
        return writeKey('notes', out === undefined ? notes : out);
      });
    });
  }

  NN.getAll = function () {
    return Promise.all([readKey('notes', {}), readKey('settings', {})]).then(function (r) {
      return {
        notes: r[0] || {},
        settings: Object.assign({}, NN.DEFAULT_SETTINGS, r[1] || {})
      };
    });
  };

  NN.getNotes = function () { return readKey('notes', {}); };
  NN.getSettings = function () {
    return readKey('settings', {}).then(function (s) {
      return Object.assign({}, NN.DEFAULT_SETTINGS, s || {});
    });
  };

  NN.setNotes = function (notes) {
    return critical(function () { return writeKey('notes', notes); }).then(function () { return notes; });
  };

  NN.saveSettings = function (patch) {
    var next;
    return critical(function () {
      return readKey('settings', {}).then(function (s) {
        next = Object.assign({}, NN.DEFAULT_SETTINGS, s || {}, patch);
        return writeKey('settings', next);
      });
    }).then(function () { return next; });
  };

  /** Write/overwrite a note and stamp the time. */
  NN.putNote = function (note) {
    return mutateNotes(function (notes) {
      // Stamped inside the critical section so the timestamp matches the write
      // order, not the (possibly much earlier) moment the call was made.
      note.updatedAt = Date.now();
      notes[note.id] = note;
    }).then(function () { return note; });
  };

  NN.removeNote = function (id) {
    return mutateNotes(function (notes) {
      var cur = notes[id];
      notes[id] = {
        id: id,
        deleted: true,
        updatedAt: Date.now(),
        url: cur ? cur.url : '',
        createdAt: cur ? cur.createdAt : Date.now()
      };
    });
  };

  /**
   * Fold a remote notes map into the local one and store the result — all in a
   * single critical section.
   *
   * Sync used to re-read local, merge, and write back as three separate steps.
   * A card graded during those few milliseconds was read after the merge input
   * was taken but before the write, so the write put the pre-grade copy back:
   * the passage sprang up as due again a moment after being answered.
   *
   * Attachments are local-only, so a remote copy that wins the merge carries no
   * `files`; ours are put back here rather than by the caller, which would put
   * the same gap back.
   */
  NN.applyRemote = function (remote) {
    var res;
    return mutateNotes(function (local) {
      res = NN.merge(local, remote || {});
      Object.keys(local).forEach(function (id) {
        var mine = local[id];
        if (mine && mine.files && mine.files.length && res.notes[id] && !res.notes[id].files) {
          res.notes[id] = Object.assign({}, res.notes[id], { files: mine.files });
        }
      });
      return res.notes;
    }).then(function () { return res; });
  };

  /** List of live notes, newest first. */

  NN.getProgress = function () { return readKey('progress', null); };
  NN.setProgress = function (d) {
    return critical(function () { return writeKey('progress', d); });
  };

  /** Read-modify-write the progress record inside one critical section. */
  NN.updateProgress = function (fn) {
    var next;
    return critical(function () {
      return readKey('progress', null).then(function (cur) {
        next = fn(cur) || cur;
        return writeKey('progress', next);
      });
    }).then(function () { return next; });
  };

  /* ---------- progress tracking (model & rendering live in progress.js) ----------
     Stored apart from the notes: it is a single small record that changes on a
     different rhythm (once per graded card) and merges by a different rule
     (larger count wins, not newer timestamp). Folding it into the notes map
     would put it through the notes' newest-wins merge and lose reviews. */

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
    // The note-side numbers are derived from data already in memory, so they are
    // gathered before the critical section — only the read-modify-write of the
    // progress record needs to be serialised.
    return Promise.resolve(stats ? stats() : {}).then(function (extra) {
      var ids = [];
      return NN.updateProgress(function (cur) {
        var d = NN.normalizeProgress(cur);
        var view = NN.progressOverview(d, extra || {});
        var fresh = NN.newlyEarnedBadges(view, d.badges, NN.pDay());
        ids = Object.keys(fresh);
        ids.forEach(function (id) { d.badges[id] = fresh[id]; });
        return d;
      }).then(function () { return ids; });
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
    return NN.normalizeUrl(n.url) + ' ' + t;
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
  /** Mốc của lần CHẤM BÀI gần nhất. Bản cũ chưa có `last` thì mượn `updatedAt`. */
  function reviewedAt(n) {
    const s = n && n.srs;
    if (!s) return -1;
    return (typeof s.last === 'number' && s.last) ? s.last : (n.updatedAt || 0);
  }

  /**
   * Merge the review SCHEDULE of two copies of one note, separately from the
   * note itself.
   *
   * Why it has to be separate: the merge normally takes whichever copy has the
   * newer `updatedAt` and keeps it whole. For the words you wrote that is
   * right — your later edit is your latest intent. But the review schedule is
   * not something you typed; the app writes it when you grade a card, and two
   * machines grade at different moments. Grade on the phone up to level 5, then
   * fix a typo on the desktop: the desktop copy is newer so it wins whole, and
   * level 5 quietly drops back to level 1. Losing review work in silence is the
   * worst way to lose it.
   *
   * So the scheduling fields are compared on their own clock, `srs.last`.
   * `learn` and `known` stay with the record winner on purpose: snoozing a note
   * or marking it mastered is something YOU do, and it does not touch
   * `srs.last`, so it must not travel with the schedule.
   *
   * Only merged between two live notes that both carry a schedule. A tombstone
   * deliberately carries none.
   */
  const SRS_LICH = ['box', 'due', 'reps', 'lapses', 'last'];
  function mergeSrs(win, lose) {
    if (!win || !lose || win.deleted || lose.deleted) return win;
    if (!win.srs || !lose.srs) return win;
    if (reviewedAt(lose) <= reviewedAt(win)) return win;
    const s = Object.assign({}, win.srs);
    SRS_LICH.forEach(k => { if (lose.srs[k] !== undefined) s[k] = lose.srs[k]; });
    return Object.assign({}, win, { srs: s });
  }

  NN.merge = function (local, remote) {
    const out = {};
    const ids = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
    let added = 0, updated = 0;
    ids.forEach(id => {
      const a = (local || {})[id];
      const b = (remote || {})[id];
      if (!a) { out[id] = b; added++; return; }
      if (!b) { out[id] = a; return; }
      if ((b.updatedAt || 0) > (a.updatedAt || 0)) { out[id] = mergeSrs(b, a); updated++; }
      else out[id] = mergeSrs(a, b);
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
