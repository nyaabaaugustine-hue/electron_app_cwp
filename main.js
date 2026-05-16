// ─────────────────────────────────────────────────────────────────────────────
// main.js  –  Cyber WhatsApp Pro · Electron Desktop App
// ─────────────────────────────────────────────────────────────────────────────

const {
  app, BrowserWindow, BrowserView, session,
  ipcMain, Tray, Menu, nativeImage, shell, Notification, protocol,
} = require("electron");
const path = require("path");
const fs   = require("fs");
const Store = require("electron-store");

const EXT_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "chrome_Extenton")
  : path.join(__dirname, "..", "chrome_Extenton");
const SHIM_PATH = path.join(__dirname, "chrome-shim.js");

// ── MUST run before new Store() or any app.getPath() call ────────────────────
const USER_DATA = path.join(__dirname, ".cwp-userdata");
if (!fs.existsSync(USER_DATA)) fs.mkdirSync(USER_DATA, { recursive: true });
app.setPath("userData", USER_DATA);
app.setPath("cache",    path.join(USER_DATA, "Cache"));
app.setPath("logs",     path.join(USER_DATA, "logs"));
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");

const store = new Store({ name: "cwp-data" });

let mainWindow = null, waView = null, panelWindow = null, tray = null;
let isQuitting = false;

const WA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── Register cwp:// BEFORE app ready ─────────────────────────────────────────
protocol.registerSchemesAsPrivileged([{
  scheme: "cwp",
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false, bypassCSP: true },
}]);

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  protocol.registerFileProtocol("cwp", (req, cb) => {
    const url  = new URL(req.url);
    const host = url.hostname;
    const rel  = url.pathname;

    let base;
    if (host === "ext")  base = EXT_DIR;
    else if (host === "shim") base = __dirname;
    else { cb({ error: -6 }); return; }

    const filePath = path.join(base, ...rel.split("/").filter(Boolean));
    cb({ path: filePath });
  });

  session.defaultSession.setUserAgent(WA_USER_AGENT);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const h = { ...details.responseHeaders };
    delete h["content-security-policy"];
    delete h["Content-Security-Policy"];
    h["Content-Security-Policy"] = ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob: cwp:;"];
    callback({ responseHeaders: h });
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const h = { ...details.requestHeaders };
    h["Origin"] = "https://cyberwhatsapp-back.vercel.app";
    callback({ requestHeaders: h });
  });

  createMainWindow();
  createTray();
});

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 600,
    title: "Cyber WhatsApp Pro",
    icon: iconPath(),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    show: true,
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

  waView.webContents.on("did-finish-load", () => setTimeout(injectExtensionScripts, 800));
  waView.webContents.on("did-navigate-in-page", () => setTimeout(injectExtensionScripts, 1800));

  mainWindow.on("resize",    sizeWaView);
  mainWindow.on("maximize",  sizeWaView);
  mainWindow.on("unmaximize", sizeWaView);
  mainWindow.on("close", e => { if (!isQuitting) { e.preventDefault(); mainWindow.hide(); } });
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    // Delay panel slightly so main window is fully settled first
    setTimeout(openPanelWindow, 1200);
  });

  // Fallback: open panel if main window never fired ready-to-show
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
    if (!panelWindow || panelWindow.isDestroyed()) openPanelWindow();
  }, 5000);
}

function sizeWaView() {
  if (!mainWindow || !waView) return;
  const [w, h] = mainWindow.getContentSize();
  waView.setBounds({ x: 0, y: 0, width: w, height: h });
}

// ─────────────────────────────────────────────────────────────────────────────
// Injection helpers
// ─────────────────────────────────────────────────────────────────────────────
async function injectInline(wc, scriptPath) {
  const name = path.basename(scriptPath);
  try {
    let code = fs.readFileSync(scriptPath, "utf8");
    if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);
    await wc.executeJavaScript(
      `(function(){\ntry{\n${code}\n}catch(__e){console.error('[CWP] Runtime error in ${name}:',__e.message);}\n})(); void 0;`,
      false
    );
    console.log("[CWP] ✓ inline:", name);
    return true;
  } catch (e) {
    console.warn("[CWP] inline inject failed:", name, "→", e.message);
    return false;
  }
}

