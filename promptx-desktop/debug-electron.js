const electron = require('electron');
console.log('Electron module keys:', Object.keys(electron).sort());
console.log('Has app?', 'app' in electron);
console.log('Has ipcMain?', 'ipcMain' in electron);
console.log('Has BrowserWindow?', 'BrowserWindow' in electron);

if (electron.app) {
    electron.app.whenReady().then(() => {
        console.log('App ready!');
        const win = new electron.BrowserWindow({ width: 400, height: 300 });
        win.loadURL('https://google.com');
    });
}
