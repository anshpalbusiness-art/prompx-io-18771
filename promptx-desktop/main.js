const electron = require('electron');
const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, clipboard, screen, nativeImage, systemPreferences } = electron;
const path = require('path');
const fs = require('fs');

console.log('DEBUG: ipcMain =', ipcMain);
console.log('DEBUG: app =', app);

const { enhance } = require('./enhancer');
const { KeystrokeMonitor } = require('./keystroke-monitor');
const { getAppContext } = require('./accessibility');
const { createCLIWindow } = require('./cli-window');

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
        { label: '🛠️ CLI Agent Builder', click: () => createCLIWindow() },
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
// CLI TERMINAL ENGINE — Local command execution
// Gives the desktop app direct access to the user's
// real terminal, filesystem, and PATH — like Cursor
// ============================================

const { exec: execChild } = require('child_process');
const { promisify } = require('util');
const { writeFile, mkdir: mkdirFs } = require('fs').promises;
const execAsync = promisify(execChild);
const os = require('os');

const WORKSPACE_ROOT = path.join(os.homedir(), 'PromptX-CLI');

// Return workspace info
ipcMain.handle('cli:info', async () => {
    // Ensure workspace exists
    await mkdirFs(WORKSPACE_ROOT, { recursive: true });
    return {
        workspaceRoot: WORKSPACE_ROOT,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        home: os.homedir(),
    };
});

// Execute a real shell command on the user's machine
ipcMain.handle('cli:exec', async (_event, command, cwd) => {
    try {
        if (!command) {
            return { stdout: '', stderr: 'No command provided', exitCode: 1 };
        }

        // Security: block truly dangerous commands
        const blocked = ['rm -rf /', 'sudo rm', '> /dev', 'mkfs', 'dd if='];
        if (blocked.some(b => command.includes(b))) {
            return { stdout: '', stderr: 'Command blocked for security', exitCode: 1 };
        }

        // Resolve cwd — if relative, resolve against WORKSPACE_ROOT
        let workDir = WORKSPACE_ROOT;
        if (cwd) {
            workDir = path.isAbsolute(cwd) ? cwd : path.join(WORKSPACE_ROOT, cwd);
        }

        // Ensure the directory exists
        await mkdirFs(workDir, { recursive: true });

        console.log(`⚡ CLI Exec: ${command.substring(0, 80)} (in ${workDir})`);

        const { stdout, stderr } = await execAsync(command, {
            cwd: workDir,
            timeout: 120000,
            maxBuffer: 1024 * 1024 * 5,
            env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
            shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        });

        console.log(`✅ CLI done: ${command.substring(0, 50)}`);
        return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 };

    } catch (error) {
        console.log(`⚠️ CLI failed: ${error.message.substring(0, 100)}`);
        return {
            stdout: error.stdout || '',
            stderr: error.stderr || error.message,
            exitCode: error.code || 1,
        };
    }
});

// Write a file to the workspace
ipcMain.handle('cli:write', async (_event, filePath, content) => {
    try {
        if (!filePath || content === undefined) {
            return { success: false, error: 'filePath and content required' };
        }

        const fullPath = path.resolve(WORKSPACE_ROOT, filePath);

        // Security: prevent writing outside workspace
        if (!fullPath.startsWith(WORKSPACE_ROOT)) {
            return { success: false, error: 'Cannot write outside workspace' };
        }

        await mkdirFs(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, 'utf-8');

        console.log(`📝 CLI wrote: ${filePath} (${content.length} bytes)`);
        return { success: true, path: fullPath, size: content.length };

    } catch (error) {
        console.error('❌ CLI write error:', error.message);
        return { success: false, error: error.message };
    }
});

