const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, clipboard, screen, nativeImage, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const { enhance } = require('./enhancer');
const { KeystrokeMonitor } = require('./keystroke-monitor');
const { getAppContext } = require('./accessibility');

let overlayWindow = null;
let tray = null;
let isVisible = false;
let keystrokeMonitor = null;
let previousApp = '';
let currentAppContext = null;
let lastEnhanceTriggerTime = 0;

// Apps where we capture keystrokes (chatbot/AI tools)
const CAPTURABLE_APPS = [
    // AI Coding IDEs
    'Cursor', 'Code', 'Windsurf', 'Zed', 'Trae',
    // Browsers (ChatGPT, Claude, Gemini, Antigravity, etc.)
    'Google Chrome', 'Safari', 'Firefox', 'Arc', 'Brave Browser',
    'Microsoft Edge', 'Opera', 'Orion', 'Vivaldi', 'Zen Browser', 'Chromium',
    // Desktop AI apps
    'ChatGPT', 'Claude', 'Ollama',
    // Writing & Notes
    'Notes', 'TextEdit', 'Pages', 'Notion', 'Obsidian',
    // Communication
    'Slack', 'Discord', 'Telegram', 'WhatsApp',
    // Terminals (for AI prompts in Warp, etc.)
    'Warp', 'iTerm2'
];

function isCapturableApp(appName) {
    return CAPTURABLE_APPS.some(name =>
        appName.toLowerCase().includes(name.toLowerCase())
    );
}

// ============================================
// BINARY EXTRACTION — Fix for packaged DMG
// Copies MacKeyServer from app.asar.unpacked to userData/bin/
// ============================================

function extractBinary() {
    if (!app.isPackaged) {
        console.log('⌨️  Dev mode — using default binary path');
        return null; // Library will use its own default
    }

    const binDir = path.join(app.getPath('userData'), 'bin');
    const targetPath = path.join(binDir, 'MacKeyServer');
    const sourcePath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        'node-global-key-listener',
        'bin',
        'MacKeyServer'
    );

    try {
        if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
        }

        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            fs.chmodSync(targetPath, '755');
            console.log(`✅ MacKeyServer extracted to: ${targetPath}`);
            return targetPath;
        } else {
            console.error(`❌ Binary not found at: ${sourcePath}`);
            return null;
        }
    } catch (e) {
        console.error('❌ Failed to extract binary:', e.message);
        return null;
    }
}

// ============================================
// CLIPBOARD WATCHER — Secondary detection
// ============================================
let lastClipboardText = '';
let clipboardWatcherInterval = null;
let isOurClipboardWrite = false;

function startClipboardWatcher() {
    lastClipboardText = clipboard.readText().trim();

    clipboardWatcherInterval = setInterval(() => {
        const currentText = clipboard.readText().trim();

        if (!currentText || currentText === lastClipboardText || currentText.length < 8) return;
        if (isOurClipboardWrite) {
            isOurClipboardWrite = false;
            lastClipboardText = currentText;
            return;
        }

        // Don't trigger if keystroke monitor just triggered
        const timeSinceLastEnhance = Date.now() - lastEnhanceTriggerTime;
        if (timeSinceLastEnhance < 8000) {
            lastClipboardText = currentText;
            return;
        }

        lastClipboardText = currentText;

        const appContext = currentAppContext || getAppContext(previousApp);
        console.log(`📋 Clipboard changed — enhancing (${currentText.length} chars) from ${appContext.label}`);
        showOverlay(currentText, true, 'clipboard', appContext);
    }, 800);
}

function stopClipboardWatcher() {
    if (clipboardWatcherInterval) {
        clearInterval(clipboardWatcherInterval);
        clipboardWatcherInterval = null;
    }
}

// ============================================
// KEYSTROKE MONITOR — Primary automatic detection
// ============================================

