// PromptX — Global Keystroke Monitor
// Captures keystrokes from ANY app and builds a text buffer
// When user pauses typing for 3s with enough text, emits 'prompt-ready'
// Fixed for PACKAGED APP: accepts custom binary path to avoid asar issues

const { EventEmitter } = require('events');

class KeystrokeMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.pauseMs = options.pauseMs || 3000;
        this.minLength = options.minLength || 10;
        this.maxLength = options.maxLength || 5000;
        this.binaryPath = options.binaryPath || null; // Custom binary path for packaged app
        this.enabled = true;

        this._buffer = '';
        this._pauseTimer = null;
        this._listener = null;
        this._shiftDown = false;
        this._lastActivity = 0;
        this._enhancedTexts = new Set();
    }

    _keyToChar(event) {
        const name = event.name || '';
        const state = event.state;

        if (name === 'LEFT SHIFT' || name === 'RIGHT SHIFT') {
            if (state === 'DOWN') this._shiftDown = true;
            if (state === 'UP') this._shiftDown = false;
            return null;
        }

        if (state !== 'DOWN') return null;

        if (['LEFT CTRL', 'RIGHT CTRL', 'LEFT ALT', 'RIGHT ALT',
            'LEFT META', 'RIGHT META', 'CAPS LOCK', 'TAB',
            'ESCAPE', 'UP', 'DOWN', 'LEFT', 'RIGHT',
            'HOME', 'END', 'PAGE UP', 'PAGE DOWN',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            'INSERT', 'DELETE', 'PRINT SCREEN', 'SCROLL LOCK', 'PAUSE BREAK',
            'NUM LOCK'
        ].includes(name)) {
            return null;
        }

        if (name === 'SPACE') return ' ';
        if (name === 'RETURN' || name === 'ENTER') return '\n';
        if (name === 'BACKSPACE') return '\b';

        if (name.length === 1 && /^[A-Z]$/.test(name)) {
            return this._shiftDown ? name : name.toLowerCase();
        }

        if (/^[0-9]$/.test(name)) {
            if (this._shiftDown) {
                const shiftMap = {
                    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')'
                };
                return shiftMap[name] || name;
            }
            return name;
        }

        const punctMap = {
            'PERIOD': '.', 'COMMA': ',', 'FORWARD SLASH': '/',
            'BACKWARD SLASH': '\\', 'SEMICOLON': ';', 'QUOTE': "'",
            'OPEN BRACKET': '[', 'CLOSE BRACKET': ']', 'MINUS': '-',
            'EQUAL': '=', 'BACKTICK': '`',
            'SECTION': '`', 'DOT': '.', 'SLASH': '/'
        };

        const shiftPunctMap = {
            'PERIOD': '>', 'COMMA': '<', 'FORWARD SLASH': '?',
            'BACKWARD SLASH': '|', 'SEMICOLON': ':', 'QUOTE': '"',
            'OPEN BRACKET': '{', 'CLOSE BRACKET': '}', 'MINUS': '_',
            'EQUAL': '+', 'BACKTICK': '~'
        };

        if (this._shiftDown && shiftPunctMap[name]) return shiftPunctMap[name];
        if (punctMap[name]) return punctMap[name];

        return null;
    }

    start() {
        try {
            const { GlobalKeyboardListener } = require('node-global-key-listener');

            const config = {};
            if (this.binaryPath) {
                config.mac = {
                    serverPath: this.binaryPath,
                    onError: (errorCode) => {
                        console.error(`❌ MacKeyServer exited with code: ${errorCode}`);
                        this.emit('error', { code: errorCode });
                    },
                    onInfo: (info) => {
                        console.log(`ℹ️  MacKeyServer info: ${info}`);
                    }
                };
                console.log(`⌨️  Using binary: ${this.binaryPath}`);
            }

            this._listener = new GlobalKeyboardListener(config);
        } catch (err) {
            console.error('❌ Failed to start keystroke monitor:', err.message);
            console.error('   Make sure Accessibility permission is granted');
            this.emit('permission-needed');
            return false;
        }

        this._listener.addListener((event) => {
            if (!this.enabled) return;

            const char = this._keyToChar(event);
            if (char === null) return;

            if (char === '\b') {
                if (this._buffer.length > 0) {
                    this._buffer = this._buffer.slice(0, -1);
                }
            } else {
                this._buffer += char;
            }

            if (this._buffer.length > this.maxLength) {
                this._buffer = this._buffer.slice(-this.maxLength);
            }

            this._lastActivity = Date.now();

            clearTimeout(this._pauseTimer);

            const trimmed = this._buffer.trim();
            if (trimmed.length >= this.minLength) {
                this._pauseTimer = setTimeout(() => {
                    this._onTypingPaused();
                }, this.pauseMs);
            }
        });

        console.log('⌨️  Keystroke monitor active');
        return true;
    }

    _onTypingPaused() {
        const text = this._buffer.trim();

        if (text.length < this.minLength) return;
        if (this._enhancedTexts.has(text)) return;

        const looksLikePrompt = this._isLikelyPrompt(text);

        if (looksLikePrompt) {
            console.log(`✨ Prompt detected (${text.length} chars): "${text.substring(0, 80)}"`);
            this.emit('prompt-ready', { text });
        } else {
            // NOT a prompt — clear the buffer so next typing session is clean
            console.log(`⌨️  Not a prompt (${text.length} chars) — clearing buffer`);
            this._buffer = '';
        }
    }

    _isLikelyPrompt(text) {
        const codeCharsCount = (text.match(/[{}();=<>]/g) || []).length;
        const codeRatio = codeCharsCount / text.length;
        if (codeRatio > 0.15) return false;

        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 3) return false;

        const promptPatterns = /\b(create|make|build|write|generate|design|implement|add|fix|update|change|help|explain|how|what|why|show|give|convert|translate|optimize|improve|refactor|debug|test|deploy|analyze|list|find|search|remove|delete|combine|merge|split|compare|summarize|describe|can you|please|i want|i need)\b/i;
        if (promptPatterns.test(text)) return true;

        const alphaRatio = (text.match(/[a-zA-Z\s]/g) || []).length / text.length;
        if (alphaRatio > 0.8) return true;

        return false;
    }

    markEnhanced(text) {
        this._enhancedTexts.add(text);
        if (this._enhancedTexts.size > 20) {
            const first = this._enhancedTexts.values().next().value;
            this._enhancedTexts.delete(first);
        }
    }

    clearBuffer() {
        this._buffer = '';
        clearTimeout(this._pauseTimer);
    }

    getBuffer() {
        return this._buffer.trim();
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            clearTimeout(this._pauseTimer);
        }
    }

    stop() {
        if (this._listener) {
            this._listener.kill();
            this._listener = null;
        }
        clearTimeout(this._pauseTimer);
        console.log('⌨️  Keystroke monitor stopped');
    }
}

module.exports = { KeystrokeMonitor };
