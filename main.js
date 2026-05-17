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

  protocol.registerFileProtocol("cwp", (req, cb) => {
    const url  = new URL(req.url);
    const base = url.hostname === "ext" ? EXT_DIR : __dirname;
    cb({ path: path.join(base, ...url.pathname.split("/").filter(Boolean)) });
  });

  session.defaultSession.setUserAgent(WA_USER_AGENT);
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const h = { ...details.responseHeaders };
    delete h["content-security-policy"];
    delete h["Content-Security-Policy"];
    h["Content-Security-Policy"] = ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob: cwp:;"];
    cb({ responseHeaders: h });
  });

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
      contextIsolation: false,
      webviewTag:       false,
      partition:        "persist:whatsapp",
    },
  });

  mainWindow.setBrowserView(waView);
  sizeWaView();
  waView.webContents.setUserAgent(WA_USER_AGENT);
  waView.webContents.loadURL("https://web.whatsapp.com");

  waView.webContents.on("did-finish-load",      () => injectExtensionScripts(EXT_DIR));
  waView.webContents.on("did-navigate-in-page", () => setTimeout(() => injectExtensionScripts(EXT_DIR), 1500));

  mainWindow.on("resize",     sizeWaView);
  mainWindow.on("maximize",   sizeWaView);
  mainWindow.on("unmaximize", sizeWaView);
  mainWindow.on("close", e => { if (!isQuitting) { e.preventDefault(); mainWindow.hide(); } });

  // Open panel once window is on screen
  openPanelWindow();
}

function sizeWaView() {
  if (!mainWindow || !waView) return;
  const [w, h] = mainWindow.getContentSize();
  waView.setBounds({ x: 0, y: 0, width: w, height: h });
}

// ── Injection helpers ─────────────────────────────────────────────────────────
async function injectInline(wc, scriptPath) {
  const name = path.basename(scriptPath);
  try {
    if (!fs.existsSync(scriptPath)) {
      console.warn("[CWP] inline inject skipped (file not found):", name);
      return false;
    }
    let code = fs.readFileSync(scriptPath, "utf8");
    if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
    await wc.executeJavaScript(
      `(function(){\ntry{\n${code}\n}catch(__e){console.error('[CWP] Runtime error in ${name}:',__e.message);}\n})();`, false
    );
    console.log("[CWP] ✓ inline:", name);
    return true;
  } catch (e) {
    console.warn("[CWP] inline inject failed:", name, "→", e.message);
    return false;
  }
}

async function injectScriptTag(wc, cwpUrl) {
  const name = cwpUrl.split("/").pop();
  try {
    await wc.executeJavaScript(`
      (function(){
        var s = document.createElement('script');
        s.src = ${JSON.stringify(cwpUrl)};
        s.onerror = function(){ console.error('[CWP] script load error: ${name}'); };
        (document.head || document.documentElement).appendChild(s);
      })();
    `, false);
    await new Promise(r => setTimeout(r, 700));
    console.log("[CWP] ✓ script-tag:", name);
    return true;
  } catch (e) {
    console.warn("[CWP] script-tag failed:", name, "→", e.message);
    return false;
  }
}

async function injectExtensionScripts(EXT_DIR) {
  const wc = waView.webContents;

  // 1. Chrome shim first
  try {
    let shimCode = fs.readFileSync(SHIM_PATH, "utf8");
    if (shimCode.charCodeAt(0) === 0xFEFF) shimCode = shimCode.slice(1);
    await wc.executeJavaScript(`window.__CWP_EXT_BASE__ = "cwp://ext";`);
    await wc.executeJavaScript(shimCode);
    console.log("[CWP] chrome-shim.js injected ✓");
  } catch (e) {
    console.error("[CWP] FATAL: shim inject failed:", e.message);
    return;
  }

  // 2. CSS
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
      console.warn("[CWP] CSS failed:", path.basename(f), e.message);
    }
  }

  // 3. Small scripts inline
  for (const s of [
    path.join(EXT_DIR, "js", "library", "jquery.js"),
    path.join(EXT_DIR, "js", "library", "driver.js.iife.js"),
    path.join(EXT_DIR, "js", "prodata.js"),
    path.join(EXT_DIR, "js", "ga-code.js"),
    path.join(EXT_DIR, "js", "protsrt.js"),
    path.join(EXT_DIR, "js", "driver.js"),
    path.join(EXT_DIR, "js", "promsg.js"),
  ]) { await injectInline(wc, s); }

  // 4. Large scripts via script tag
  // Note: We use the patched procntt.js if available
  const patchedProcntt = path.join(__dirname, "_cwp_patched", "procntt.js");
  if (fs.existsSync(patchedProcntt)) {
    console.log("[CWP] Injecting patched procntt.js inline...");
    await injectInline(wc, patchedProcntt);
    await injectScriptTag(wc, "cwp://ext/js/proinjt.js");
  } else {
    for (const url of ["cwp://ext/js/procntt.js", "cwp://ext/js/proinjt.js"]) {
      await injectScriptTag(wc, url);
    }
  }

  console.log("[CWP] All scripts injected ✓");
}

// ── Panel window ──────────────────────────────────────────────────────────────
function openPanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) { panelWindow.show(); panelWindow.focus(); return; }
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

// ── Tray ─────────────────────────────────────────────────────────────────────
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

ipcMain.handle("wa:openPanel", async () => {
  try {
    await waView.webContents.executeJavaScript(`
      (function(){
        try {
          if (typeof togglePanel === 'function') { togglePanel(); }
          else { document.dispatchEvent(new CustomEvent('cwp_open_panel')); }
        } catch(e) { console.error('[CWP] wa:openPanel error:', e); }
      })();
    `);
    return true;
  } catch { return false; }
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
