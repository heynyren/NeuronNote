/* Neuron Note — service worker */
importScripts('shared.js');
importScripts('progress.js');   // NN.mergeProgress — needed when syncing

const MENU_SAVE = 'nn-save';
const MENU_OPEN = 'nn-open';
const MENU_MANAGE = 'nn-manage';
const SAVE_PREFIX = 'nn-save::';   // + encodeURIComponent(label name)

/* ---------------- right-click menu ---------------- */
async function buildMenus() {
  const settings = await NN.getSettings();
  const labels = settings.labels || [];

  await new Promise(r => chrome.contextMenus.removeAll(r));

  if (!labels.length) {
    // no labels yet → a single save item
    chrome.contextMenus.create({ id: MENU_SAVE, title: 'Save to Neuron Note', contexts: ['selection'] });
  } else {
    chrome.contextMenus.create({ id: MENU_SAVE, title: 'Save to Neuron Note', contexts: ['selection'] });
    labels.forEach(l => {
      chrome.contextMenus.create({
        id: SAVE_PREFIX + encodeURIComponent(l.name),
        parentId: MENU_SAVE,
        title: '#' + l.name + (settings.activeLabel === l.name ? '  ·  default' : ''),
        contexts: ['selection']
      });
    });
    chrome.contextMenus.create({ id: 'nn-sep1', parentId: MENU_SAVE, type: 'separator', contexts: ['selection'] });
    chrome.contextMenus.create({ id: SAVE_PREFIX, parentId: MENU_SAVE, title: '(No label)', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'nn-sep2', parentId: MENU_SAVE, type: 'separator', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENU_MANAGE, parentId: MENU_SAVE, title: 'Manage labels…', contexts: ['selection'] });
  }

  chrome.contextMenus.create({ id: MENU_OPEN, title: 'Open Neuron Note library', contexts: ['action', 'page'] });
}

chrome.runtime.onInstalled.addListener(() => { buildMenus(); scheduleSync(); });
chrome.runtime.onStartup.addListener(() => { buildMenus(); scheduleSync(); });

// rebuild the menu whenever the label list / default label changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  const a = changes.settings.oldValue || {};
  const b = changes.settings.newValue || {};
  if (JSON.stringify(a.labels) !== JSON.stringify(b.labels) || a.activeLabel !== b.activeLabel) {
    buildMenus();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = info.menuItemId;
  if (id === MENU_OPEN) return openLibrary();
  if (id === MENU_MANAGE) return openLibrary('#labels');

  let label = null;
  if (id === MENU_SAVE) label = '';                       // single save item (no labels yet)
  else if (id === SAVE_PREFIX) label = '';                // (No label)
  else if (typeof id === 'string' && id.indexOf(SAVE_PREFIX) === 0)
    label = decodeURIComponent(id.slice(SAVE_PREFIX.length));

  if (label !== null && tab && tab.id != null) {
    captureAndSave(tab, info.selectionText || '', label);
  }
});

chrome.commands.onCommand.addListener(cmd => {
  if (cmd !== 'save-selection') return;
  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
    if (!tabs[0]) return;
    const s = await NN.getSettings();
    captureAndSave(tabs[0], '', s.activeLabel || '');   // shortcut uses the default label
  });
});

function openLibrary(hash) {
  chrome.tabs.create({ url: chrome.runtime.getURL('notes.html' + (hash || '')) });
}

/* ---------------- save the selected passage ---------------- */
function askTab(tabId, msg) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, msg, res => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(res);
    });
  });
}

async function ensureContentScript(tabId) {
  const ping = await askTab(tabId, { type: 'PING' });
  if (ping && ping.ok) return true;
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return true;
  } catch (e) {
    console.warn('[NeuronNote] could not inject the content script into this tab:', e && e.message,
      '— it may be a chrome:// page, the extension store, a PDF or file:// (Chrome blocks these).');
    return false;
  }
}

async function flashBadge(tabId, text, color) {
  try {
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color: color || '#A3352A' });
  } catch (e) { /* tab already closed */ }
}

