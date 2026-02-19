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

    // ═══ CLI Terminal Engine — direct access to user's machine ═══

    // Workspace + system info
    cliInfo: () => ipcRenderer.invoke('cli:info'),
    cliReveal: (folderPath) => ipcRenderer.invoke('cli:reveal', folderPath),

    // One-shot command execution (backward compat)
    cliExec: (command, cwd) => ipcRenderer.invoke('cli:exec', command, cwd),

    // Streaming command execution — like Cursor
    cliExecStream: (command, cwd) => ipcRenderer.invoke('cli:exec-stream', command, cwd),
    cliExecKill: (pid) => ipcRenderer.invoke('cli:exec-kill', pid),
    onCliStreamData: (callback) => {
        ipcRenderer.on('cli:stream-data', (_event, data) => callback(data));
    },
    onCliStreamEnd: (callback) => {
        ipcRenderer.on('cli:stream-end', (_event, data) => callback(data));
    },
    removeCliStreamListeners: () => {
        ipcRenderer.removeAllListeners('cli:stream-data');
        ipcRenderer.removeAllListeners('cli:stream-end');
    },

    // File write (workspace-scoped — legacy)
    cliWrite: (filePath, content) => ipcRenderer.invoke('cli:write', filePath, content),

    // AI build plan (legacy one-shot)
    cliPlan: (prompt, language) => ipcRenderer.invoke('cli:plan', prompt, language),

    // AI conversational build — multi-turn with context memory
    cliChat: (messages, language, sessionId) => ipcRenderer.invoke('cli:chat', messages, language, sessionId),

    // ═══ Full Filesystem Access — like Cursor ═══
    fsRead: (filePath) => ipcRenderer.invoke('cli:fs-read', filePath),
    fsList: (dirPath) => ipcRenderer.invoke('cli:fs-list', dirPath),
    fsStat: (filePath) => ipcRenderer.invoke('cli:fs-stat', filePath),
    fsWrite: (filePath, content) => ipcRenderer.invoke('cli:fs-write', filePath, content),
    fsMkdir: (dirPath) => ipcRenderer.invoke('cli:fs-mkdir', dirPath),
    fsDelete: (targetPath) => ipcRenderer.invoke('cli:fs-delete', targetPath),

    // Events from main process
    onShown: (callback) => {
        ipcRenderer.on('overlay:shown', (_event, data) => callback(data));
    },
    onHidden: (callback) => {
        ipcRenderer.on('overlay:hidden', () => callback());
    }
});
