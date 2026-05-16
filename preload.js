// preload.js – Cyber WhatsApp Pro · Electron
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cwpBridge", {
  // Storage
  storeGet:    (key) => ipcRenderer.invoke("store:get",    key),
  storeSet:    (obj) => ipcRenderer.invoke("store:set",    obj),
  storeRemove: (key) => ipcRenderer.invoke("store:remove", key),
  storeGetAll: ()    => ipcRenderer.invoke("store:getAll"),

  // Notifications
  notify: (title, message) => ipcRenderer.invoke("notify", { title, message }),

  // External links
  openExternal: (url) => ipcRenderer.invoke("openExternal", url),

  // WhatsApp page control
  waExecute:    (code)             => ipcRenderer.invoke("wa:executeScript", code),
  waSendToPage: (channel, payload) => ipcRenderer.invoke("wa:sendToPage", channel, payload),

  // Focus the main WhatsApp window
  focusMain: () => ipcRenderer.invoke("focusMain"),

  // Open / show the Pro Panel window
  openPanel: () => ipcRenderer.invoke("openPanel"),

  // License verification (runs in main process — no CORS)
  verifyLicense: (licenseKey, deviceId) => ipcRenderer.invoke("verifyLicense", { licenseKey, deviceId }),

  // App info
  platform:   process.platform,
  isElectron: true,
});
