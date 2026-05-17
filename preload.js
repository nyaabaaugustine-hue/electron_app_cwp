// preload.js – Cyber WhatsApp Pro · Electron
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cwpBridge", {
  storeGet:      (key)             => ipcRenderer.invoke("store:get",      key),
  storeSet:      (obj)             => ipcRenderer.invoke("store:set",      obj),
  storeRemove:   (key)             => ipcRenderer.invoke("store:remove",   key),
  storeGetAll:   ()                => ipcRenderer.invoke("store:getAll"),
  notify:        (title, message)  => ipcRenderer.invoke("notify",         { title, message }),
  openExternal:  (url)             => ipcRenderer.invoke("openExternal",   url),
  focusMain:     ()                => ipcRenderer.invoke("focusMain"),
  openPanel:     ()                => ipcRenderer.invoke("openPanel"),
  waExecute:     (code)            => ipcRenderer.invoke("wa:executeScript", code),
  waOpenPanel:   ()                => ipcRenderer.invoke("wa:openPanel"),
  waSendToPage:  (channel, payload)=> ipcRenderer.invoke("wa:sendToPage",  channel, payload),
  verifyLicense: (licenseKey, deviceId) => ipcRenderer.invoke("verifyLicense", { licenseKey, deviceId }),
  isElectron:    true,
  platform:      process.platform,
});
