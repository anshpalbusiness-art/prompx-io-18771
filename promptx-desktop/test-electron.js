const electron = require('electron');
console.log('Electron loaded:', !!electron);
console.log('ipcMain exists:', !!electron.ipcMain);
console.log('app exists:', !!electron.app);
