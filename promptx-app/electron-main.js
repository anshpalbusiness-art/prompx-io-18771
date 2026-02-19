// PromptX Desktop App — Full Electron Main Process
// Features: embedded proxy server, system tray, global hotkey, window state, auto-updater, notifications
const {
    app,
    BrowserWindow,
    shell,
    Menu,
    Tray,
    globalShortcut,
    nativeTheme,
    Notification,
    ipcMain,
    nativeImage,
    screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ─── Constants ───────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const APP_NAME = 'PromptX';
const PROXY_PORT = 3001;
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');
const ENV_FILE = isDev
    ? path.join(__dirname, '..', '.env')
    : path.join(process.resourcesPath, '.env');

// Force dark mode
nativeTheme.themeSource = 'dark';

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
}

// ─── Environment Variables ───────────────────────────────────────────────
function loadEnv() {
    const envVars = {};
    try {
        const envPath = fs.existsSync(ENV_FILE) ? ENV_FILE : path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx === -1) continue;
                const key = trimmed.substring(0, eqIdx).trim();
                let val = trimmed.substring(eqIdx + 1).trim();
                // Remove quotes
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                envVars[key] = val;
            }
        }
    } catch (err) {
        console.error('Failed to load .env:', err.message);
    }
    return envVars;
}

const env = loadEnv();

// ─── Window State Persistence ────────────────────────────────────────────
function loadWindowState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        }
    } catch { }
    return null;
}

function saveWindowState(win) {
    try {
        const bounds = win.getBounds();
        const state = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized: win.isMaximized(),
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    } catch { }
}

// ─── Embedded Proxy Server ───────────────────────────────────────────────
function startProxyServer() {
    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        // Parse body
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const url = req.url;

                if (url === '/api/chat-completion') {
                    await handleChatCompletion(data, res);
                } else if (url === '/api/enhance-prompt') {
                    await handleEnhancePrompt(data, res);
                } else if (url === '/api/text-to-speech') {
                    await handleTextToSpeech(data, res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    });

    server.listen(PROXY_PORT, '127.0.0.1', () => {
        console.log(`📡 Embedded proxy server running on http://127.0.0.1:${PROXY_PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Port ${PROXY_PORT} in use — proxy server already running`);
        } else {
            console.error('Proxy server error:', err);
        }
    });

    return server;
}

// ─── API Handlers ────────────────────────────────────────────────────────
async function handleChatCompletion(data, res) {
    const { messages, model = 'grok-beta', stream = false } = data;
    if (!messages || !Array.isArray(messages)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request: messages array required' }));
        return;
    }

    const XAI_API_KEY = env.XAI_API_KEY || process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API key not configured' }));
        return;
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({ model, messages, stream }),
    });

    const result = await response.json();
    res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
}