function startKeystrokeMonitor() {
    // Check accessibility permission
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!isTrusted) {
        console.log('');
        console.log('⚠️  ACCESSIBILITY PERMISSION REQUIRED');
        console.log('   Go to: System Settings → Privacy & Security → Accessibility');
        console.log('   Enable PromptX, then restart the app');
        console.log('');
        systemPreferences.isTrustedAccessibilityClient(true); // Prompt the user
    }

    // Extract binary from asar for packaged app
    const binaryPath = extractBinary();

    keystrokeMonitor = new KeystrokeMonitor({
        pauseMs: 3000,
        minLength: 10,
        binaryPath: binaryPath
    });

    keystrokeMonitor.on('prompt-ready', ({ text }) => {
        const appContext = currentAppContext || getAppContext(previousApp);

        console.log(`\n✨ PROMPT DETECTED`);
        console.log(`   App: ${appContext.label} (${previousApp})`);
        console.log(`   Text (${text.length} chars): "${text.substring(0, 100)}"`);

        lastEnhanceTriggerTime = Date.now();
        showOverlay(text, true, 'keystroke', appContext);
        keystrokeMonitor.clearBuffer();
    });

    keystrokeMonitor.on('permission-needed', () => {
        console.log('');
        console.log('⚠️  ACCESSIBILITY PERMISSION NEEDED');
        console.log('   PromptX needs this to detect typing');
        console.log('   System Settings → Privacy & Security → Accessibility → Enable PromptX');
        console.log('');
    });

    keystrokeMonitor.on('error', ({ code }) => {
        console.log(`❌ Keystroke monitor error (code: ${code})`);
        console.log('   Falling back to clipboard watcher only');
    });

    const started = keystrokeMonitor.start();
    if (started) {
        console.log('⌨️  Keystroke monitor started — captures typing from chatbot apps');
    } else {
        console.log('⚠️  Keystroke monitor failed to start — using clipboard watcher only');
    }
}

// ============================================
// OVERLAY WINDOW
// ============================================

function createOverlayWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    overlayWindow = new BrowserWindow({
        width: 520,
        height: 580,
        x: Math.round(screenWidth / 2 - 260),
        y: Math.round(screenHeight * 0.18),
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: true,
        show: false,
        vibrancy: 'under-window',
        visualEffectState: 'active',
        roundedCorners: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    overlayWindow.on('closed', () => { overlayWindow = null; });
}

// ============================================
// APP POLLER — Track frontmost app + filter keystrokes
// ============================================
let appPollerInterval = null;

function startAppPoller() {
    const { exec } = require('child_process');

    const pollFn = () => {
        exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (err, stdout) => {
            if (err) return;
            const appName = (stdout || '').trim();
            if (!appName || appName === 'PromptX' || appName === 'Electron') return;

            if (appName !== previousApp) {
                previousApp = appName;
                currentAppContext = getAppContext(appName);

                // CRITICAL: Clear buffer on app switch to prevent contamination
                if (keystrokeMonitor) {
                    keystrokeMonitor.clearBuffer();
                }

                // Only capture keystrokes from chatbot/AI tool apps
                const capturable = isCapturableApp(appName);
                if (keystrokeMonitor) {
                    keystrokeMonitor.setEnabled(capturable);
                }

                console.log(`📍 App: ${appName} → ${currentAppContext.label} [keystrokes: ${capturable ? 'ON' : 'OFF'}]`);
            }
        });
    };

    pollFn();
    appPollerInterval = setInterval(pollFn, 1500); // Poll every 1.5s
}

function stopAppPoller() {
    if (appPollerInterval) {
        clearInterval(appPollerInterval);
        appPollerInterval = null;
    }
}

