const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Store
    getStoreValue: (key) => ipcRenderer.invoke('store:get', key),
    getAllSettings: () => ipcRenderer.invoke('store:getAll'),
    setStoreValue: (key, value) => ipcRenderer.send('store:set', key, value),

    // Notifications
    showNotification: (title, body) => ipcRenderer.send('notification:show', title, body),

    // Window controls
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),

    // External links
    openExternal: (url) => ipcRenderer.send('open-external', url),
});