async function injectScriptTagAwaited(wc, cwpUrl) {
  const name = cwpUrl.split("/").pop();
  const eventName = `cwp_loaded_${name.replace(/\./g, "_")}_${Date.now()}`;
  try {
    await wc.executeJavaScript(`
      (function(){
        var s = document.createElement('script');
        s.src = ${JSON.stringify(cwpUrl)};
        s.onload  = function(){ window.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)})); };
        s.onerror = function(){ console.error('[CWP] load error: ${name}'); window.dispatchEvent(new CustomEvent(${JSON.stringify(eventName)})); };
        (document.head || document.documentElement).appendChild(s);
      })();
    `, false);
    await wc.executeJavaScript(`
      new Promise(function(resolve){
        var t = setTimeout(resolve, 4000);
        window.addEventListener(${JSON.stringify(eventName)}, function(){ clearTimeout(t); resolve(); }, { once: true });
      });
    `, false);
    console.log("[CWP] ✓ script-tag:", name);
    return true;
  } catch (e) {
    console.warn("[CWP] script-tag failed:", name, "→", e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main injection sequence
// ─────────────────────────────────────────────────────────────────────────────
async function injectExtensionScripts() {
  const wc = waView.webContents;

  try {
    let shimCode = fs.readFileSync(SHIM_PATH, "utf8");
    if (shimCode.charCodeAt(0) === 0xFEFF) shimCode = shimCode.slice(1);
    await wc.executeJavaScript(`window.__CWP_EXT_BASE__ = "cwp://ext"; void 0;`);
    await wc.executeJavaScript(shimCode + "; void 0;");
    console.log("[CWP] chrome-shim.js injected");
  } catch (e) {
    console.error("[CWP] FATAL: shim inject failed:", e.message);
    return;
  }

  for (const f of [
    path.join(EXT_DIR, "css", "driver.css"),
    path.join(EXT_DIR, "css", "procntt.css"),
  ]) {
    try {
      await wc.insertCSS(fs.readFileSync(f, "utf8"));
      console.log("[CWP] ✓ css:", path.basename(f));
    } catch (e) {
      console.warn("[CWP] CSS failed:", path.basename(f), e.message);
    }
  }

  const smallScripts = [
    path.join(EXT_DIR, "js", "library", "jquery.js"),
    path.join(EXT_DIR, "js", "library", "driver.js.iife.js"),
    path.join(EXT_DIR, "js", "prodata.js"),
    path.join(EXT_DIR, "js", "ga-code.js"),
    path.join(EXT_DIR, "js", "protsrt.js"),
    path.join(EXT_DIR, "js", "driver.js"),
    path.join(EXT_DIR, "js", "promsg.js"),
  ];
  for (const s of smallScripts) await injectInline(wc, s);

  await wc.executeJavaScript(`
    if (typeof isAdvanceFeatureAvailable === 'undefined') window.isAdvanceFeatureAvailable = function(){ return true; };
    if (typeof isExpired === 'undefined')                  window.isExpired                = function(){ return false; };
    if (window.chrome && !window.chrome.runtime.getManifest) window.chrome.runtime.getManifest = function(){ return { version: '1.4.1', name: 'Cyber WhatsApp Pro' }; };
    void 0;
  `);
  await injectScriptTagAwaited(wc, "cwp://ext/js/procntt.js");
  await injectScriptTagAwaited(wc, "cwp://ext/js/proinjt.js");

  console.log("[CWP] Injection complete ✓");
}

// ── Pro Panel window ──────────────────────────────────────────────────────────
function openPanelWindow() {
  // If already open, just bring it forward
  if (panelWindow && !panelWindow.isDestroyed()) {
    if (panelWindow.isMinimized()) panelWindow.restore();
    panelWindow.show();
    panelWindow.focus();
    return;
  }

  panelWindow = new BrowserWindow({
    width: 420, height: 840, minWidth: 380, minHeight: 600,
    title: "Cyber WhatsApp Pro – Panel",
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,                 // start hidden; we show after load
    backgroundColor: "#1f2c34",
    alwaysOnTop: false,
  });

  panelWindow.loadFile(path.join(__dirname, "renderer", "panel.html"));

  // Show as soon as content is ready
  panelWindow.once("ready-to-show", () => {
    panelWindow.show();
    panelWindow.focus();
  });

  // Fallback: force-show after 3 s in case ready-to-show never fires
  const forceShow = setTimeout(() => {
    if (panelWindow && !panelWindow.isDestroyed() && !panelWindow.isVisible()) {
      panelWindow.show();
      panelWindow.focus();
    }
  }, 3000);
  panelWindow.once("show", () => clearTimeout(forceShow));

  // Hide instead of close (keeps state)
  panelWindow.on("close", e => {
    if (!isQuitting) {
      e.preventDefault();
      panelWindow.hide();
    }
  });
}

// ── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(nativeImage.createFromPath(iconPath("tray")));
  tray.setToolTip("Cyber WhatsApp Pro");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open WhatsApp",  click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: "Open Pro Panel", click: openPanelWindow },
    { type: "separator" },
    { label: "Quit", click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

// Focus the main WhatsApp window
ipcMain.handle("focusMain", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});

// Open (or show) the Pro Panel window
ipcMain.handle("openPanel", () => {
  openPanelWindow();
  return true;
});

// License verification — runs in main process (Node.js), no CORS
ipcMain.handle("verifyLicense", async (_, { licenseKey, deviceId }) => {
  console.log("[CWP] verifyLicense called for key:", licenseKey ? licenseKey.slice(0,8)+"..." : "none");
  try {
    const https = require("https");
    return await new Promise((resolve) => {
      const body = JSON.stringify({ licenseKey, deviceId });
      const opts = {
        hostname: "cyberwhatsapp-back.vercel.app",
        path: "/api/verify-license",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "Origin": "chrome-extension://cyberwhatsapppro",
          "User-Agent": "CyberWhatsAppPro/1.4.1 Electron",
        },
      };
      const req = https.request(opts, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          console.log("[CWP] License API status:", res.statusCode, "body:", data.slice(0, 200));
          try {
            const parsed = JSON.parse(data);
            resolve({ ok: true, status: res.statusCode, data: parsed });
          } catch {
            resolve({ ok: false, status: res.statusCode, error: "Server returned: " + data.slice(0, 100) });
          }
        });
      });
      req.on("error", e => {
        console.error("[CWP] License API network error:", e.message);
        resolve({ ok: false, error: e.message });
      });
      req.setTimeout(20000, () => { req.destroy(); resolve({ ok: false, error: "Request timed out after 20s" }); });
      req.write(body);
      req.end();
    });
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
ipcMain.handle("wa:executeScript", async (_, code) => {
  try { return await waView.webContents.executeJavaScript(code); } catch { return null; }
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
function iconPath(type = "main") {
  const a = path.join(__dirname, "assets");
  if (type === "tray") {
    const p = path.join(a, "icon.png");
    return fs.existsSync(p) ? p : path.join(EXT_DIR, "logo", "pro-small.png");
  }
  const p = path.join(a, "icon.ico");
  return fs.existsSync(p) ? p : path.join(EXT_DIR, "logo", "pro-large.png");
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.on("window-all-closed", () => {});
app.on("activate", () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
app.on("before-quit", () => { isQuitting = true; });
app.on("child-process-gone", (event, details) => {
  console.warn("[CWP] Child process gone:", details.type, details.reason);
  if (details.type === "Utility" && details.serviceName === "network.mojom.NetworkService") {
    console.log("[CWP] Network service crashed — app will continue.");
  }
});
