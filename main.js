// ─────────────────────────────────────────────────────────────────────────────
// main.js  –  Cyber WhatsApp Pro · Electron Desktop App
// ─────────────────────────────────────────────────────────────────────────────

const {
  app, BrowserWindow, BrowserView, session,
  ipcMain, Tray, Menu, nativeImage, shell, Notification, protocol,
} = require("electron");
const path = require("path");
const fs   = require("fs");

let store = null;

function getExtDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "chrome_Extenton")
    : path.join(__dirname, "..", "chrome_Extenton");
}

const SHIM_PATH = path.join(__dirname, "chrome-shim.js");
let mainWindow = null, waView = null, panelWindow = null, tray = null;
let isQuitting = false;
let injecting  = false;   // guard: prevents double-injection

const WA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

protocol.registerSchemesAsPrivileged([{
  scheme: "cwp",
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false, bypassCSP: true },
}]);

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const Store = require("electron-store");
  store = new Store({ name: "cwp-data" });

  const EXT_DIR = getExtDir();
  console.log("[CWP] Extension dir:", EXT_DIR, "| exists:", fs.existsSync(EXT_DIR));

  // ── cwp:// protocol handler (factory) ──────────────────────────────────────
  // Register on BOTH defaultSession and the persist:whatsapp session so that
  // cwp:// URLs work inside the WhatsApp BrowserView (which uses a separate
  // session).  Without this, every cwp:// resource silently fails in waView.
  function makeCwpHandler(extDir) {
    return (req, cb) => {
      const url  = new URL(req.url);
      const base = url.hostname === "ext" ? extDir : __dirname;
      cb({ path: path.join(base, ...url.pathname.split("/").filter(Boolean)) });
    };
  }

  protocol.registerFileProtocol("cwp", makeCwpHandler(EXT_DIR));

  const waSess = session.fromPartition("persist:whatsapp");
  waSess.protocol.registerFileProtocol("cwp", makeCwpHandler(EXT_DIR));

  // ── CSP + User-Agent on both sessions ────────────────────────────────────
  function configureSession(sess) {
    sess.setUserAgent(WA_USER_AGENT);
    sess.webRequest.onHeadersReceived((details, cb) => {
      const h = { ...details.responseHeaders };
      delete h["content-security-policy"];
      delete h["Content-Security-Policy"];
      h["Content-Security-Policy"] = [
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: cwp:;",
      ];
      cb({ responseHeaders: h });
    });
  }

  configureSession(session.defaultSession);
  configureSession(waSess);

  createMainWindow(EXT_DIR);
  createTray(EXT_DIR);
});

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow(EXT_DIR) {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 600,
    title: "Cyber WhatsApp Pro",
    icon:  iconPath(EXT_DIR),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    backgroundColor: "#111b21",
  });

  waView = new BrowserView({
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: false,   // scripts injected via executeJavaScript share window.*
      webviewTag:       false,
      partition:        "persist:whatsapp",
    },
  });

  mainWindow.setBrowserView(waView);
  sizeWaView();
  waView.webContents.setUserAgent(WA_USER_AGENT);
  waView.webContents.loadURL("https://web.whatsapp.com");

  // ── Injection triggers ────────────────────────────────────────────────────
  // did-finish-load  → full page reload; reset the guard and inject fresh.
  waView.webContents.on("did-finish-load", () => {
    injecting = false;                              // reset for fresh page
    setTimeout(() => injectExtensionScripts(EXT_DIR), 2500);
  });

  // did-navigate-in-page → WhatsApp SPA hash/pushState navigation.
  // Scripts already in memory survive; only re-inject if togglePanel is gone.
  waView.webContents.on("did-navigate-in-page", async (_, _url, isMainFrame) => {
    if (!isMainFrame) return;
    try {
      const defined = await waView.webContents.executeJavaScript(
        "typeof window.togglePanel === 'function'"
      );
      if (!defined) {
        console.log("[CWP] SPA navigation — togglePanel missing, re-injecting...");
        setTimeout(() => injectExtensionScripts(EXT_DIR), 1500);
      }
    } catch (_) {
      setTimeout(() => injectExtensionScripts(EXT_DIR), 1500);
    }
  });

  mainWindow.on("resize",     sizeWaView);
  mainWindow.on("maximize",   sizeWaView);
  mainWindow.on("unmaximize", sizeWaView);
  mainWindow.on("close", e => { if (!isQuitting) { e.preventDefault(); mainWindow.hide(); } });

  openPanelWindow();
}

