// Minimal test to verify Electron works
const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;

console.log('Electron app:', !!app);
console.log('BrowserWindow:', !!BrowserWindow);
console.log('ipcMain:', !!ipcMain);

app.whenReady().then(() => {
    console.log('App is ready!');

    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    padding: 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    text-align: center;
                }
                h1 { font-size: 48px; margin-bottom: 20px; }
                p { font-size: 18px; opacity: 0.9; }
            </style>
        </head>
        <body>
            <div>
                <h1>✨ PromptX Desktop</h1>
                <p>Electron app is running successfully!</p>
                <p style="margin-top: 40px; font-size: 14px; opacity: 0.7;">AI Prompt Enhancer for macOS</p>
            </div>
        </body>
        </html>
    `));

    console.log('Window created and loaded!');
});

app.on('window-all-closed', () => {
    app.quit();
});