// Helper: Language-specific system prompt builder (Desktop version)
function buildCliPlanPromptDesktop(language, lang) {
    const testCmd = { nodejs: 'node index.js --help', python: 'python3 index.py --help', go: 'go run main.go --help', rust: 'cargo run -- --help' }[language] || 'node index.js --help';
    const runCmd = { nodejs: 'node index.js', python: 'python3 index.py', go: 'go run main.go', rust: 'cargo run --' }[language] || 'node index.js';

    if (language === 'python') {
        return `Create a production-ready, fully functional Python CLI application. You must output a COMPLETE BUILD PLAN as a JSON object.

JSON SCHEMA:
{
  "projectName": "lowercase-hyphenated-name",
  "displayName": "Human Friendly Name",
  "description": "One-line description",
  "language": "python",
  "files": [{ "filename": "path/to/file.py", "content": "FULL FILE CONTENT AS STRING" }],
  "installCommand": "pip3 install -r requirements.txt",
  "testCommand": "${testCmd}",
  "commands": [{ "name": "command-name", "description": "What it does" }]
}

PROJECT STRUCTURE:
├── requirements.txt
├── index.py         (entry point with #!/usr/bin/env python3)
├── commands/
│   ├── __init__.py
│   ├── setup.py
│   └── [feature].py
├── utils/
│   ├── __init__.py
│   ├── api.py
│   ├── prompts.py
│   └── storage.py
└── README.md

CRITICAL REQUIREMENTS:
1. Use click for CLI parsing (@click.group, @click.command, @click.argument, @click.option)
2. Use rich for colored output and tables
3. Use requests for HTTP calls
4. Use configparser for config persistence in ~/.config/project-name/config.ini
5. Include __init__.py in EVERY subdirectory
6. Start index.py with #!/usr/bin/env python3
7. Use if __name__ == '__main__': cli() at bottom of index.py

REQUIREMENTS.TXT:
click>=8.1.7
rich>=13.7.0
requests>=2.31.0
python-dotenv>=1.0.0
tabulate>=0.9.0

MANDATORY IMPORT PATTERNS:
import click
from rich.console import Console
from rich.table import Table
import requests
import configparser
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
console = Console()

RULES:
- Every function FULLY implemented — NO TODOs, NO stubs
- Minimum 8 files, maximum 15 files
- Generate ONLY the JSON object, no markdown, no code fences

RESPOND WITH ONLY VALID JSON.`;
    }

    // Default: Node.js
    return `Create a production-ready, fully functional Node.js CLI application. You must output a COMPLETE BUILD PLAN as a JSON object.

JSON SCHEMA:
{
  "projectName": "lowercase-hyphenated-name",
  "displayName": "Human Friendly Name",
  "description": "One-line description",
  "language": "${language}",
  "files": [{ "filename": "path/to/file.${lang.ext}", "content": "FULL FILE CONTENT AS STRING" }],
  "installCommand": "${lang.installer}",
  "testCommand": "${testCmd}",
  "commands": [{ "name": "command-name", "description": "What it does" }]
}

PROJECT STRUCTURE:
├── package.json
├── index.js
├── commands/
│   ├── setup.js
│   └── [feature].js
├── utils/
│   ├── api.js
│   ├── prompts.js
│   └── storage.js
└── README.md

CRITICAL REQUIREMENTS:
1. ALL code MUST use CommonJS require() — NOT import/export
2. Do NOT set "type": "module" in package.json

PACKAGE.JSON dependencies (ALL CommonJS-compatible):
{
  "dependencies": {
    "commander": "^11.1.0",
    "inquirer": "^8.2.6",
    "axios": "^1.6.2",
    "chalk": "^4.1.2",
    "ora": "^5.4.1",
    "cli-table3": "^0.6.3",
    "configstore": "^5.0.1",
    "dotenv": "^16.3.1"
  }
}

MANDATORY IMPORT PATTERNS:
const { Command } = require('commander');
const inquirer = require('inquirer');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const Configstore = require('configstore');
require('dotenv').config();
const config = new Configstore('project-name', {});

RULES:
- Every function FULLY implemented — NO TODOs, NO stubs
- Minimum 8 files, maximum 15 files
- ALL packages MUST be CommonJS — require() ONLY
- chalk v4, inquirer v8, ora v5, configstore v5
- Export with module.exports
- Generate ONLY the JSON object, no markdown, no code fences

RESPOND WITH ONLY VALID JSON.`;
}