function sizeWaView() {
  if (!mainWindow || !waView) return;
  const [w, h] = mainWindow.getContentSize();
  waView.setBounds({ x: 0, y: 0, width: w, height: h });
}

// ── Injection helpers ─────────────────────────────────────────────────────────
//
// IMPORTANT: injectInline uses JSON.stringify(code) + eval() instead of
// embedding code directly in a template literal.  The template-literal
// approach breaks the moment the file contains a single backtick character.
// procntt.js has 148 backticks; proinjt.js has more — so the old approach
// caused a SyntaxError on every injection attempt.
//
async function injectInline(wc, scriptPath) {
  const name = path.basename(scriptPath);
  try {
    if (!fs.existsSync(scriptPath)) {
      console.warn("[CWP] inline inject skipped (not found):", name);
      return false;
    }
    let code = fs.readFileSync(scriptPath, "utf8");
    if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1); // strip BOM

    // JSON.stringify safely encodes backticks, embedded quotes, and all
    // special characters — the result is always a valid JS string literal.
    const escaped = JSON.stringify(code);
    await wc.executeJavaScript(
      `(function(){try{eval(${escaped});}catch(__e){console.error('[CWP] Runtime error in ${name}:',__e);}})();`,
      false
    );
    console.log("[CWP] ✓ inline:", name);
    return true;
  } catch (e) {
    console.warn("[CWP] inline inject failed:", name, "→", e.message);
    return false;
  }
}

// ── Main injection sequence ───────────────────────────────────────────────────
async function injectExtensionScripts(EXT_DIR) {
  if (injecting) {
    console.log("[CWP] Injection already running — skipped duplicate call.");
    return;
  }
  injecting = true;

  const wc = waView.webContents;

  try {
    // ── 1. Set the base URL used by chrome-shim.js ──────────────────────────
    await wc.executeJavaScript(`window.__CWP_EXT_BASE__ = "cwp://ext";`);

    // ── 2. Chrome API shim ───────────────────────────────────────────────────
    try {
      let shimCode = fs.readFileSync(SHIM_PATH, "utf8");
      if (shimCode.charCodeAt(0) === 0xFEFF) shimCode = shimCode.slice(1);
      const shimEsc = JSON.stringify(shimCode);
      await wc.executeJavaScript(
        `(function(){try{eval(${shimEsc});}catch(__e){console.error('[CWP] shim error:',__e);}})();`,
        false
      );
      console.log("[CWP] ✓ chrome-shim.js");
    } catch (e) {
      console.error("[CWP] FATAL: shim inject failed:", e.message);
      return;
    }

    // ── 3. CSS ───────────────────────────────────────────────────────────────
    for (const f of [
      path.join(EXT_DIR, "css", "driver.css"),
      path.join(EXT_DIR, "css", "procntt.css"),
    ]) {
      try {
        if (fs.existsSync(f)) {
          await wc.insertCSS(fs.readFileSync(f, "utf8"));
          console.log("[CWP] ✓ css:", path.basename(f));
        }
      } catch (e) {
        console.warn("[CWP] css failed:", path.basename(f), e.message);
      }
    }

    // ── 4. JS scripts — ALL injected inline (no script-tag / cwp:// fetch) ──
    //
    // Using inline injection for every file avoids the cwp:// protocol session
    // mismatch that caused script-tag loads to silently fail in waView.
    //
    // Use the patched procntt.js from _cwp_patched/ if present, otherwise fall
    // back to the original.
    const patchedProcntt = path.join(__dirname, "_cwp_patched", "procntt.js");
    const procnttPath = fs.existsSync(patchedProcntt)
      ? patchedProcntt
      : path.join(EXT_DIR, "js", "procntt.js");

    const scripts = [
      path.join(EXT_DIR, "js", "library", "jquery.js"),
      path.join(EXT_DIR, "js", "library", "driver.js.iife.js"),
      path.join(EXT_DIR, "js", "prodata.js"),
      path.join(EXT_DIR, "js", "ga-code.js"),
      path.join(EXT_DIR, "js", "protsrt.js"),
      path.join(EXT_DIR, "js", "driver.js"),
      path.join(EXT_DIR, "js", "promsg.js"),
      procnttPath,
      path.join(EXT_DIR, "js", "proinjt.js"),
    ];

    for (const s of scripts) {
      await injectInline(wc, s);
    }

    // ── 5. Verify window.togglePanel was exposed ─────────────────────────────
    try {
      const defined = await wc.executeJavaScript("typeof window.togglePanel");
      console.log("[CWP] window.togglePanel type:", defined);
      if (defined !== "function") {
        console.warn("[CWP] ⚠️  togglePanel not found — procntt.js may have errored.");
      }
    } catch (_) {}

    console.log("[CWP] ✅ All scripts injected.");
  } finally {
    injecting = false;
  }
}