async function captureAndSave(tab, fallbackText, label, sanCap) {
  try {
    label = label || '';
    // sanCap: người gọi đã có sẵn đoạn cần lưu (bảng lời thoại YouTube), khỏi
    // phải đi vòng hỏi lại content script.
    const ok = sanCap ? true : await ensureContentScript(tab.id);

    let cap = sanCap || (ok ? await askTab(tab.id, { type: 'CAPTURE' }) : null);

    if (!cap || !cap.text) {
      if (!fallbackText.trim()) {
        console.warn('[NeuronNote] nothing to save.');
        if (ok) askTab(tab.id, { type: 'TOAST', text: 'No text is selected.' });
        flashBadge(tab.id, '!', '#A3352A');
        return;
      }
      cap = { text: fallbackText, prefix: '', suffix: '', title: tab.title || '', url: tab.url };
    }

    const settings = await NN.getSettings();
    const labelColor = NN.labelColor(settings, label);
    const note = {
      id: NN.uid(),
      text: NN.squash(cap.text),
      // Same passage with formulas as standard LaTeX. Rendered math comes back
      // from the page as `cap.rich`; otherwise the selection may still hold raw
      // LaTeX (PDF and chat exports) or Unicode glyphs, which toStandardMath
      // repairs. Stored only when it differs, so plain prose carries no copy.
      rich: (function () {
        const src = NN.squash(cap.rich || cap.text);
        const std = NN.toStandardMath(src);
        return std && std !== NN.squash(cap.text) ? std : '';
      })(),
      // Bản dịch đi kèm khi lưu từ bảng lời thoại: xem video kỹ thuật tiếng
      // nước ngoài thì câu gốc nằm một mình trong sổ chẳng giúp được gì.
      note: cap.note || '',
      tags: label ? [label] : [],
      color: labelColor || settings.markColor || 'amber',
      url: NN.normalizeUrl(cap.url || tab.url),
      title: NN.squash(cap.title || tab.title || ''),
      prefix: cap.prefix || '',
      suffix: cap.suffix || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
      srs: NN.freshSrs()
    };
    note.fragUrl = NN.buildFragmentUrl(note);

    await NN.putNote(note);
    // Count the day's new passages for the Progress panel. A failure here must
    // never take the save down with it — the passage matters, the tally doesn't.
    try { await NN.recordSaved(1); } catch (e) { /* ignore */ }

    refreshBadge(tab.id, note.url);

    // direct save: only highlight + a light toast, do NOT open the note card
    const shown = await askTab(tab.id, { type: 'SAVED', note, label });
    if (!shown) {
      flashBadge(tab.id, '✓', '#007D7A');
      setTimeout(() => refreshBadge(tab.id, note.url), 1500);
    }

    if (settings.autoSync && settings.syncUrl) syncNow().catch(() => {});
  } catch (err) {
    console.error('[NeuronNote] ERROR while saving:', err);
    flashBadge(tab && tab.id, '!', '#A3352A');
  }
}

/* ---------------- badge: note count on the page ---------------- */
async function refreshBadge(tabId, url) {
  const notes = await NN.getNotes();
  const key = NN.normalizeUrl(url);
  const n = NN.live(notes).filter(x => NN.normalizeUrl(x.url) === key).length;
  try {
    chrome.action.setBadgeText({ tabId, text: n ? String(n) : '' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#007D7A' });
  } catch (e) { /* tab already closed */ }
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.url) refreshBadge(tabId, tab.url);
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => {
    if (!chrome.runtime.lastError && tab && tab.url) refreshBadge(tabId, tab.url);
  });
});

// ==== Dịch câu: gọi thẳng Google Dịch (nhanh), Apps Script làm dự phòng ====
// Một video có gần trăm câu, nên 300 chỗ là chưa xem hết hai video đã bị đẩy
// hết ra ngoài — mở lại video cũ vẫn phải dịch lại từ đầu. Bộ đệm này chỉ nằm
// trong máy (không đi qua đồng bộ Drive), nên nới rộng gần như không tốn gì.
const TR_MAX = 1200;                // số bản dịch giữ trong bộ đệm
const TR_TTL = 30 * 86400000;

