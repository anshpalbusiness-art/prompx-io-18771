const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptx', {
    // Enhancement — now accepts appContext
    enhance: (prompt, appContext) => ipcRenderer.invoke('enhance', prompt, appContext),

    // Clipboard
    readClipboard: () => ipcRenderer.invoke('clipboard:read'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),

    // Window control
    hideOverlay: () => ipcRenderer.send('overlay:hide'),
    toggleAutoEnhance: (enabled) => ipcRenderer.invoke('toggle-auto-enhance', enabled),
    resize: (height) => ipcRenderer.send('overlay:resize', height),
    pasteToApp: (text) => ipcRenderer.invoke('paste-to-app', text),

    // Events from main process
    onShown: (callback) => {
        ipcRenderer.on('overlay:shown', (_event, data) => callback(data));
    },
    onHidden: (callback) => {
        ipcRenderer.on('overlay:hidden', () => callback());
    }
});