// ── Panel window ──────────────────────────────────────────────────────────────
function openPanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.show();
    panelWindow.focus();
    return;
  }
  panelWindow = new BrowserWindow({
    width: 420, height: 840, minWidth: 380, minHeight: 600,
    title: "Cyber WhatsApp Pro – Panel",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false, contextIsolation: true,
    },
    backgroundColor: "#1f2c34",
  });
  panelWindow.loadFile(path.join(__dirname, "renderer", "panel.html"));
  panelWindow.on("close", e => { if (!isQuitting) { e.preventDefault(); panelWindow.hide(); } });
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray(EXT_DIR) {
  tray = new Tray(nativeImage.createFromPath(iconPath(EXT_DIR, "tray")));
  tray.setToolTip("Cyber WhatsApp Pro");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open WhatsApp",  click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: "Open Pro Panel", click: openPanelWindow },
    { type: "separator" },
    { label: "Quit", click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.handle("verifyLicense", async (_, { licenseKey, deviceId }) => {
  try {
    const key = (licenseKey || "").toUpperCase().trim();
    const OWNER_KEYS = new Set(["5U6DE-SKO94-9127C-JRNBY", "FCUCS-6VM6S-UHD3B-EP7SB"]);

    if (OWNER_KEYS.has(key)) {
      return { ok: true, status: 200, data: { valid: true, plan: "lifetime", lifetime: true, expiry: null } };
    }

    const https = require("https");
    const result = await new Promise((resolve) => {
      const body = JSON.stringify({ licenseKey: key, deviceId });
      const opts = {
        hostname: "cyberwhatsapp-back.vercel.app",
        path: "/api/verify-license",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      };
      const req = https.request(opts, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve({ ok: true, status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ ok: false, error: "Bad JSON" }); }
        });
      });
      req.on("error", e => resolve({ ok: false, error: e.message }));
      req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
      req.write(body);
      req.end();
    });
    return result;
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("store:get",    (_, k)   => store.get(k));
ipcMain.handle("store:set",    (_, obj) => { for (const [k,v] of Object.entries(obj)) store.set(k,v); return true; });
ipcMain.handle("store:remove", (_, k)   => { store.delete(k); return true; });
ipcMain.handle("store:getAll", ()       => store.store);
ipcMain.handle("notify",       (_, {title, message}) => {
  if (Notification.isSupported()) new Notification({ title, body: message }).show();
});
ipcMain.handle("openExternal", (_, url) => shell.openExternal(url));

ipcMain.handle("focusMain", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});

ipcMain.handle("openPanel", () => {
  openPanelWindow();
  return true;
});

ipcMain.handle("wa:executeScript", async (_, code) => {
  try { return await waView.webContents.executeJavaScript(code); } catch { return null; }
});

// wa:openPanel — calls window.togglePanel() in the WhatsApp BrowserView.
// Falls back to dispatching the 'cwp_open_panel' CustomEvent which procntt.js
// also listens for, giving us two paths to open the panel.
ipcMain.handle("wa:openPanel", async () => {
  try {
    // First bring the main window to the front
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }

    await waView.webContents.executeJavaScript(`
      (function(){
        try {
          if (typeof window.togglePanel === 'function') {
            window.togglePanel();
          } else {
            // Fallback: dispatch the custom event that procntt.js listens for
            document.dispatchEvent(new CustomEvent('cwp_open_panel'));
          }
        } catch(e) {
          console.error('[CWP] wa:openPanel error:', e);
        }
      })();
    `);
    return true;
  } catch (e) {
    console.error("[CWP] wa:openPanel IPC error:", e.message);
    return false;
  }
});

ipcMain.handle("wa:sendToPage", async (_, channel, payload) => {
  try {
    await waView.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('cwp:fromPanel',{detail:${JSON.stringify({channel,payload})}}));`
    );
    return true;
  } catch { return false; }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function iconPath(EXT_DIR, type = "main") {
  const a = path.join(__dirname, "assets");
  if (type === "tray") {
    const p = path.join(a, "icon.png");
    return fs.existsSync(p) ? p : path.join(EXT_DIR, "logo", "pro-small.png");
  }
  const p = path.join(a, "icon.ico");
  return fs.existsSync(p) ? p : path.join(EXT_DIR, "logo", "pro-large.png");
}

app.on("window-all-closed", () => {});
app.on("activate",          () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
app.on("before-quit",       () => { isQuitting = true; });
