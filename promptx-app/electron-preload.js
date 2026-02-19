// PromptX Desktop App — Electron Preload Script
// Exposes safe, comprehensive APIs to the renderer process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Platform detection
    platform: process.platform,
    isElectron: true,

    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    show: () => ipcRenderer.send('show-window'),

    // App info
    getVersion: () => ipcRenderer.invoke('get-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),

    // Native notifications
    notify: (title, body) => ipcRenderer.send('notify', { title, body }),

    // Listen for events from main process
    onNavigate: (callback) => ipcRenderer.on('navigate', (_, route) => callback(route)),
});