// Endpoint Google Dịch công khai — không cần Apps Script nên nhanh hơn hẳn.
async function gtxTranslate(text, f, t) {
  // dt=t: bản dịch; dt=rm: phiên âm (romaji) của nguồn tiếng Nhật.
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=rm"
    + "&sl=" + encodeURIComponent(f || "ja") + "&tl=" + encodeURIComponent(t || "vi")
    + "&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("gtx HTTP " + r.status);
  const data = await r.json();
  const segs = (data && data[0]) || [];
  const out = segs.map((s) => (s && s[0]) || "").join("").trim();
  // Google để phiên âm nguồn ở phần tử [3] của đoạn cuối (chỗ [0] rỗng).
  let reading = "";
  for (const s of segs) { if (s && s[0] == null && typeof s[3] === "string") reading += s[3]; }
  reading = reading.replace(/\s+/g, " ").trim();
  if (!out) throw new Error("gtx rỗng");
  return { text: out, reading: reading };
}
/**
 * Dịch NHIỀU câu trong một lượt.
 *
 * Vì sao cần hàm riêng thay vì gọi handleTranslate nhiều lần: mỗi lượt dịch lẻ
 * phải ĐỌC cả bộ đệm rồi GHI lại cả bộ đệm (tối đa 300 mục) vào chrome.storage.
 * Dịch một câu thì không thấy gì, nhưng bảng lời thoại có gần trăm câu — thành
 * gần trăm vòng đọc-ghi cả bộ đệm, và đó mới là thứ làm giao diện khựng, chứ
 * không phải mạng. Ở đây: đọc MỘT lần, ghi MỘT lần.
 *
 * Tiện thể sửa luôn một lỗi âm thầm của cách cũ: các lượt lẻ chạy song song đều
 * đọc-sửa-ghi cùng một object, nên lượt ghi sau xoá mất bản dịch của lượt trước
 * — bộ đệm gần như không giữ được gì, lần sau mở lại vẫn phải dịch lại từ đầu.
 */
async function handleTranslateMany(rawTexts, from, to) {
  const texts = (rawTexts || []).map((x) => String(x || "").trim());
  if (!texts.length) return { ok: true, texts: [] };
  const f = from || "auto", t = to || "vi";

  const { trCache } = await chrome.storage.local.get("trCache");
  const c = trCache || {};
  const now = Date.now();
  const out = new Array(texts.length).fill("");
  const can = [];
  texts.forEach((x, i) => {
    if (!x) return;
    const h = c[f + ">" + t + ":" + x];
    if (h && now - (h.ts || 0) < TR_TTL) out[i] = h.v; else can.push(i);
  });

  // Song song có giới hạn: mở hết cùng lúc thì trình duyệt cũng xếp hàng ở tầng
  // kết nối, mà lỡ hỏng thì hỏng cả loạt.
  //
  // Và phải THỬ LẠI: gửi một loạt 40 câu thì bên kia hay chặn bớt vài câu giữa
  // chừng. Bỏ luôn câu hỏng thì trên bảng nó nằm mãi ở dấu "—" trong khi hàng
  // xóm hai bên đều có nghĩa — trông như mình bỏ sót, mà thật ra chỉ là một
  // lượt gọi trượt.
  const SONG = 6;
  let ke = 0;
  await Promise.all(new Array(Math.min(SONG, can.length)).fill(0).map(async () => {
    while (ke < can.length) {
      const i = can[ke++];
      for (let lan = 0; lan < 3; lan++) {
        try {
          const g = await gtxTranslate(texts[i], f, t);
          if (g && g.text) {
            out[i] = g.text;
            c[f + ">" + t + ":" + texts[i]] = { v: g.text, rd: g.reading || "", ts: now };
            break;
          }
        } catch (e) { /* thử lại, đừng kéo cả loạt xuống theo */ }
        if (lan < 2) await new Promise((r) => setTimeout(r, 250 * Math.pow(3, lan)));
      }
    }
  }));

  const keys = Object.keys(c);
  if (keys.length > TR_MAX) {
    keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
    for (let i = 0; i < keys.length - TR_MAX; i++) delete c[keys[i]];
  }
  await chrome.storage.local.set({ trCache: c });
  return { ok: true, texts: out };
}