async function handleEnhancePrompt(data, res) {
    const { prompt, category, targetAI } = data;
    if (!prompt || prompt.trim().length < 5) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Prompt too short' }));
        return;
    }

    const XAI_API_KEY = env.XAI_API_KEY || process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API key not configured' }));
        return;
    }

    const systemPrompt = `You are PromptX — a world-class prompt engineer. You take rough, casual user prompts and rewrite them into clear, powerful prompts that get exceptional results from AI.

ABSOLUTE REQUIREMENTS:
1. FIX ALL SPELLING AND GRAMMAR MISTAKES.
2. FIX RANDOM CAPITALIZATION.
3. ACTUALLY REWRITE the prompt.

Category hint: "${category || 'general'}"
Target AI: "${targetAI || 'general'}"

RESPONSE FORMAT (respond ONLY in valid JSON, no markdown wrapping):
{
  "enhanced": "The completely rewritten prompt",
  "tips": ["Why this improvement matters", "Another insight"],
  "improvement": "One-line summary"
}`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'grok-3-mini-fast',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Rewrite this prompt to be expert-level:\n\n"${prompt}"` },
            ],
            stream: false,
            temperature: 0.8,
        }),
    });

    const apiData = await response.json();
    if (!response.ok) {
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: apiData.error || 'Enhancement failed' }));
        return;
    }

    const content = apiData.choices[0].message.content;
    let result;
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { enhanced: content.trim(), tips: [], improvement: 'Enhanced' };
    } catch {
        result = { enhanced: content.trim(), tips: [], improvement: 'Enhanced' };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
}

async function handleTextToSpeech(data, res) {
    const { text, voiceId } = data;
    if (!text || !voiceId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Text and voiceId required' }));
        return;
    }

    const ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'TTS API key not configured' }));
        return;
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            Accept: 'audio/mpeg',
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
                stability: 0.35,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorData }));
        return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
    res.end(buffer);
}

// ─── Main Window ─────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let proxyServer = null;
let splashWindow = null;

function createSplashScreen() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const splashHTML = `
    <html>
    <head><style>
      body {
        margin: 0; display: flex; align-items: center; justify-content: center;
        height: 100vh; background: linear-gradient(135deg, #0a0e27, #0d1440, #0a0e27);
        font-family: 'Inter', -apple-system, sans-serif; color: white; border-radius: 16px;
        overflow: hidden; -webkit-app-region: drag;
      }
      .container { text-align: center; }
      .logo { font-size: 48px; font-weight: 800; letter-spacing: -2px;
        background: linear-gradient(135deg, #fff, #a0a0a0);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .sub { margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 400; }
      .loader { margin-top: 24px; width: 40px; height: 4px; background: rgba(255,255,255,0.1);
        border-radius: 4px; overflow: hidden; margin-left: auto; margin-right: auto; }
      .loader-bar { width: 60%; height: 100%; background: linear-gradient(90deg, #fff, #666);
        border-radius: 4px; animation: load 1.5s ease-in-out infinite; }
      @keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      .stars { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
      .star { position: absolute; width: 2px; height: 2px; background: white; border-radius: 50%;
        animation: twinkle 3s infinite; }
      @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
    </style></head>
    <body>
      <div class="stars">
        ${Array.from({ length: 30 }, () => `<div class="star" style="top:${Math.random() * 100}%;left:${Math.random() * 100}%;animation-delay:${Math.random() * 3}s;"></div>`).join('')}
      </div>
      <div class="container">
        <div class="logo">PromptX</div>
        <div class="sub">AI Prompt Engineering Platform</div>
        <div class="loader"><div class="loader-bar"></div></div>
      </div>
    </body></html>`;

    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
}

function createMainWindow() {
    const savedState = loadWindowState();
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

    const opts = {
        width: savedState?.width || 1440,
        height: savedState?.height || 900,
        x: savedState?.x,
        y: savedState?.y,
        minWidth: 800,
        minHeight: 600,
        title: APP_NAME,
        icon: path.join(__dirname, '..', 'public', 'icon-512x512.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: '#000000',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'electron-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: true,
        },
    };

    // Ensure window is on-screen
    if (opts.x !== undefined && opts.y !== undefined) {
        if (opts.x < 0 || opts.y < 0 || opts.x > screenW || opts.y > screenH) {
            delete opts.x;
            delete opts.y;
        }
    }

    mainWindow = new BrowserWindow(opts);

    if (savedState?.isMaximized) {
        mainWindow.maximize();
    }

    // Save state on move/resize
    const saveState = () => saveWindowState(mainWindow);
    mainWindow.on('resize', saveState);
    mainWindow.on('move', saveState);
    mainWindow.on('close', saveState);

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.destroy();
            splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http') && !url.includes('localhost')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Hide instead of close (keep running in tray)
    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    return mainWindow;
}

// ─── System Tray ─────────────────────────────────────────────────────────
function createTray() {
    const iconPath = path.join(__dirname, '..', 'public', 'icon-192x192.png');
    let trayIcon;

    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        if (process.platform === 'darwin') {
            trayIcon = trayIcon.resize({ width: 18, height: 18 });
        }
    } catch {
        // Fallback: create a simple tray icon
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip(APP_NAME);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show PromptX',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            },
        },
        {
            label: 'Dashboard',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
                mainWindow?.webContents.executeJavaScript(`window.location.hash = '#/dashboard'`);
            },
        },
        { type: 'separator' },
        {
            label: 'Toggle DevTools',
            visible: isDev,
            click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
            label: 'Quit PromptX',
            click: () => {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
}

// ─── Application Menu ────────────────────────────────────────────────────
function createMenu() {
    const template = [
        ...(process.platform === 'darwin'
            ? [{
                label: APP_NAME,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { label: 'Quit', accelerator: 'Cmd+Q', click: () => { app.isQuitting = true; app.quit(); } },
                ],
            }]
            : []),
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Chat',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow?.show();
                        mainWindow?.webContents.executeJavaScript(
                            `window.location.hash = '#/dashboard'`
                        );
                    },
                },
                { type: 'separator' },
                process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Go',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => mainWindow?.webContents.executeJavaScript(`window.location.hash = '#/dashboard'`),
                },
                {
                    label: 'Agents',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => mainWindow?.webContents.executeJavaScript(`window.location.hash = '#/agents'`),
                },
                {
                    label: 'Marketplace',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => mainWindow?.webContents.executeJavaScript(`window.location.hash = '#/marketplace'`),
                },
                {
                    label: 'Analytics',
                    accelerator: 'CmdOrCtrl+4',
                    click: () => mainWindow?.webContents.executeJavaScript(`window.location.hash = '#/analytics'`),
                },
            ],
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(process.platform === 'darwin'
                    ? [{ type: 'separator' }, { role: 'front' }]
                    : [{ role: 'close' }]),
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ────────────────────────────────────────────────────────
function setupIPC() {
    ipcMain.on('window-minimize', () => mainWindow?.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) mainWindow.unmaximize();
        else mainWindow?.maximize();
    });
    ipcMain.on('window-close', () => mainWindow?.hide());

    ipcMain.handle('get-version', () => app.getVersion());
    ipcMain.handle('get-platform', () => process.platform);

    ipcMain.on('notify', (_, { title, body }) => {
        if (Notification.isSupported()) {
            new Notification({ title, body, silent: false }).show();
        }
    });

    ipcMain.on('show-window', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────
app.whenReady().then(() => {
    // Show splash
    createSplashScreen();

    // Start embedded proxy
    proxyServer = startProxyServer();

    // Setup
    createMenu();
    setupIPC();
    createMainWindow();
    createTray();

    // Register global hotkey: Cmd/Ctrl+Shift+P to toggle PromptX
    globalShortcut.register('CommandOrControl+Shift+P', () => {
        if (mainWindow?.isVisible() && mainWindow?.isFocused()) {
            mainWindow.hide();
        } else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });

    // Send startup notification
    if (Notification.isSupported()) {
        new Notification({
            title: 'PromptX is running',
            body: 'Press Cmd+Shift+P to toggle the window. Access from the system tray.',
            silent: true,
        }).show();
    }

    // macOS: re-create window on dock click
    app.on('activate', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        } else {
            createMainWindow();
        }
    });
});

// Second instance: show existing window
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});

app.on('window-all-closed', () => {
    // Don't quit on window close — keep running in tray
    if (process.platform !== 'darwin') {
        // On Windows/Linux, hide to tray
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    globalShortcut.unregisterAll();
    if (proxyServer) {
        proxyServer.close();
    }
});

// Security: prevent new windows
app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http') && !url.includes('localhost')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
});

// Deep link protocol handler
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('promptx', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('promptx');
}

app.on('open-url', (event, url) => {
    event.preventDefault();
    // Handle promptx:// deep links
    const route = url.replace('promptx://', '/');
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.executeJavaScript(`window.location.hash = '#${route}'`);
    }
});
