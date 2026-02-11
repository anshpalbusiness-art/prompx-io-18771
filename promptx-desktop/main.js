const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, clipboard, screen, nativeImage, systemPreferences } = require('electron');
const path = require('path');
const { enhance } = require('./enhancer');
const { KeystrokeMonitor } = require('./keystroke-monitor');

let overlayWindow = null;
let tray = null;
let isVisible = false;
let keystrokeMonitor = null;
let previousApp = ''; // Track which app was active before overlay

// ============================================
// CLIPBOARD WATCHER — Auto-detect copied text
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

        lastClipboardText = currentText;
        console.log(`📋 Clipboard changed (${currentText.length} chars) — auto-enhancing...`);
        captureFrontmostApp();
        showOverlay(currentText, true);
    }, 800);
}

function stopClipboardWatcher() {
    if (clipboardWatcherInterval) {
        clearInterval(clipboardWatcherInterval);
        clipboardWatcherInterval = null;
    }
}

// ============================================
// KEYSTROKE MONITOR — Auto-detect typing
// ============================================

function startKeystrokeMonitor() {
    // Check accessibility permission
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
    if (!isTrusted) {
        console.log('⚠️  Accessibility permission needed for keystroke detection');
        console.log('   Opening System Settings...');
        systemPreferences.isTrustedAccessibilityClient(true); // Opens System Settings
        console.log('   ✅ Grant permission, then restart PromptX');
    }

    keystrokeMonitor = new KeystrokeMonitor({
        pauseMs: 3000,    // 3 seconds after typing stops
        minLength: 12     // At least 12 chars
    });

    keystrokeMonitor.on('prompt-ready', ({ text }) => {
        console.log(`✨ Prompt ready: "${text.substring(0, 60)}..."`);
        captureFrontmostApp();
        showOverlay(text, true);
        keystrokeMonitor.clearBuffer();
    });

    keystrokeMonitor.on('permission-needed', () => {
        console.log('🔐 Grant Accessibility permission in System Settings');
    });

    keystrokeMonitor.start();
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
            sandbox: false  // Need sandbox off for global key listener
        }
    });

    // Highest window level — float above ALL apps
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    overlayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // NO blur handler — overlay stays until explicitly closed

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

// ============================================
// HELPER — continuously track last non-PromptX frontmost app
// ============================================
let appPollerInterval = null;

function startAppPoller() {
    const { exec } = require('child_process');
    const pollFn = () => {
        exec(`osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`, (err, stdout, stderr) => {
            if (err) {
                console.log(`⚠️ App poller error: ${err.message}`);
                return;
            }
            if (stderr) console.log(`⚠️ App poller stderr: ${stderr.trim()}`);
            const bid = (stdout || '').trim();
            if (bid && bid !== 'com.github.Electron' && !bid.includes('com.promptx')) {
                if (bid !== previousApp) {
                    previousApp = bid;
                    console.log(`📍 Active app: ${previousApp}`);
                }
            }
        });
    };
    // Poll immediately, then every 2s
    pollFn();
    appPollerInterval = setInterval(pollFn, 2000);
}

function stopAppPoller() {
    if (appPollerInterval) {
        clearInterval(appPollerInterval);
        appPollerInterval = null;
    }
}

// Legacy single-shot (kept for manual triggers)
function captureFrontmostApp() {
    try {
        const { execSync } = require('child_process');
        const bundleId = execSync(
            `osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`,
            { timeout: 3000, encoding: 'utf8' }
        ).trim();
        if (bundleId && bundleId !== 'com.github.Electron' && !bundleId.includes('com.promptx')) {
            previousApp = bundleId;
            console.log(`📍 Captured app: ${previousApp}`);
        }
    } catch (e) {
        console.log('⚠️ captureFrontmostApp error:', e.message);
    }
}

// ============================================
// SHOW / HIDE OVERLAY
// ============================================

