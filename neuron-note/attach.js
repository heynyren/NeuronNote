/* Neuron Note — attachments (images and files pinned to a note)
   Kept in IndexedDB, deliberately NOT in chrome.storage with the notes: sync
   uploads every note as one JSON document to Drive, so a few pasted screenshots
   in there would bloat that file and eventually break syncing outright. Notes
   carry only a lightweight descriptor; the bytes live here on this machine. */
(function (root) {
  'use strict';

  const DB_NAME = 'neuron-note-files';
  const STORE = 'blobs';
  const VERSION = 1;

  // Chrome refuses to structured-clone a File across some IndexedDB paths, and a
  // Blob is all we need, so everything is stored as {blob, name, type, size}.
  const NA = {};

  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function tx(mode, fn) {
    return db().then(d => new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let out;
      try { out = fn(store); } catch (e) { reject(e); return; }
      // An IDBRequest always has `result` — undefined when the key is missing —
      // so test for the property, not its value, or a miss resolves to the
      // request object itself and every "not found" check reads as found.
      t.oncomplete = () => resolve(out && typeof out === 'object' && 'result' in out ? out.result : out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  NA.MAX_BYTES = 20 * 1024 * 1024;      // 20MB per file — a generous screenshot budget
  NA.IMAGE_MAX_EDGE = 1600;             // downscale pasted screenshots to something sane

  NA.isImage = function (type) { return /^image\//.test(type || ''); };

  NA.formatSize = function (bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  };

  function uid() {
    return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Shrink an oversized image before storing it. A 4K screenshot is ~8MB of PNG
   * and renders no better than a 1600px one in a note card. Anything that is not
   * an image, or that fails to decode, is stored untouched.
   */
  function shrinkImage(blob) {
    if (!NA.isImage(blob.type) || blob.type === 'image/gif' || blob.type === 'image/svg+xml') {
      return Promise.resolve(blob);
    }
    // Missing APIs throw synchronously, which a trailing .catch() would not see.
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      return Promise.resolve(blob);
    }
    return Promise.resolve().then(() => createImageBitmap(blob)).then(bmp => {
      const edge = Math.max(bmp.width, bmp.height);
      if (edge <= NA.IMAGE_MAX_EDGE) { bmp.close && bmp.close(); return blob; }
      const scale = NA.IMAGE_MAX_EDGE / edge;
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const canvas = new OffscreenCanvas(w, h);
      canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
      bmp.close && bmp.close();
      return canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
    }).catch(() => blob);
  }

  /**
   * Store one File/Blob and return the descriptor to hang on the note.
   * Rejects oversized files rather than silently filling the user's disk.
   */
  NA.put = function (file, name) {
    if (!file) return Promise.reject(new Error('No file'));
    if (file.size > NA.MAX_BYTES) {
      return Promise.reject(new Error('File is larger than ' + NA.formatSize(NA.MAX_BYTES)));
    }
    return shrinkImage(file).then(blob => {
      const rec = {
        id: uid(),
        name: name || file.name || (NA.isImage(blob.type) ? 'image' : 'file'),
        type: blob.type || file.type || 'application/octet-stream',
        size: blob.size,
        addedAt: Date.now(),
        blob
      };
      return tx('readwrite', store => store.put(rec)).then(() => ({
        id: rec.id, name: rec.name, type: rec.type, size: rec.size, addedAt: rec.addedAt
      }));
    });
  };

  NA.get = function (id) {
    return tx('readonly', store => store.get(id)).then(r => r || null);
  };

  NA.remove = function (id) { return tx('readwrite', store => store.delete(id)); };

  /** Object URLs handed out here are revoked by NA.releaseUrls when the view redraws. */
  const urls = new Map();
  NA.url = function (id) {
    if (urls.has(id)) return Promise.resolve(urls.get(id));
    return NA.get(id).then(rec => {
      if (!rec || !rec.blob) return '';
      const u = URL.createObjectURL(rec.blob);
      urls.set(id, u);
      return u;
    });
  };
  NA.releaseUrls = function () {
    urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    urls.clear();
  };

  /** Drop blobs no live note references any more. */
  NA.sweep = function (notes) {
    const keep = new Set();
    Object.keys(notes || {}).forEach(id => {
      const n = notes[id];
      if (n && !n.deleted) (n.files || []).forEach(f => f && f.id && keep.add(f.id));
    });
    return tx('readonly', store => store.getAllKeys()).then(keys =>
      Promise.all((keys || []).filter(k => !keep.has(k)).map(k => NA.remove(k)))
    ).then(gone => gone.length);
  };

  root.NNFiles = NA;
  if (typeof module !== 'undefined' && module.exports) module.exports = NA;
})(typeof self !== 'undefined' ? self : this);