// Call Grok API to generate a build plan — runs directly from Electron
ipcMain.handle('cli:plan', async (_event, prompt, language) => {
    try {
        require('dotenv').config({ path: path.join(__dirname, '.env') });
        const XAI_API_KEY = process.env.XAI_API_KEY;

        if (!XAI_API_KEY) {
            return { error: 'XAI_API_KEY not configured in .env' };
        }

        const langMap = {
            nodejs: { ext: 'js', pkg: 'package.json', installer: 'npm install', shebang: '#!/usr/bin/env node' },
            python: { ext: 'py', pkg: 'requirements.txt', installer: 'pip3 install -r requirements.txt', shebang: '#!/usr/bin/env python3' },
            go: { ext: 'go', pkg: 'go.mod', installer: 'go mod tidy', shebang: '' },
            rust: { ext: 'rs', pkg: 'Cargo.toml', installer: 'cargo build --release', shebang: '' },
        };
        const lang = langMap[language] || langMap.nodejs;

        const systemPrompt = buildCliPlanPromptDesktop(language, lang);

        const fetchModule = await import('node-fetch');
        const fetch = fetchModule.default;

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Build a production-ready CLI tool for: ${prompt}\n\nThis CLI must use REAL APIs relevant to the use case. Find a free/public API that fits the domain and use it. Every command must make real HTTP requests, display real data in tables, and handle errors gracefully. Include a first-run interactive setup wizard.` }
                ],
                temperature: 0.3,
                max_tokens: 64000,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Grok API error (${response.status}): ${errorText.substring(0, 200)}` };
        }

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Strip markdown fences if present
        content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        let plan;
        try {
            plan = JSON.parse(content);
        } catch (e1) {
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
                if (!plan) throw new Error('No JSON object found');
            } catch (e2) {
                return { error: 'Failed to parse build plan from AI' };
            }
        }

        console.log(`✅ CLI Plan: ${plan.projectName} (${plan.files?.length || 0} files)`);
        return { plan, tokens: data.usage };

    } catch (error) {
        console.error('❌ CLI plan error:', error.message);
        return { error: error.message };
    }
});

