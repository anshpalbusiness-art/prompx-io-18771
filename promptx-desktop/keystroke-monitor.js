// PromptX — Global Keystroke Monitor
// Captures keystrokes from ANY app and builds a text buffer
// When user pauses typing for 3s with enough text, emits 'prompt-ready'

const { GlobalKeyboardListener } = require('node-global-key-listener');
const { EventEmitter } = require('events');

class KeystrokeMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.pauseMs = options.pauseMs || 3000;       // 3s pause = prompt ready
        this.minLength = options.minLength || 12;       // Min chars to trigger
        this.maxLength = options.maxLength || 5000;     // Max buffer size
        this.enabled = true;

        this._buffer = '';
        this._pauseTimer = null;
        this._listener = null;
        this._shiftDown = false;
        this._lastActivity = 0;
        this._enhancedTexts = new Set();  // Track enhanced text to avoid re-trigger
    }

    // ============================================
    // KEY → CHARACTER MAPPING
    // ============================================

    _keyToChar(event) {
        const name = event.name || '';
        const state = event.state;

        // Track shift state
        if (name === 'LEFT SHIFT' || name === 'RIGHT SHIFT') {
            if (state === 'DOWN') this._shiftDown = true;
            if (state === 'UP') this._shiftDown = false;
            return null;
        }

        // Only process key DOWN events
        if (state !== 'DOWN') return null;

        // Ignore modifier keys
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

        // Special keys
        if (name === 'SPACE') return ' ';
        if (name === 'RETURN' || name === 'ENTER') return '\n';
        if (name === 'BACKSPACE') return '\b';

        // Letter keys (a-z)
        if (name.length === 1 && /^[A-Z]$/.test(name)) {
            return this._shiftDown ? name : name.toLowerCase();
        }

        // Number keys with shift = symbols
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

        // Punctuation
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

    // ============================================
    // START MONITORING
    // ============================================

    start() {
        try {
            this._listener = new GlobalKeyboardListener();
        } catch (err) {
            console.error('❌ Failed to start keystroke monitor:', err.message);
            console.error('   Make sure Accessibility permission is granted');
            this.emit('permission-needed');
            return;
        }

        this._listener.addListener((event) => {
            if (!this.enabled) return;

            const char = this._keyToChar(event);
            if (char === null) return;

            // Handle backspace
            if (char === '\b') {
                if (this._buffer.length > 0) {
                    this._buffer = this._buffer.slice(0, -1);
                }
            } else {
                this._buffer += char;
            }

            // Trim buffer if too long
            if (this._buffer.length > this.maxLength) {
                this._buffer = this._buffer.slice(-this.maxLength);
            }

            this._lastActivity = Date.now();

            // Reset pause timer — user is still typing
            clearTimeout(this._pauseTimer);

            // Check if buffer has enough content
            const trimmed = this._buffer.trim();
            if (trimmed.length >= this.minLength) {
                this._pauseTimer = setTimeout(() => {
                    this._onTypingPaused();
                }, this.pauseMs);
            }
        });

        console.log('⌨️  Keystroke monitor active — detecting typing in ANY app');
    }

    // ============================================
    // TYPING PAUSED — CHECK IF IT'S A PROMPT
    // ============================================

    _onTypingPaused() {
        const text = this._buffer.trim();

        // Skip if too short or already enhanced
        if (text.length < this.minLength) return;
        if (this._enhancedTexts.has(text)) return;

        // Simple heuristic: is this likely a prompt?
        // Prompts are usually natural language, not code
        const looksLikePrompt = this._isLikelyPrompt(text);

        if (looksLikePrompt) {
            console.log(`✨ Prompt detected (${text.length} chars): "${text.substring(0, 60)}..."`);
            this.emit('prompt-ready', { text });
        }
    }

    // ============================================
    // PROMPT DETECTION HEURISTIC
    // ============================================

    _isLikelyPrompt(text) {
        // Too many special code characters = probably code
        const codeCharsCount = (text.match(/[{}();=<>]/g) || []).length;
        const codeRatio = codeCharsCount / text.length;
        if (codeRatio > 0.15) return false;   // >15% code chars = likely code

        // Has spaces and words = likely natural language
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 3) return false;   // Less than 3 words = too short

        // Contains common prompt patterns
        const promptPatterns = /\b(create|make|build|write|generate|design|implement|add|fix|update|change|help|explain|how|what|why|show|give|convert|translate|optimize|improve|refactor|debug|test|deploy|analyze|list|find|search|remove|delete|combine|merge|split|compare|summarize|describe)\b/i;
        if (promptPatterns.test(text)) return true;

        // If it's mostly alphanumeric + spaces, it's likely a prompt
        const alphaRatio = (text.match(/[a-zA-Z\s]/g) || []).length / text.length;
        if (alphaRatio > 0.8) return true;

        return false;
    }

    // ============================================
    // CONTROL
    // ============================================

    // Mark text as enhanced to prevent re-triggering
    markEnhanced(text) {
        this._enhancedTexts.add(text);
        // Only keep last 20 enhanced texts
        if (this._enhancedTexts.size > 20) {
            const first = this._enhancedTexts.values().next().value;
            this._enhancedTexts.delete(first);
        }
    }

    // Clear buffer (e.g. after enhancement or app switch)
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
