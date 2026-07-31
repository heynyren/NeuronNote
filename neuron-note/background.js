/* Neuron Note — service worker */
importScripts('shared.js');

const MENU_SAVE = 'nn-save';
const MENU_OPEN = 'nn-open';
const MENU_MANAGE = 'nn-manage';
const SAVE_PREFIX = 'nn-save::';   // + encodeURIComponent(tên nhãn)

/* ---------------- menu chuột phải ---------------- */
async function buildMenus() {
  const settings = await NN.getSettings();
  const labels = settings.labels || [];

  await new Promise(r => chrome.contextMenus.removeAll(r));

  if (!labels.length) {
    // chưa có nhãn nào → một mục lưu đơn
    chrome.contextMenus.create({ id: MENU_SAVE, title: 'Save to Neuron Note', contexts: ['selection'] });
  } else {
    chrome.contextMenus.create({ id: MENU_SAVE, title: 'Save to Neuron Note', contexts: ['selection'] });
    labels.forEach(l => {
      chrome.contextMenus.create({
        id: SAVE_PREFIX + encodeURIComponent(l.name),
        parentId: MENU_SAVE,
        title: '#' + l.name + (settings.activeLabel === l.name ? '  ·  mặc định' : ''),
        contexts: ['selection']
      });
    });
    chrome.contextMenus.create({ id: 'nn-sep1', parentId: MENU_SAVE, type: 'separator', contexts: ['selection'] });
    chrome.contextMenus.create({ id: SAVE_PREFIX, parentId: MENU_SAVE, title: '(Không nhãn)', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'nn-sep2', parentId: MENU_SAVE, type: 'separator', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENU_MANAGE, parentId: MENU_SAVE, title: 'Quản lý nhãn…', contexts: ['selection'] });
  }

  chrome.contextMenus.create({ id: MENU_OPEN, title: 'Mở thư viện Neuron Note', contexts: ['action', 'page'] });
}

chrome.runtime.onInstalled.addListener(() => { buildMenus(); scheduleSync(); });
chrome.runtime.onStartup.addListener(() => { buildMenus(); scheduleSync(); });

// dựng lại menu mỗi khi danh sách nhãn / nhãn mặc định đổi
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
  if (id === MENU_SAVE) label = '';                       // mục lưu đơn (chưa có nhãn nào)
  else if (id === SAVE_PREFIX) label = '';                // (Không nhãn)
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
    captureAndSave(tabs[0], '', s.activeLabel || '');   // phím tắt dùng nhãn mặc định
  });
});

function openLibrary(hash) {
  chrome.tabs.create({ url: chrome.runtime.getURL('notes.html' + (hash || '')) });
}

/* ---------------- lưu đoạn bôi đen ---------------- */
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
    console.warn('[NeuronNote] không chèn được content script vào tab này:', e && e.message,
      '— có thể là trang chrome://, cửa hàng tiện ích, PDF hoặc file:// (những trang này Chrome cấm).');
    return false;
  }
}

async function flashBadge(tabId, text, color) {
  try {
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color: color || '#A3352A' });
  } catch (e) { /* tab đã đóng */ }
}

async function captureAndSave(tab, fallbackText, label) {
  try {
    label = label || '';
    console.log('[NeuronNote] lưu — tab', tab && tab.id, '| nhãn:', label || '(không)');
    const ok = await ensureContentScript(tab.id);
    console.log('[NeuronNote] content script sẵn sàng:', ok);

    let cap = ok ? await askTab(tab.id, { type: 'CAPTURE' }) : null;
    console.log('[NeuronNote] capture:', cap ? (cap.text || '(rỗng)').slice(0, 40) : 'null',
      '| fallback:', (fallbackText || '').slice(0, 40));

    if (!cap || !cap.text) {
      if (!fallbackText.trim()) {
        console.warn('[NeuronNote] không có đoạn nào để lưu.');
        if (ok) askTab(tab.id, { type: 'TOAST', text: 'Chưa có đoạn nào được bôi đen.' });
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
      note: '',
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
    const check = await NN.getNotes();
    console.log('[NeuronNote] ✔ đã lưu', note.id, '| nhãn:', label || '(không)', '| tổng:', NN.live(check).length);

    refreshBadge(tab.id, note.url);

    // lưu thẳng: chỉ tô highlight + báo nhẹ, KHÔNG mở thẻ ghi chú
    const shown = await askTab(tab.id, { type: 'SAVED', note, label });
    if (!shown) {
      flashBadge(tab.id, '✓', '#007D7A');
      setTimeout(() => refreshBadge(tab.id, note.url), 1500);
    }

    if (settings.autoSync && settings.syncUrl) syncNow().catch(() => {});
  } catch (err) {
    console.error('[NeuronNote] LỖI khi lưu:', err);
    flashBadge(tab && tab.id, '!', '#A3352A');
  }
}

/* ---------------- huy hiệu số note trên trang ---------------- */
async function refreshBadge(tabId, url) {
  const notes = await NN.getNotes();
  const key = NN.normalizeUrl(url);
  const n = NN.live(notes).filter(x => NN.normalizeUrl(x.url) === key).length;
  try {
    chrome.action.setBadgeText({ tabId, text: n ? String(n) : '' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#007D7A' });
  } catch (e) { /* tab đã đóng */ }
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.url) refreshBadge(tabId, tab.url);
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => {
    if (!chrome.runtime.lastError && tab && tab.url) refreshBadge(tabId, tab.url);
  });
});

/* ---------------- thông điệp từ content / trang ---------------- */
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
  return true; // trả lời bất đồng bộ
});

/* ---------------- đồng bộ qua Apps Script ---------------- */
async function maybeAutoSync() {
  const s = await NN.getSettings();
  if (s.autoSync && s.syncUrl) syncNow().catch(() => {});
}

let syncing = false;
async function syncNow() {
  const s = await NN.getSettings();
  if (!s.syncUrl) return { ok: false, error: 'Chưa cài link Apps Script.' };
  if (syncing) return { ok: false, error: 'Đang đồng bộ…' };
  syncing = true;
  try {
    const local = await NN.getNotes();
    const res = await fetch(s.syncUrl, {
      method: 'POST',
      // text/plain để tránh preflight CORS của Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'sync', key: s.syncKey || '', notes: local })
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { throw new Error('Máy chủ trả về không phải JSON. Kiểm tra quyền truy cập "Anyone" của Web App.'); }
    if (!data.ok) throw new Error(data.error || 'Đồng bộ thất bại.');

    const merged = NN.merge(local, data.notes || {});
    await NN.setNotes(merged.notes);
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
