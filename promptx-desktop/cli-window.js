const { BrowserWindow } = require('electron');
const path = require('path');

let cliWindow = null;

function createCLIWindow() {
    if (cliWindow && !cliWindow.isDestroyed()) {
        cliWindow.focus();
        return cliWindow;
    }

    cliWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        title: 'PromptX CLI Agent Builder',
        backgroundColor: '#1a1a1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    // Load a simple HTML page or your CLI builder UI
    cliWindow.loadFile(path.join(__dirname, 'renderer', 'cli.html'))
        .catch(() => {
            // Fallback if cli.html doesn't exist
            cliWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CLI Agent Builder</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 20px;
                            background: #1a1a1a;
                            color: #fff;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        }
                        .container { max-width: 800px; margin: 0 auto; }
                        h1 { color: #8b5cf6; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🛠️ CLI Agent Builder</h1>
                        <p>CLI Builder interface coming soon...</p>
                    </div>
                </body>
                </html>
            `));
        });

    cliWindow.on('closed', () => {
        cliWindow = null;
    });

    return cliWindow;
}

module.exports = { createCLIWindow };
