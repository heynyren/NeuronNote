/* Neuron Note — content script */
(function () {
  'use strict';
  if (window.__NEURON_NOTE_READY__) return;
  window.__NEURON_NOTE_READY__ = true;

  const UI_ID = 'neuron-note-ui';
  const squash = s => String(s || '').replace(/\s+/g, ' ').trim();
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  let PAGE_NOTES = [];   // note đang hiển thị trên trang
  let SETTINGS = {};
  const NN_COLORS = ['amber', 'mint', 'sky', 'rose', 'lilac'];

  /* ================= chỉ mục văn bản ================= */
  const BLOCK = {
    P: 1, DIV: 1, LI: 1, TD: 1, TH: 1, TR: 1, BLOCKQUOTE: 1, PRE: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, ARTICLE: 1, SECTION: 1,
    MAIN: 1, HEADER: 1, FOOTER: 1, ASIDE: 1, UL: 1, OL: 1, DL: 1, DT: 1, DD: 1,
    FIGURE: 1, FIGCAPTION: 1, BR: 1, HR: 1, TABLE: 1, NAV: 1
  };
  function nearestBlock(el) {
    let e = el;
    while (e && e !== document.body) {
      if (BLOCK[e.tagName]) return e;
      e = e.parentElement;
    }
    return document.body;
  }

  // Các nhánh cần BỎ QUA khi đọc text: bản MathML ẩn của KaTeX/MathJax, mã TeX gốc,
  // và text chỉ dành cho trình đọc màn hình. Nhờ đó công thức toán chỉ còn MỘT bản hiện.
  const SKIP_SEL = '.katex-mathml, annotation, mjx-assistive-mml, .MathJax_Preview, ' +
    '.MJX_Assistive_MathML, .sr-only, .visually-hidden, [data-nn-skip]';
  function inSkip(node) {
    const el = node.nodeType === 3 ? node.parentElement : node;
    return !!(el && el.closest && el.closest(SKIP_SEL));
  }

  function acceptTextNode(n) {
    const p = n.parentElement;
    if (!p) return NodeFilter.FILTER_REJECT;
    const tag = p.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' ||
        tag === 'TEXTAREA' || tag === 'TITLE') return NodeFilter.FILTER_REJECT;
    if (p.id === UI_ID || p.closest('#' + UI_ID)) return NodeFilter.FILTER_REJECT;
    if (inSkip(n)) return NodeFilter.FILTER_REJECT;
    if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }

  /**
   * Chỉ mục text của một gốc bất kỳ (cả trang hoặc một mảnh clone), chuẩn hoá khoảng
   * trắng VÀ chèn dấu cách ở ranh giới khối — giống cách trình duyệt nối chuỗi khi bôi
   * đen. map[i] = {node, off} cho từng ký tự; dấu cách chèn ở ranh giới khối = null.
   */
  function makeIndex(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: acceptTextNode });

    let norm = '';
    const map = [];
    let prevBlock = null;
    let first = true;
    let needSpace = false;
    let spaceSrc = null;
    let n;
    while ((n = walker.nextNode())) {
      const block = nearestBlock(n.parentElement);
      if (!first && block !== prevBlock) needSpace = true;
      prevBlock = block;
      first = false;

      const s = n.nodeValue;
      for (let k = 0; k < s.length; k++) {
        const ch = s[k];
        if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\u00a0' || ch === '\u200b') {
          needSpace = true;
          if (!spaceSrc) spaceSrc = { node: n, off: k };
          continue;
        }
        if (needSpace && norm.length) { norm += ' '; map.push(spaceSrc); }
        needSpace = false;
        spaceSrc = null;
        norm += ch;
        map.push({ node: n, off: k });
      }
    }
    return { norm, map };
  }

  function buildIndex() { return makeIndex(document.body); }

  /** Đọc text sạch của một Range theo đúng luật trên (để chuỗi lưu khớp với chỉ mục trang). */
  function textOfRange(range) {
    try {
      const holder = document.createElement('div');
      holder.appendChild(range.cloneContents());
      return makeIndex(holder).norm;
    } catch (e) {
      return '';
    }
  }

  /** Từ khoảng [start,end) trong norm → các đoạn DOM {node,start,end} để bọc <mark>. */
  function rangesFromNorm(idx, start, end) {
    const segs = [];
    let cur = null;
    for (let i = start; i < end; i++) {
      const e = idx.map[i];
      if (!e) continue;                       // dấu cách chèn ở ranh giới — bỏ qua
      if (cur && cur.node === e.node) {
        cur.end = e.off + 1;                  // cùng node → nới rộng (gồm cả khoảng trắng bên trong)
      } else {
        if (cur) segs.push(cur);
        cur = { node: e.node, start: e.off, end: e.off + 1 };
      }
    }
    if (cur) segs.push(cur);
    return segs;
  }

  function tailMatch(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
    return i;
  }
  function headMatch(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function firstWords(s, n) { const w = squash(s).split(' ').filter(Boolean); return w.slice(0, n).join(' '); }
  function lastWords(s, n) { const w = squash(s).split(' ').filter(Boolean); return w.slice(-n).join(' '); }

  /** Tìm lại đoạn đã lưu trong trang. Trả về {start, end} theo chỉ số norm, hoặc null. */
  function findAnchor(idx, note) {
    const target = squash(note.text);
    if (!target) return null;
    const hay = idx.norm;

    // 1) khớp nguyên văn (có phân biệt hoa thường, rồi không phân biệt)
    let hits = [];
    let p = hay.indexOf(target);
    while (p !== -1 && hits.length < 80) { hits.push(p); p = hay.indexOf(target, p + 1); }
    if (!hits.length) {
      const lowHay = hay.toLowerCase(), lowT = target.toLowerCase();
      p = lowHay.indexOf(lowT);
      while (p !== -1 && hits.length < 80) { hits.push(p); p = lowHay.indexOf(lowT, p + 1); }
    }

    if (hits.length) {
      let pos = hits[0];
      if (hits.length > 1) {
        const pfx = squash(note.prefix || '').slice(-40);
        const sfx = squash(note.suffix || '').slice(0, 40);
        let best = -1;
        hits.forEach(h => {
          const before = hay.slice(Math.max(0, h - 40), h);
          const after = hay.slice(h + target.length, h + target.length + 40);
          const score = (pfx ? tailMatch(before, pfx) : 0) + (sfx ? headMatch(after, sfx) : 0);
          if (score > best) { best = score; pos = h; }
        });
      }
      return { start: pos, end: pos + target.length };
    }

    // 2) dự phòng cho đoạn dài: khớp mấy từ đầu + mấy từ cuối, lấy cả khoảng ở giữa.
    //    Chịu được vài ký tự lạ chen giữa (chú thích, biểu tượng, tách node…).
    const words = target.split(' ');
    if (words.length >= 8) {
      const head = firstWords(target, 6);
      const tail = lastWords(target, 6);
      const lowHay = hay.toLowerCase();
      let hp = hay.indexOf(head);
      if (hp === -1) hp = lowHay.indexOf(head.toLowerCase());
      if (hp !== -1) {
        let tp = hay.indexOf(tail, hp + head.length);
        if (tp === -1) tp = lowHay.indexOf(tail.toLowerCase(), hp + head.length);
        if (tp !== -1) {
          const end = tp + tail.length;
          if (end - hp <= target.length * 1.8 + 40) return { start: hp, end };
        }
      }
    }
    return null;
  }

  /* ================= vẽ highlight ================= */
  function paint(note) {
    if (document.querySelector('mark.nn-hl[data-nn="' + cssEsc(note.id) + '"]')) return true;
    const idx = buildIndex();
    const anchor = findAnchor(idx, note);
    if (!anchor) return false;

    const segs = rangesFromNorm(idx, anchor.start, anchor.end);
    if (!segs.length) return false;

    const hasNote = squash(note.note) || (note.tags || []).length;
    // bọc từ đoạn CUỐI về ĐẦU: splitText làm lệch offset của chính node đó,
    // nhưng các node khác không ảnh hưởng, nên xử lý ngược để an toàn
    for (let i = segs.length - 1; i >= 0; i--) {
      const seg = segs[i];
      let node = seg.node;
      try {
        const len = node.nodeValue.length;
        const end = Math.min(seg.end, len);
        const start = Math.min(seg.start, end);
        if (end < len) node.splitText(end);
        if (start > 0) node = node.splitText(start);
        const m = document.createElement('mark');
        m.className = 'nn-hl';
        m.dataset.nn = note.id;
        m.dataset.nncolor = note.color || 'amber';
        if (hasNote) m.dataset.nnnote = '1';
        m.title = 'Neuron Note — bấm để xem ghi chú';
        node.parentNode.insertBefore(m, node);
        m.appendChild(node);
      } catch (e) { /* bỏ qua đoạn không tách được */ }
    }
    return true;
  }

  function cssEsc(s) {
    return String(s).replace(/["\\]/g, '\\$&');
  }

  function unpaint(id) {
    document.querySelectorAll('mark.nn-hl[data-nn="' + cssEsc(id) + '"]').forEach(m => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  function repaint(note) {
    unpaint(note.id);
    paint(note);
  }

  function flash(id, scroll) {
    const marks = document.querySelectorAll('mark.nn-hl[data-nn="' + cssEsc(id) + '"]');
    if (!marks.length) return false;
    if (scroll !== false) {
      try { marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      catch (e) { marks[0].scrollIntoView(); }
    }
    marks.forEach(m => {
      m.classList.remove('nn-flash');
      void m.offsetWidth;
      m.classList.add('nn-flash');
      setTimeout(() => m.classList.remove('nn-flash'), 4000);
    });
    return true;
  }

  /* ================= khôi phục khi mở trang ================= */
  function restore(retry) {
    chrome.runtime.sendMessage({ type: 'GET_PAGE_NOTES', url: location.href }, res => {
      if (chrome.runtime.lastError || !res) return;
      SETTINGS = res.settings || {};
      PAGE_NOTES = res.notes || [];
      if (SETTINGS.autoHighlight === false) return;

      let missed = 0;
      PAGE_NOTES.forEach(n => { if (!paint(n)) missed++; });

      const want = targetIdFromHash();
      if (want) {
        if (!flash(want, true) && (retry || 0) < 6) {
          setTimeout(() => restore((retry || 0) + 1), 700);
          return;
        }
      }
      // trang tải nội dung động → thử lại vài lần
      if (missed && (retry || 0) < 6) setTimeout(() => restore((retry || 0) + 1), 900);
    });
  }

  function targetIdFromHash() {
    const m = /(?:^|[#&])nn=([\w-]+)/.exec(location.hash || '');
    return m ? m[1] : null;
  }

  window.addEventListener('hashchange', () => {
    const id = targetIdFromHash();
    if (id) flash(id, true);
  });

  /* ================= giao diện nổi (Shadow DOM) ================= */
  let host, shadow;
  function ui() {
    if (shadow) return shadow;
    host = document.createElement('div');
    host.id = UI_ID;
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483646;top:0;left:0;width:0;height:0;';
    (document.documentElement || document.body).appendChild(host);
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>' + CSS + '</style><div id="root"></div>';
    return shadow;
  }

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; }
  .card, .toast {
    position: fixed; background: #F7F7F3; color: #191C22;
    border: 1px solid #D6D7CE; border-radius: 12px;
    box-shadow: 0 10px 30px rgba(15,18,22,.18), 0 2px 6px rgba(15,18,22,.10);
    z-index: 2147483647;
  }
  .card { width: 320px; padding: 12px; }
  .head {
    display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
    font: 600 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: .14em; text-transform: uppercase; color: #6C7079;
  }
  .head .dot { width: 7px; height: 7px; border-radius: 50%; background: #007D7A; flex: none; }
  .head .x {
    margin-left: auto; cursor: pointer; border: 0; background: none;
    font-size: 15px; line-height: 1; color: #6C7079; padding: 2px 4px; border-radius: 6px;
  }
  .head .x:hover { background: #E7E8E0; }
  .quote {
    font: italic 13px/1.5 Georgia, "Times New Roman", serif;
    max-height: 76px; overflow: auto; margin: 0 0 10px;
    padding-left: 9px; border-left: 2px solid #FFD75E; color: #34383F;
  }
  label {
    display: block; font: 600 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .12em; text-transform: uppercase; color: #6C7079; margin: 0 0 4px;
  }
  textarea, input[type=text] {
    width: 100%; border: 1px solid #D6D7CE; border-radius: 8px; padding: 7px 9px;
    font: 13px/1.45 inherit; background: #FFF; color: #191C22; resize: vertical;
  }
  textarea { min-height: 56px; }
  textarea:focus, input:focus { outline: 2px solid #007D7A; outline-offset: -1px; border-color: #007D7A; }
  .field { margin-bottom: 9px; }
  .lbl-picker { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .lchip {
    display: inline-flex; align-items: center; gap: 6px;
    font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 5px 9px; border-radius: 999px; cursor: pointer;
    background: #FFF; border: 1px solid #D6D7CE; color: #191C22;
  }
  .lchip:hover { border-color: #007D7A; }
  .lchip[aria-pressed="true"] { background: #E2EFEE; border-color: #007D7A; color: #005E5C; }
  .lchip .ldot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .lchip .ldot.muted { background: #D6D7CE; }
  .lchip.add { color: #6C7079; border-style: dashed; }
  .lchip-add { display: inline-flex; align-items: center; gap: 6px; }
  .lchip-input { width: 120px; border: 1px solid #007D7A; border-radius: 999px; padding: 5px 10px; font: 12px inherit; }
  .swatches { display: flex; gap: 6px; margin-bottom: 10px; }
  .sw { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
  .sw[aria-pressed="true"] { border-color: #191C22; }
  .row { display: flex; gap: 8px; align-items: center; }
  button.btn {
    font: 600 12px/1 inherit; padding: 8px 12px; border-radius: 8px; cursor: pointer;
    border: 1px solid #191C22; background: #191C22; color: #F7F7F3;
  }
  button.btn:hover { background: #000; }
  button.ghost { background: none; color: #191C22; border-color: #D6D7CE; }
  button.ghost:hover { background: #E7E8E0; }
  button.danger { margin-left: auto; border-color: transparent; background: none; color: #A3352A; }
  button.danger:hover { background: #F6E2DF; }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 9px; }
  .tag {
    font: 600 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #E2EFEE; color: #005E5C; padding: 4px 7px; border-radius: 999px;
  }
  .note-text { font: 13px/1.5 inherit; white-space: pre-wrap; margin: 0 0 10px; }
  .toast {
    left: 50%; transform: translateX(-50%); bottom: 22px;
    padding: 10px 16px; font: 13px/1.3 inherit; display: flex; gap: 9px; align-items: center;
  }
  .toast b { font-weight: 600; }
  @media (prefers-reduced-motion: no-preference) {
    .card, .toast { animation: rise .16s ease-out; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } }
    .toast { animation: none; }
  }
  `;

  function clearUI() {
    if (!shadow) return;
    shadow.getElementById('root').innerHTML = '';
  }

  function place(el, rect) {
    const pad = 10;
    const w = el.offsetWidth || 320;
    const h = el.offsetHeight || 200;
    let left = rect ? rect.left : (innerWidth - w) / 2;
    let top = rect ? rect.bottom + 8 : 80;
    if (rect && top + h > innerHeight - pad) top = Math.max(pad, rect.top - h - 8);
    left = Math.min(Math.max(pad, left), innerWidth - w - pad);
    top = Math.min(Math.max(pad, top), innerHeight - h - pad);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function toast(text, actionLabel, onAction) {
    const sh = ui();
    const root = sh.getElementById('root');
    const old = root.querySelector('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<b>' + esc(text) + '</b>';
    if (actionLabel) {
      const b = document.createElement('button');
      b.className = 'btn ghost';
      b.textContent = actionLabel;
      b.addEventListener('click', () => { el.remove(); onAction && onAction(); });
      el.appendChild(b);
    }
    root.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /** Toast sau khi lưu thẳng: có Hoàn tác và Ghi chú (mở thẻ khi cần), tự biến mất. */
  function savedToast(text, note) {
    const sh = ui();
    const root = sh.getElementById('root');
    const old = root.querySelector('.toast');
    if (old) old.remove();

    const el = document.createElement('div');
    el.className = 'toast';
    const label = document.createElement('b');
    label.textContent = text;
    el.appendChild(label);

    const undo = document.createElement('button');
    undo.className = 'btn ghost';
    undo.textContent = 'Hoàn tác';
    undo.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'DELETE_NOTE', id: note.id }, () => {
        unpaint(note.id);
        PAGE_NOTES = PAGE_NOTES.filter(n => n.id !== note.id);
        el.remove();
        toast('Đã hoàn tác');
      });
    });
    el.appendChild(undo);

    const edit = document.createElement('button');
    edit.className = 'btn ghost';
    edit.textContent = 'Ghi chú';
    edit.addEventListener('click', () => {
      el.remove();
      const m = document.querySelector('mark.nn-hl[data-nn="' + cssEsc(note.id) + '"]');
      openCard(note, m ? m.getBoundingClientRect() : null, 'edit');
    });
    el.appendChild(edit);

    root.appendChild(el);
    setTimeout(() => { if (el.isConnected) el.remove(); }, 5000);
  }

  /** Thẻ ghi chú: dùng cho cả lúc vừa lưu và lúc bấm vào highlight. */
  function openCard(note, rect, mode) {
    const sh = ui();
    const root = sh.getElementById('root');
    root.querySelectorAll('.card').forEach(c => c.remove());

    const editing = mode === 'edit';
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="head"><span class="dot"></span><span>${editing ? 'Ghi chú' : 'Neuron Note'}</span>
        <button class="x" aria-label="Đóng">✕</button></div>
      <blockquote class="quote"></blockquote>
      <div class="body"></div>`;
    el.querySelector('.quote').textContent = note.text;

    const body = el.querySelector('.body');
    if (editing) {
      body.innerHTML = `
        <div class="field"><label>Ghi chú</label>
          <textarea placeholder="Vì sao đoạn này đáng nhớ?"></textarea></div>
        <div class="field"><label>Nhãn</label>
          <div class="lbl-picker"></div></div>
        <div class="swatches"></div>
        <div class="row">
          <button class="btn" data-act="save">Lưu</button>
          <button class="btn ghost" data-act="link">Chép link</button>
          <button class="btn danger" data-act="del">Xoá</button>
        </div>`;
      const ta = body.querySelector('textarea');
      ta.value = note.note || '';

      // bộ chọn nhãn: các nhãn định sẵn + nhãn lẻ của note + ô thêm mới
      const picker = body.querySelector('.lbl-picker');
      const have = new Set(note.tags || []);
      const defined = (SETTINGS.labels || []);
      const colors = { amber: '#FFE59E', mint: '#B7EBD8', sky: '#BFDDFA', rose: '#FBC9D2', lilac: '#DCD1FA' };
      function chip(name, colorKey, pressed, isNew) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lchip' + (isNew ? ' new' : '');
        b.dataset.name = name;
        b.setAttribute('aria-pressed', String(!!pressed));
        const dot = document.createElement('span');
        dot.className = 'ldot';
        if (colorKey && colors[colorKey]) dot.style.background = colors[colorKey]; else dot.classList.add('muted');
        b.appendChild(dot);
        b.appendChild(document.createTextNode(name));
        b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
        return b;
      }
      defined.forEach(l => picker.appendChild(chip(l.name, l.color, have.has(l.name), false)));
      (note.tags || []).filter(t => !defined.some(l => l.name === t))
        .forEach(t => picker.appendChild(chip(t, '', true, false)));

      const addWrap = document.createElement('span');
      addWrap.className = 'lchip-add';
      const addBtn = document.createElement('button');
      addBtn.type = 'button'; addBtn.className = 'lchip add'; addBtn.textContent = '＋ nhãn';
      const addInp = document.createElement('input');
      addInp.type = 'text'; addInp.className = 'lchip-input'; addInp.placeholder = 'Tên nhãn mới'; addInp.hidden = true;
      addBtn.addEventListener('click', () => { addInp.hidden = false; addInp.focus(); });
      addInp.addEventListener('keydown', ev => {
        if (ev.key === 'Escape') { addInp.hidden = true; addInp.value = ''; return; }
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        const nm = squash(addInp.value);
        if (!nm) return;
        const exist = picker.querySelector('.lchip[data-name="' + cssEsc(nm) + '"]');
        if (exist) exist.setAttribute('aria-pressed', 'true');
        else {
          const nextColor = NN_COLORS[(defined.length + picker.querySelectorAll('.lchip.new').length) % NN_COLORS.length];
          addWrap.before(chip(nm, nextColor, true, true));
        }
        addInp.value = ''; addInp.hidden = true;
      });
      addWrap.appendChild(addBtn); addWrap.appendChild(addInp);
      picker.appendChild(addWrap);

      const sws = body.querySelector('.swatches');
      let color = note.color || 'amber';
      Object.keys(colors).forEach(k => {
        const b = document.createElement('button');
        b.className = 'sw';
        b.style.background = colors[k];
        b.setAttribute('aria-pressed', String(k === color));
        b.title = k;
        b.addEventListener('click', () => {
          color = k;
          sws.querySelectorAll('.sw').forEach((x, i) => x.setAttribute('aria-pressed', String(Object.keys(colors)[i] === k)));
        });
        sws.appendChild(b);
      });

      body.querySelector('[data-act=save]').addEventListener('click', () => {
        const tags = Array.from(picker.querySelectorAll('.lchip[aria-pressed="true"]')).map(c => c.dataset.name).filter(Boolean);
        const newLabels = Array.from(picker.querySelectorAll('.lchip.new[aria-pressed="true"]')).map(c => c.dataset.name);
        const patch = { id: note.id, note: ta.value.trim(), tags, color };
        chrome.runtime.sendMessage({ type: 'UPDATE_NOTE', note: patch, newLabels }, res => {
          if (res && res.ok) {
            Object.assign(note, res.note);
            if (res.settings) SETTINGS = res.settings;
            const i = PAGE_NOTES.findIndex(n => n.id === note.id);
            if (i >= 0) PAGE_NOTES[i] = res.note; else PAGE_NOTES.push(res.note);
            repaint(res.note);
            clearUI();
            toast('Đã lưu ghi chú');
          }
        });
      });
      body.querySelector('[data-act=link]').addEventListener('click', () => copyLink(note));
      body.querySelector('[data-act=del]').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'DELETE_NOTE', id: note.id }, () => {
          unpaint(note.id);
          PAGE_NOTES = PAGE_NOTES.filter(n => n.id !== note.id);
          clearUI();
          toast('Đã xoá khỏi Neuron Note');
        });
      });
      setTimeout(() => ta.focus(), 30);
    } else {
      const tags = (note.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join('');
      body.innerHTML =
        (tags ? '<div class="tags">' + tags + '</div>' : '') +
        (squash(note.note) ? '<p class="note-text">' + esc(note.note) + '</p>' : '') +
        `<div class="row">
           <button class="btn" data-act="edit">Sửa</button>
           <button class="btn ghost" data-act="link">Chép link</button>
           <button class="btn danger" data-act="del">Xoá</button>
         </div>`;
      body.querySelector('[data-act=edit]').addEventListener('click', () => openCard(note, rect, 'edit'));
      body.querySelector('[data-act=link]').addEventListener('click', () => copyLink(note));
      body.querySelector('[data-act=del]').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'DELETE_NOTE', id: note.id }, () => {
          unpaint(note.id);
          PAGE_NOTES = PAGE_NOTES.filter(n => n.id !== note.id);
          clearUI();
          toast('Đã xoá khỏi Neuron Note');
        });
      });
    }

    el.querySelector('.x').addEventListener('click', clearUI);
    root.appendChild(el);
    place(el, rect);
    requestAnimationFrame(() => { if (el.isConnected) place(el, rect); });
  }

  function copyLink(note) {
    const url = note.fragUrl || note.url;
    navigator.clipboard.writeText(url).then(
      () => toast('Đã chép link tới đoạn này'),
      () => toast('Không chép được — hãy mở thư viện để lấy link')
    );
  }

  /* đóng thẻ khi bấm ra ngoài / nhấn Esc */
  document.addEventListener('mousedown', e => {
    if (!shadow) return;
    if (host.contains(e.target)) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (path.indexOf(host) !== -1) return;
    if (e.target && e.target.closest && e.target.closest('mark.nn-hl')) return;
    clearUI();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') clearUI(); }, true);

  /* bấm vào highlight → mở thẻ */
  document.addEventListener('click', e => {
    const m = e.target && e.target.closest ? e.target.closest('mark.nn-hl') : null;
    if (!m) return;
    // giữ Ctrl/Cmd hoặc chuột giữa → để trang xử lý như bình thường (vd highlight nằm trong link)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    const id = m.dataset.nn;
    const note = PAGE_NOTES.find(n => n.id === id);
    if (!note) return;
    e.preventDefault();
    e.stopPropagation();
    openCard(note, m.getBoundingClientRect(), 'view');
  }, true);

  /* ================= bắt vùng bôi đen ================= */
  function contextAround(range) {
    const out = { prefix: '', suffix: '' };
    try {
      let c = range.commonAncestorContainer;
      if (c.nodeType === 3) c = c.parentNode;
      const block = (c.closest && c.closest('p,li,td,th,blockquote,h1,h2,h3,h4,h5,article,section,main,div')) || document.body;

      const pre = range.cloneRange();
      pre.collapse(true);
      pre.setStart(block, 0);
      out.prefix = squash(textOfRange(pre)).slice(-60);

      const post = range.cloneRange();
      post.collapse(false);
      post.setEnd(block, block.childNodes.length);
      out.suffix = squash(textOfRange(post)).slice(0, 60);
    } catch (e) { /* trang lạ — bỏ ngữ cảnh */ }
    return out;
  }

  function capture() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    // Lấy text bằng đúng luật của chỉ mục trang (bỏ math ẩn, chuẩn hoá khoảng trắng)
    // để chuỗi lưu luôn khớp khi tô lại. Dự phòng bằng selection.toString() nếu cần.
    let text = squash(textOfRange(range));
    if (!text) text = squash(sel.toString());
    if (!text) return null;
    const ctx = contextAround(range);
    return {
      text,
      prefix: ctx.prefix,
      suffix: ctx.suffix,
      title: document.title,
      url: location.href,
      rect: range.getBoundingClientRect()
    };
  }

  /* ================= nhận lệnh từ background ================= */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg && msg.type) {
      case 'PING':
        sendResponse({ ok: true });
        return;
      case 'CAPTURE': {
        const cap = capture();
        sendResponse(cap);
        return;
      }
      case 'TOAST':
        toast(msg.text || '');
        sendResponse({ ok: true });
        return;
      case 'SAVED': {
        const note = msg.note;
        PAGE_NOTES.push(note);
        paint(note);
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
        const label = msg.label ? ' · #' + msg.label : '';
        // lưu thẳng, không mở thẻ; chỉ báo nhẹ kèm lối tắt Hoàn tác / Ghi chú
        savedToast('Đã lưu' + label, note);
        sendResponse({ ok: true });
        return;
      }
      case 'FLASH':
        sendResponse({ ok: flash(msg.id, true) });
        return;
      case 'REHIGHLIGHT':
        restore(0);
        sendResponse({ ok: true });
        return;
      default:
        sendResponse({ ok: false });
    }
  });

  /* ================= khởi động ================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => restore(0));
  } else {
    restore(0);
  }
})();