function captureFrontmostApp() {
    try {
        const { execSync } = require('child_process');
        const appName = execSync(
            `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
            { timeout: 3000, encoding: 'utf8' }
        ).trim();
        if (appName && appName !== 'PromptX' && appName !== 'Electron') {
            previousApp = appName;
            currentAppContext = getAppContext(appName);
        }
    } catch (e) { /* silent */ }
}

// ============================================
// SHOW / HIDE OVERLAY
// ============================================

function showOverlay(textToEnhance = null, autoEnhance = false, source = 'manual', appContext = null) {
    if (!overlayWindow) createOverlayWindow();

    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { x: dx, y: dy, width: dw, height: dh } = currentDisplay.workArea;

    const winBounds = overlayWindow.getBounds();
    const cx = Math.round(dx + dw / 2 - winBounds.width / 2);
    const cy = Math.round(dy + dh * 0.18);
    overlayWindow.setPosition(cx, cy);

    let clipboardText = textToEnhance || clipboard.readText().trim();
    const ctx = appContext || currentAppContext || getAppContext(previousApp);

    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWindow.show();
    overlayWindow.moveTop();
    if (!autoEnhance) overlayWindow.focus();

    overlayWindow.webContents.send('overlay:shown', {
        clipboardText,
        autoEnhance,
        appContext: ctx
    });
    isVisible = true;
}

function hideOverlay() {
    if (overlayWindow && isVisible) {
        overlayWindow.hide();
        isVisible = false;
        overlayWindow.webContents.send('overlay:hidden');
    }
}

function toggleOverlay() {
    if (isVisible) {
        hideOverlay();
    } else {
        captureFrontmostApp();
        showOverlay(null, false, 'manual', currentAppContext);
    }
}

// ============================================
// TRAY ICON
// ============================================

function createTray() {
    const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');

    let trayImage;
    try {
        trayImage = nativeImage.createFromPath(trayIconPath);
        if (trayImage.isEmpty()) throw new Error('empty');
    } catch {
        const size = 22;
        const canvas = Buffer.alloc(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const cx = x - size / 2, cy = y - size / 2;
                const dist = Math.sqrt(cx * cx + cy * cy);
                if (dist < 8) {
                    canvas[idx] = 139;
                    canvas[idx + 1] = 92;
                    canvas[idx + 2] = 246;
                    canvas[idx + 3] = dist < 6 ? 255 : Math.round(255 * (1 - (dist - 6) / 2));
                } else {
                    canvas[idx + 3] = 0;
                }
            }
        }
        trayImage = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    }

    tray = new Tray(trayImage.resize({ width: 22, height: 22 }));
    tray.setToolTip('PromptX — AI Prompt Enhancer');

    const contextMenu = Menu.buildFromTemplate([
        { label: '✨ PromptX', enabled: false },
        { type: 'separator' },
        { label: 'Toggle Overlay (⌥P)', click: toggleOverlay },
        { type: 'separator' },
        {
            label: 'Launch at Login',
            type: 'checkbox',
            checked: app.getLoginItemSettings().openAtLogin,
            click: (menuItem) => { app.setLoginItemSettings({ openAtLogin: menuItem.checked }); }
        },
        { type: 'separator' },
        { label: 'Quit PromptX', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', toggleOverlay);
}

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('enhance', async (_event, prompt, appContext) => {
    try {
        const ctx = appContext || currentAppContext || getAppContext(previousApp);
        const result = await enhance(prompt, ctx);
        if (result && result.enhanced && keystrokeMonitor) {
            keystrokeMonitor.markEnhanced(result.enhanced);
            keystrokeMonitor.markEnhanced(prompt);
        }
        return result;
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('toggle-auto-enhance', (_event, enabled) => {
    if (keystrokeMonitor) {
        keystrokeMonitor.setEnabled(enabled);
    }
    return true;
});

ipcMain.on('overlay:resize', (_event, height) => {
    if (overlayWindow) {
        const h = Math.min(Math.max(height, 100), 600);
        const [w] = overlayWindow.getSize();
        overlayWindow.setSize(w, Math.ceil(h));
    }
});

ipcMain.handle('paste-to-app', async (_event, text) => {
    const { exec } = require('child_process');

    try {
        isOurClipboardWrite = true;
        clipboard.writeText(text);
        lastClipboardText = text;

        hideOverlay();

        const target = previousApp || '';
        if (target) {
            await new Promise((resolve) => {
                exec(`osascript -e 'tell application "${target}" to activate'`, (err) => {
                    if (err) console.log(`Activate error: ${err.message}`);
                    resolve();
                });
            });

            await new Promise(r => setTimeout(r, 600));

            await new Promise((resolve) => {
                exec(`osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`, (err) => {
                    if (err) console.log(`Cmd+V error: ${err.message}`);
                    console.log('✅ Pasted to', target);
                    resolve();
                });
            });
        }

        return { success: true };
    } catch (err) {
        console.error('❌ Paste error:', err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('clipboard:read', () => clipboard.readText().trim());

ipcMain.handle('clipboard:write', (_event, text) => {
    isOurClipboardWrite = true;
    lastClipboardText = text;
    clipboard.writeText(text);
    return true;
});

ipcMain.on('overlay:hide', () => hideOverlay());

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║     ✨ PromptX Desktop Starting      ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log(`📦 Packaged: ${app.isPackaged}`);
    console.log(`📂 Resources: ${process.resourcesPath}`);
    console.log(`📂 UserData: ${app.getPath('userData')}`);
    console.log('');

    createOverlayWindow();
    createTray();
    startClipboardWatcher();
    startKeystrokeMonitor();
    startAppPoller();

    const shortcutRegistered = globalShortcut.register('Alt+P', toggleOverlay);
    if (!shortcutRegistered) {
        globalShortcut.register('Alt+Shift+P', toggleOverlay);
    }

    console.log('');
    console.log('✅ PromptX ready!');
    console.log('   ⌨️  Type in Cursor/Windsurf chatbot → wait 3s → auto-enhances');
    console.log('   📋 Copy text (Cmd+C) → auto-enhances');
    console.log('   ⌥P to toggle overlay manually');
    console.log('');
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopClipboardWatcher();
    stopAppPoller();
    if (keystrokeMonitor) keystrokeMonitor.stop();
});

app.dock?.hide();

app.on('window-all-closed', (e) => {
    e.preventDefault();
});
