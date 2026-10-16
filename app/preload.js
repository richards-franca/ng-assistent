const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('niggatron', {
  getDesktopSource: () => ipcRenderer.invoke('desktop-source'),
  generate: (data) => ipcRenderer.invoke('groq-generate', data),
  apiKeyStatus: () => ipcRenderer.invoke('api-key-status'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  saveRecord: (record) => ipcRenderer.invoke('save-record', record),
  listRecords: () => ipcRenderer.invoke('list-records'),
  deleteRecord: (id) => ipcRenderer.invoke('delete-record', id),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, data) => callback(data)),
  openMainWithRecord: (data) => ipcRenderer.send('open-main-with-record', data),
  onQuickRecordFinished: (callback) => ipcRenderer.on('quick-record-finished', (_event, data) => callback(data)),
  resizeQuickWindow: (delta) => ipcRenderer.send('resize-quick-window', delta),
  quitApp: () => ipcRenderer.send('quit-niggatron')
});