/* ---------------- messages from content / pages ---------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg && msg.type) {
      case 'GET_PAGE_NOTES': {
        const { notes, settings } = await NN.getAll();
        const key = NN.normalizeUrl(msg.url);
        const list = NN.live(notes).filter(n => NN.normalizeUrl(n.url) === key);
        if (sender.tab) refreshBadge(sender.tab.id, key);
        sendResponse({ notes: list, settings });
        break;
      }
      case 'UPDATE_NOTE': {
        const notes = await NN.getNotes();
        const cur = notes[msg.note.id];
        if (!cur) return sendResponse({ ok: false });
        let settings = await NN.getSettings();
        if (msg.newLabels && msg.newLabels.length) {
          settings = await NN.saveSettings({ labels: NN.withNewLabels(settings, msg.newLabels) });
        }
        const next = Object.assign({}, cur, msg.note);
        next.fragUrl = NN.buildFragmentUrl(next);
        await NN.putNote(next);
        if (sender.tab) refreshBadge(sender.tab.id, next.url);
        sendResponse({ ok: true, note: next, settings });
        maybeAutoSync();
        break;
      }
      case 'DELETE_NOTE': {
        await NN.removeNote(msg.id);
        if (sender.tab && sender.tab.url) refreshBadge(sender.tab.id, sender.tab.url);
        sendResponse({ ok: true });
        maybeAutoSync();
        break;
      }
      case 'SAVE_FROM_PAGE': {
        if (sender.tab) captureAndSave(sender.tab, '', msg.label || '');
        sendResponse({ ok: true });
        break;
      }
      // Dịch cả loạt câu cho bảng lời thoại. Listener này vốn đã trả lời không
      // đồng bộ (return true ở cuối), nên chỉ cần await rồi gọi sendResponse.
      case 'TRANSLATE_MANY': {
        try {
          sendResponse(await handleTranslateMany(msg.texts, msg.from, msg.to));
        } catch (e) {
          sendResponse({ ok: false, error: String((e && e.message) || e) });
        }
        break;
      }
      // Bảng lời thoại YouTube gửi thẳng đoạn cần lưu kèm mốc giây trong URL.
      case 'SAVE_CAP': {
        if (sender.tab && msg.cap && msg.cap.text) {
          captureAndSave(sender.tab, '', msg.label || '', msg.cap);
        }
        sendResponse({ ok: true });
        break;
      }
      case 'OPEN_LIBRARY':
        openLibrary(msg.hash);
        sendResponse({ ok: true });
        break;
      case 'SYNC_NOW':
        try { sendResponse(await syncNow()); }
        catch (e) { sendResponse({ ok: false, error: String(e.message || e) }); }
        break;
      default:
        sendResponse({ ok: false });
    }
  })();
  return true; // respond asynchronously
});

/* ---------------- sync via Apps Script ---------------- */
async function maybeAutoSync() {
  const s = await NN.getSettings();
  if (s.autoSync && s.syncUrl) syncNow().catch(() => {});
}

let syncing = false;
async function syncNow() {
  const s = await NN.getSettings();
  if (!s.syncUrl) return { ok: false, error: 'No Apps Script URL configured.' };
  if (syncing) return { ok: false, error: 'Already syncing…' };
  syncing = true;
  try {
    const local = await NN.getNotes();
    // Attachments stay on this machine: the whole note set goes up as ONE JSON
    // document, so shipping file descriptors would only promise other devices
    // blobs they cannot resolve. Strip them on the way out and put the local
    // ones back after the merge.
    const outgoing = {};
    Object.keys(local).forEach(id => {
      const n = local[id];
      if (n && n.files) { outgoing[id] = Object.assign({}, n); delete outgoing[id].files; }
      else outgoing[id] = n;
    });
    const res = await fetch(s.syncUrl, {
      method: 'POST',
      // text/plain to avoid Apps Script's CORS preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync', key: s.syncKey || '', notes: outgoing,
        progress: await NN.getProgress()
      })
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { throw new Error('Server did not return JSON. Check that the Web App access is set to "Anyone".'); }
    if (!data.ok) throw new Error(data.error || 'Sync failed.');

    // Re-read local, merge and store in ONE atomic step (NN.applyRemote). Doing
    // it as three separate steps left a window in which a card graded during the
    // slow network round-trip was read before the merge but overwritten by the
    // write after it — the passage popped back up as due seconds after being
    // answered. applyRemote also restores local-only attachments, which a
    // winning remote copy never carries.
    const merged = await NN.applyRemote(data.notes || {});
    // Progress merges by its own rule (see NN.mergeProgress): counts take the
    // larger side rather than the newer one, so reviews done on the phone and on
    // the laptop on the same day both survive. A server that has not been
    // updated yet simply returns nothing here, and the local record stands.
    if (data.progress) {
      await NN.updateProgress(mine => NN.mergeProgress(mine, data.progress));
    }
    const now = Date.now();
    await NN.saveSettings({ lastSync: now });
    return { ok: true, at: now, added: merged.added, updated: merged.updated, total: NN.live(merged.notes).length };
  } finally {
    syncing = false;
  }
}

function scheduleSync() {
  chrome.alarms.create('nn-sync', { periodInMinutes: 15 });
}
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'nn-sync') maybeAutoSync();
});
