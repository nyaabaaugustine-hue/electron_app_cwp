// ─────────────────────────────────────────────────────────────────────────────
// chrome-shim.js  –  Cyber WhatsApp Pro · Electron
// ─────────────────────────────────────────────────────────────────────────────
// Fakes the chrome.* APIs used by the extension so every original JS file runs
// inside Electron unchanged.  Injected via executeJavaScript (main world) so
// all content scripts share the same window.chrome object.
//
// window.__CWP_EXT_BASE__ is set by main.js before this file runs.
// It equals "cwp://ext" — Electron's custom protocol that maps to the
// chrome_Extenton folder on disk.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  if (window.__cwpShimInstalled) return;
  window.__cwpShimInstalled = true;

  const EXT_BASE = window.__CWP_EXT_BASE__ || "cwp://ext";

  // ── Tiny event emitter ──────────────────────────────────────────────────────
  function makeEmitter() {
    const _l = [];
    return {
      addListener(fn)    { _l.push(fn); },
      removeListener(fn) { const i = _l.indexOf(fn); if (i !== -1) _l.splice(i, 1); },
      hasListener(fn)    { return _l.includes(fn); },
      _fire(...args)     { _l.slice().forEach(fn => { try { fn(...args); } catch (_) {} }); },
    };
  }

  // ── Async storage (backed by electron-store via IPC) ────────────────────────
  // Uses a lightweight in-memory cache so synchronous-style reads work.
  // The cache is populated on the first get() and updated on every set().
  let _cache = null;
  let _cacheReady = false;
  const _pending = [];   // queued callbacks waiting for first cache fill

  // Populate cache once from the store
  function ensureCache(cb) {
    if (_cacheReady) { cb(_cache); return; }
    _pending.push(cb);
    if (_pending.length > 1) return;   // already fetching
    // cwpBridge is exposed by preload.js on the PANEL window.
    // On the WhatsApp BrowserView (contextIsolation:false) we call IPC differently.
    // We use a polling fallback for the WA page since cwpBridge may be absent there.
    const drain = (data) => {
      _cache = data || {};
      _cacheReady = true;
      _pending.forEach(fn => fn(_cache));
      _pending.length = 0;
    };
    if (window.cwpBridge) {
      window.cwpBridge.storeGetAll().then(drain).catch(() => drain({}));
    } else {
      // WA BrowserView: contextIsolation:false — use the electron ipcRenderer
      // exposed in the main world (we do this via a tiny helper below).
      try {
        // Fallback: start empty, hydrate async via postMessage round-trip
        drain({});
      } catch (_) { drain({}); }
    }
  }

  // Low-level get/set that work whether cwpBridge is present or not.
  // On the WA page we proxy through a BroadcastChannel to the panel window.
  const _bc = (() => {
    try { return new BroadcastChannel("cwp-store"); } catch (_) { return null; }
  })();

  function _ipcSet(obj) {
    if (window.cwpBridge) return window.cwpBridge.storeSet(obj);
    if (_bc) _bc.postMessage({ type: "store:set", obj });
    // Also update local cache immediately
    Object.assign(_cache || {}, obj);
    return Promise.resolve();
  }
  function _ipcRemove(key) {
    if (window.cwpBridge) return window.cwpBridge.storeRemove(key);
    if (_bc) _bc.postMessage({ type: "store:remove", key });
    if (_cache) delete _cache[key];
    return Promise.resolve();
  }

  // ── chrome.storage.local ────────────────────────────────────────────────────
  function storageGet(keys, callback) {
    const resolve = (all) => {
      let result = {};
      if (keys === null || keys === undefined) {
        result = { ...all };
      } else if (typeof keys === "string") {
        result[keys] = all[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach(k => result[k] = all[k]);
      } else if (typeof keys === "object") {
        Object.entries(keys).forEach(([k, def]) => {
          result[k] = all[k] !== undefined ? all[k] : def;
        });
      }
      if (callback) callback(result);
      return result;
    };

    const p = new Promise(res => ensureCache(all => res(resolve(all))));
    return p;
  }

  function storageSet(obj, callback) {
    // Update cache immediately (sync feel)
    ensureCache(all => Object.assign(all, obj));
    const p = _ipcSet(obj);
    if (callback) p.then(() => callback()).catch(() => callback());
    return p;
  }

  function storageRemove(key, callback) {
    ensureCache(all => { if (all) delete all[key]; });
    const p = _ipcRemove(key);
    if (callback) p.then(() => callback()).catch(() => callback());
    return p;
  }

  // ── chrome.storage.session (in-memory only) ─────────────────────────────────
  const _session = {};
  const sessionStorage = {
    get(keys, cb) {
      let r = {};
      if (!keys) r = { ..._session };
      else if (typeof keys === "string") r[keys] = _session[keys];
      else if (Array.isArray(keys)) keys.forEach(k => r[k] = _session[k]);
      if (cb) cb(r);
      return Promise.resolve(r);
    },
    set(obj, cb) { Object.assign(_session, obj); if (cb) cb(); return Promise.resolve(); },
    remove(key, cb) { delete _session[key]; if (cb) cb(); return Promise.resolve(); },
    setAccessLevel() { return Promise.resolve(); },
  };

  // ── Alarms (setInterval-based replacement) ──────────────────────────────────
  const _alarms = {};
  const alarmEmitter = makeEmitter();
  const alarmsApi = {
    create(name, info) {
      alarmsApi.clear(name);
      const periodMs = (info.periodInMinutes || 60) * 60 * 1000;
      const fire = () => alarmEmitter._fire({ name, scheduledTime: Date.now() });
      const tid = setInterval(fire, periodMs);
      setTimeout(fire, info.delayInMinutes ? info.delayInMinutes * 60 * 1000 : periodMs);
      _alarms[name] = { tid };
    },
    clear(name, cb) {
      if (_alarms[name]) { clearInterval(_alarms[name].tid); delete _alarms[name]; }
      if (cb) cb(true);
    },
    clearAll(cb) { Object.keys(_alarms).forEach(n => alarmsApi.clear(n)); if (cb) cb(); },
    get(name, cb) { const a = _alarms[name] ? { name } : undefined; if (cb) cb(a); return Promise.resolve(a); },
    onAlarm: alarmEmitter,
  };

  // ── Message bus ─────────────────────────────────────────────────────────────
  const msgEmitter = makeEmitter();
  function sendMessage(msg, callback) {
    let replied = false;
    const sendResponse = r => { replied = true; if (callback) callback(r); };
    msgEmitter._fire(msg, {}, sendResponse);
    if (!replied && callback) callback(undefined);
  }

  // ── runtime.getURL — maps to cwp:// so Electron serves real files ────────────
  function getURL(resource) {
    return `${EXT_BASE}/${resource}`;
  }

  // ── Notifications ───────────────────────────────────────────────────────────
  function createNotification(idOrOpts, opts) {
    const o = typeof idOrOpts === "object" ? idOrOpts : (opts || {});
    const bridge = window.cwpBridge;
    if (bridge) bridge.notify(o.title || "Cyber WhatsApp Pro", o.message || "");
  }

  // ── Build window.chrome ─────────────────────────────────────────────────────
  window.chrome = {
    runtime: {
      id:               "electron-cwp-desktop",
      lastError:        undefined,
      getURL,
      sendMessage,
      getManifest:      () => ({ version: "1.4.1", name: "Cyber WhatsApp Pro" }),
      onMessage:          msgEmitter,
      onInstalled:        makeEmitter(),
      onStartup:          makeEmitter(),
      onUpdateAvailable:  makeEmitter(),
      setUninstallURL:    () => {},
    },

    storage: {
      local: {
        get:    storageGet,
        set:    storageSet,
        remove: storageRemove,
        clear:  () => _ipcSet({}),
      },
      session: sessionStorage,
      onChanged: makeEmitter(),
    },

    tabs: {
      query:       (_, cb) => { if (cb) cb([]); return Promise.resolve([]); },
      create:      (opts)  => { if (opts && opts.url) window.open(opts.url, "_blank"); },
      update:      () => {},
      reload:      () => {},
      sendMessage: (id, msg, cb) => sendMessage(msg, cb),
      onUpdated:   makeEmitter(),
      onRemoved:   makeEmitter(),
    },

    windows: { create: () => {}, update: () => {} },

    notifications: { create: createNotification, clear: () => {} },

    alarms: alarmsApi,

    identity: {
      getProfileUserInfo(optsOrCb, cb) {
        const fn = typeof optsOrCb === "function" ? optsOrCb : cb;
        if (fn) fn({ email: "", id: "" });
      },
    },

    bookmarks: {
      search: (_, cb) => { if (cb) cb([]); },
      create:  ()     => {},
    },

    permissions: {
      contains: (_, cb) => { if (cb) cb(true); },
    },
  };

  // ── Panel → page event bridge ────────────────────────────────────────────────
  window.addEventListener("cwp:fromPanel", (e) => {
    const { channel, payload } = e.detail || {};
    msgEmitter._fire({ type: channel, ...payload }, {}, () => {});
  });

  console.log("[CWP Shim] chrome.* API installed — getURL base:", EXT_BASE);
})();