function showOverlay(textToEnhance = null, autoEnhance = false) {
    if (!overlayWindow) createOverlayWindow();

    // Position on current screen
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { x: dx, y: dy, width: dw, height: dh } = currentDisplay.workArea;

    const winBounds = overlayWindow.getBounds();
    const cx = Math.round(dx + dw / 2 - winBounds.width / 2);
    const cy = Math.round(dy + dh * 0.18);
    overlayWindow.setPosition(cx, cy);

    const clipboardText = textToEnhance || clipboard.readText().trim();

    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    overlayWindow.show();
    overlayWindow.moveTop();
    if (!autoEnhance) overlayWindow.focus();

    overlayWindow.webContents.send('overlay:shown', { clipboardText, autoEnhance });
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
        showOverlay();
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
        {
            label: 'Toggle Overlay (⌥P)',
            click: toggleOverlay
        },
        { type: 'separator' },
        {
            label: '⌨️ Auto-Detect Typing',
            type: 'checkbox',
            checked: true,
            click: (menuItem) => {
                if (keystrokeMonitor) keystrokeMonitor.setEnabled(menuItem.checked);
                console.log(`⌨️ Keystroke monitor: ${menuItem.checked ? 'ON' : 'OFF'}`);
            }
        },
        {
            label: '📋 Auto-Detect Clipboard',
            type: 'checkbox',
            checked: true,
            click: (menuItem) => {
                if (menuItem.checked) startClipboardWatcher();
                else stopClipboardWatcher();
            }
        },
        { type: 'separator' },
        {
            label: 'Clear Typing Buffer',
            click: () => {
                if (keystrokeMonitor) keystrokeMonitor.clearBuffer();
                console.log('🗑️ Typing buffer cleared');
            }
        },
        { type: 'separator' },
        {
            label: 'Launch at Login',
            type: 'checkbox',
            checked: app.getLoginItemSettings().openAtLogin,
            click: (menuItem) => {
                app.setLoginItemSettings({ openAtLogin: menuItem.checked });
            }
        },
        { type: 'separator' },
        {
            label: 'Quit PromptX',
            accelerator: 'CmdOrCtrl+Q',
            click: () => app.quit()
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', toggleOverlay);
}

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('enhance', async (_event, prompt) => {
    try {
        const result = await enhance(prompt);
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
        console.log(`️ Auto-enhance toggled: ${enabled ? 'ON' : 'OFF'}`);
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
        // Step 1: Copy to clipboard
        isOurClipboardWrite = true;
        clipboard.writeText(text);
        console.log('📋 Step 1: Text copied to clipboard');

        // Step 2: Hide overlay
        hideOverlay();
        console.log('📋 Step 2: Overlay hidden');

        // Step 3: Activate previous app
        const target = previousApp || '';
        console.log(`📋 Step 3: Target app = "${target}"`);

        if (target) {
            // Activate using open -b
            await new Promise((resolve) => {
                exec(`open -b "${target}"`, (err) => {
                    if (err) console.log(`📋 open -b error: ${err.message}`);
                    else console.log('📋 Step 3a: App activated via open -b');
                    resolve();
                });
            });

            // Wait for app to fully come to front
            await new Promise(r => setTimeout(r, 800));
            console.log('📋 Step 4: Waited 800ms for focus');

            // Simulate Cmd+V
            await new Promise((resolve) => {
                exec(`osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`, (err, stdout, stderr) => {
                    if (err) console.log(`📋 Cmd+V error: ${err.message}`);
                    if (stderr) console.log(`📋 Cmd+V stderr: ${stderr}`);
                    console.log('📋 Step 5: Cmd+V sent');
                    resolve();
                });
            });
        } else {
            console.log('📋 No target app — waiting and pasting blind');
            await new Promise(r => setTimeout(r, 1000));
            await new Promise((resolve) => {
                exec(`osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`, () => resolve());
            });
        }

        console.log('✅ Paste flow complete');
        return { success: true };
    } catch (err) {
        console.error('❌ Paste error:', err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('clipboard:read', () => {
    return clipboard.readText().trim();
});

ipcMain.handle('clipboard:write', (_event, text) => {
    isOurClipboardWrite = true;
    lastClipboardText = text;
    clipboard.writeText(text);
    return true;
});

ipcMain.on('overlay:hide', () => {
    hideOverlay();
});

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
    createOverlayWindow();
    createTray();
    startClipboardWatcher();
    startKeystrokeMonitor();
    startAppPoller();

    const shortcutRegistered = globalShortcut.register('Alt+P', toggleOverlay);
    if (!shortcutRegistered) {
        console.error('❌ Failed to register Alt+P shortcut');
        globalShortcut.register('Alt+Shift+P', toggleOverlay);
    }

    console.log('');
    console.log('✨ PromptX Desktop ready!');
    console.log('   ⌨️  Auto-detect typing — type a prompt anywhere, pause 3s → auto-enhances');
    console.log('   📋 Auto-detect clipboard — copy text → auto-enhances');
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