// ═══ Multi-Turn Conversational CLI Chat ═══
ipcMain.handle('cli:chat', async (_event, messages, language, sessionId) => {
    try {
        require('dotenv').config({ path: path.join(__dirname, '.env') });
        const XAI_API_KEY = process.env.XAI_API_KEY;

        if (!XAI_API_KEY) {
            return { error: 'XAI_API_KEY not configured in .env' };
        }

        const langMap = {
            nodejs: { ext: 'js', pkg: 'package.json', installer: 'npm install', shebang: '#!/usr/bin/env node' },
            python: { ext: 'py', pkg: 'requirements.txt', installer: 'pip3 install -r requirements.txt', shebang: '#!/usr/bin/env python3' },
            go: { ext: 'go', pkg: 'go.mod', installer: 'go mod tidy', shebang: '' },
            rust: { ext: 'rs', pkg: 'Cargo.toml', installer: 'cargo build --release', shebang: '' },
        };
        const lang = langMap[language] || langMap.nodejs;

        const conversationSystemPrompt = `You are an expert CLI developer assistant. You're helping a user build a production-ready CLI tool.

YOUR BEHAVIOR:
You are having a CONVERSATION with the user. You must ask questions to understand what they need before building.

CONVERSATION PHASES:

PHASE 1 — GATHERING (first 2-4 messages):
Ask the user important questions ONE AT A TIME. Questions to ask:
- What specific API or data source should this CLI use? (suggest free/public APIs)
- What authentication method? (API key, OAuth, none?)
- What specific commands/features do they want?
- Any preferences for output format, config location, etc.?

Ask questions naturally, like a senior developer would. Give suggestions and recommendations.
Be concise — 2-3 sentences max per question, not long paragraphs.

PHASE 2 — BUILDING (after you have enough info):
When you have enough information from the user, output the complete build plan.

RESPONSE FORMAT — You MUST respond with valid JSON in this exact format:

When ASKING a question:
{
  "action": "ask",
  "message": "Your question to the user (plain text, conversational)",
  "context": "brief note about what info you still need"
}

When READY TO BUILD (you have all info needed):
{
  "action": "build",
  "message": "Great, I have everything I need! Building your CLI now...",
  "plan": {
    "projectName": "lowercase-hyphenated-name",
    "displayName": "Human Friendly Name",
    "description": "One-line description",
    "language": "${language}",
    "files": [{ "filename": "path/to/file", "content": "FULL FILE CONTENT" }],
    "installCommand": "${lang.installer}",
    "testCommand": "${language === 'python' ? 'python3 index.py --help' : language === 'go' ? 'go run main.go --help' : language === 'rust' ? 'cargo run -- --help' : 'node index.js --help'}",
    "commands": [{ "name": "cmd", "description": "what it does" }]
  }
}

WHEN GENERATING THE BUILD PLAN — Follow these rules for the files:
- Use ${language === 'nodejs' ? 'commander' : language === 'python' ? 'click' : language === 'go' ? 'cobra' : 'clap'} for CLI parsing
${language === 'python' ? `- Include: requirements.txt, index.py, commands/__init__.py, commands/setup.py, commands/[feature].py, utils/__init__.py, utils/api.py, utils/storage.py, utils/prompts.py, README.md
- Use these packages in requirements.txt: click>=8.1.7, rich>=13.7.0, requests>=2.31.0, python-dotenv>=1.0.0, tabulate>=0.9.0
- Do NOT generate package.json — this is a Python project, use requirements.txt
- Use click decorators: @click.group, @click.command, @click.argument, @click.option
- Use rich for colored output and tables (NOT colorama, NOT print with ANSI)
- Use configparser for config persistence in ~/.config/project-name/config.ini
- Include __init__.py in EVERY subdirectory
- Start index.py with #!/usr/bin/env python3
- Use if __name__ == '__main__': cli() at bottom of index.py` : `- Include: index.${lang.ext}, commands/setup.${lang.ext}, commands/[feature].${lang.ext}, utils/api.${lang.ext}, utils/storage.${lang.ext}, utils/prompts.${lang.ext}, package.json, README.md
- Use these dependencies: commander@^11.1.0, inquirer@^8.2.6, axios@^1.6.2, chalk@^4.1.2, ora@^5.4.1, cli-table3@^0.6.3, configstore@^5.0.1, dotenv@^16.3.1
- ALL code MUST use CommonJS require() — NEVER use import/export or "type":"module"
- Use these exact require patterns: const inquirer = require('inquirer'); const chalk = require('chalk'); const ora = require('ora'); const Configstore = require('configstore'); const config = new Configstore('project-name');`}
- Every command MUST make real API calls — no placeholder print statements
- Include interactive setup wizard
- Full error handling everywhere
- Start entry file with ${lang.shebang}
- Minimum 8 files, maximum 15 files
- Every function fully implemented — NO TODOs, NO stubs, NO placeholders
${language !== 'python' ? '- Export with module.exports, import with require()' : ''}

IMPORTANT:
- ALWAYS respond with valid JSON only. No markdown, no code fences.
- In PHASE 1, ask ONE question at a time
- Be friendly and conversational in your messages
- Give specific API suggestions (with real URLs) when relevant
- After 2-4 questions, move to PHASE 2 and generate the build plan
- If the user's first message already gives all details, you can skip to build after 1 question`;

        // Build messages array — system prompt + full conversation history
        const apiMessages = [
            { role: 'system', content: conversationSystemPrompt },
            ...messages.map(m => ({
                role: m.role === 'system' ? 'user' : m.role,
                content: m.content
            }))
        ];

        const fetchModule = await import('node-fetch');
        const fetch = fetchModule.default;

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini',
                messages: apiMessages,
                temperature: 0.3,
                max_tokens: 64000,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { error: `Grok API error (${response.status}): ${errorText.substring(0, 200)}` };
        }

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Strip markdown fences if present
        content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        let result;
        try {
            result = JSON.parse(content);
        } catch (e1) {
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
                if (!result) throw new Error('No JSON found');
            } catch (e2) {
                // Fallback: treat as a plain text ask response
                result = { action: 'ask', message: content, context: 'parsing-fallback' };
            }
        }

        console.log(`💬 CLI Chat [${sessionId}]: action=${result.action}, msg="${(result.message || '').substring(0, 80)}..."`);
        return { result, tokens: data.usage };

    } catch (error) {
        console.error('❌ CLI chat error:', error.message);
        return { error: error.message };
    }
});

// Reveal a folder in Finder / File Explorer
ipcMain.handle('cli:reveal', async (_event, folderPath) => {
    const { shell } = require('electron');
    const fullPath = path.isAbsolute(folderPath) ? folderPath : path.join(WORKSPACE_ROOT, folderPath);
    try {
        shell.showItemInFolder(fullPath);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ============================================
// STREAMING TERMINAL — Real-time output like Cursor
// Uses spawn() instead of exec() for live streaming
// ============================================

const { spawn } = require('child_process');

// Track running processes for kill support
const runningProcesses = new Map();

ipcMain.handle('cli:exec-stream', async (event, command, cwd) => {
    try {
        if (!command) return { pid: null, error: 'No command provided' };

        // Security check
        const blocked = ['rm -rf /', 'sudo rm', '> /dev', 'mkfs', 'dd if='];
        if (blocked.some(b => command.includes(b))) {
            return { pid: null, error: 'Command blocked for security' };
        }

        let workDir = WORKSPACE_ROOT;
        if (cwd) {
            workDir = path.isAbsolute(cwd) ? cwd : path.join(WORKSPACE_ROOT, cwd);
        }
        await mkdirFs(workDir, { recursive: true });

        const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
        const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];

        const child = spawn(shell, shellArgs, {
            cwd: workDir,
            env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin', FORCE_COLOR: '1' },
        });

        const pid = child.pid;
        runningProcesses.set(pid, child);

        console.log(`⚡ Stream: [${pid}] ${command.substring(0, 60)} (in ${workDir})`);

        // Stream stdout line by line
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.length > 0) {
                    event.sender.send('cli:stream-data', { pid, type: 'stdout', data: line });
                }
            });
        });

        // Stream stderr line by line
        child.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.length > 0) {
                    event.sender.send('cli:stream-data', { pid, type: 'stderr', data: line });
                }
            });
        });

        // Process exit
        child.on('close', (code) => {
            runningProcesses.delete(pid);
            event.sender.send('cli:stream-end', { pid, exitCode: code || 0 });
            console.log(`${code === 0 ? '✅' : '⚠️'} Stream done: [${pid}] exit=${code}`);
        });

        child.on('error', (err) => {
            runningProcesses.delete(pid);
            event.sender.send('cli:stream-data', { pid, type: 'stderr', data: err.message });
            event.sender.send('cli:stream-end', { pid, exitCode: 1 });
        });

        return { pid };

    } catch (error) {
        return { pid: null, error: error.message };
    }
});

// Kill a running process
ipcMain.handle('cli:exec-kill', async (_event, pid) => {
    const child = runningProcesses.get(pid);
    if (child) {
        child.kill('SIGTERM');
        runningProcesses.delete(pid);
        return { success: true };
    }
    return { success: false, error: 'Process not found' };
});

// ============================================
// FILESYSTEM ACCESS — Full machine access like Cursor
// ============================================

const { readFile: fsReadFile, readdir, stat: fsStat, unlink, rm } = require('fs').promises;

// Read any file
ipcMain.handle('cli:fs-read', async (_event, filePath) => {
    try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKSPACE_ROOT, filePath);
        const content = await fsReadFile(fullPath, 'utf-8');
        return { content, path: fullPath, size: content.length };
    } catch (error) {
        return { error: error.message };
    }
});

// List directory contents
ipcMain.handle('cli:fs-list', async (_event, dirPath) => {
    try {
        const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(WORKSPACE_ROOT, dirPath);
        const entries = await readdir(fullPath, { withFileTypes: true });
        const items = await Promise.all(entries
            .filter(e => !e.name.startsWith('.'))  // hide dotfiles
            .map(async (entry) => {
                const entryPath = path.join(fullPath, entry.name);
                try {
                    const stats = await fsStat(entryPath);
                    return {
                        name: entry.name,
                        path: entryPath,
                        isDirectory: entry.isDirectory(),
                        size: stats.size,
                        modified: stats.mtime.toISOString(),
                    };
                } catch {
                    return {
                        name: entry.name,
                        path: entryPath,
                        isDirectory: entry.isDirectory(),
                        size: 0,
                        modified: null,
                    };
                }
            })
        );
        // Sort: directories first, then files
        items.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return { items, path: fullPath };
    } catch (error) {
        return { items: [], error: error.message };
    }
});

// Get file/dir stats
ipcMain.handle('cli:fs-stat', async (_event, filePath) => {
    try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKSPACE_ROOT, filePath);
        const stats = await fsStat(fullPath);
        return {
            path: fullPath,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
        };
    } catch (error) {
        return { error: error.message };
    }
});

// Write any file (full access — like Cursor)
ipcMain.handle('cli:fs-write', async (_event, filePath, content) => {
    try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(WORKSPACE_ROOT, filePath);
        await mkdirFs(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, 'utf-8');
        return { success: true, path: fullPath, size: content.length };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Create directory
ipcMain.handle('cli:fs-mkdir', async (_event, dirPath) => {
    try {
        const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(WORKSPACE_ROOT, dirPath);
        await mkdirFs(fullPath, { recursive: true });
        return { success: true, path: fullPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Delete file or directory
ipcMain.handle('cli:fs-delete', async (_event, targetPath) => {
    try {
        const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(WORKSPACE_ROOT, targetPath);
        const stats = await fsStat(fullPath);
        if (stats.isDirectory()) {
            await rm(fullPath, { recursive: true, force: true });
        } else {
            await unlink(fullPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

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
