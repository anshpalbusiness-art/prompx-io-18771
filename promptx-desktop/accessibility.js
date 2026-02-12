// PromptX — macOS Text Grabber (Auto-Detect Mode)
// Polls the focused input field every 1.5s using Accessibility API
// When text is stable for 3s, emits 'prompt-detected' with app context

const { execFile } = require('child_process');
const { EventEmitter } = require('events');

// ============================================
// APP CONTEXT MAPPING
// ============================================

const APP_CONTEXT = {
    // AI Coding Assistants
    'cursor': { type: 'coding', label: 'Cursor IDE', description: 'AI coding assistant prompt' },
    'code': { type: 'coding', label: 'VS Code', description: 'coding prompt' },
    'visual studio code': { type: 'coding', label: 'VS Code', description: 'coding prompt' },
    'windsurf': { type: 'coding', label: 'Windsurf', description: 'AI coding assistant prompt' },
    'zed': { type: 'coding', label: 'Zed Editor', description: 'coding prompt' },
    'trae': { type: 'coding', label: 'Trae IDE', description: 'AI coding assistant prompt' },

    // AI Chat Apps (Desktop)
    'chatgpt': { type: 'ai-chat', label: 'ChatGPT', description: 'AI assistant prompt' },
    'claude': { type: 'ai-chat', label: 'Claude', description: 'AI assistant prompt' },
    'gemini': { type: 'ai-chat', label: 'Gemini', description: 'AI assistant prompt' },
    'perplexity': { type: 'ai-chat', label: 'Perplexity', description: 'AI search/research prompt' },
    'copilot': { type: 'ai-chat', label: 'Copilot', description: 'AI assistant prompt' },
    'poe': { type: 'ai-chat', label: 'Poe', description: 'AI assistant prompt' },
    'deepseek': { type: 'ai-chat', label: 'DeepSeek', description: 'AI assistant prompt' },
    'ollama': { type: 'ai-chat', label: 'Ollama', description: 'local AI prompt' },
    'antigravity': { type: 'ai-chat', label: 'Google Antigravity', description: 'AI coding assistant prompt' },

    // Browsers (for web-based AI: ChatGPT, Claude, Gemini, etc.)
    'google chrome': { type: 'browser', label: 'Chrome', description: 'web AI prompt' },
    'safari': { type: 'browser', label: 'Safari', description: 'web AI prompt' },
    'firefox': { type: 'browser', label: 'Firefox', description: 'web AI prompt' },
    'arc': { type: 'browser', label: 'Arc', description: 'web AI prompt' },
    'brave browser': { type: 'browser', label: 'Brave', description: 'web AI prompt' },
    'microsoft edge': { type: 'browser', label: 'Edge', description: 'web AI prompt' },
    'opera': { type: 'browser', label: 'Opera', description: 'web AI prompt' },
    'orion': { type: 'browser', label: 'Orion', description: 'web AI prompt' },
    'vivaldi': { type: 'browser', label: 'Vivaldi', description: 'web AI prompt' },
    'chromium': { type: 'browser', label: 'Chromium', description: 'web AI prompt' },
    'zen browser': { type: 'browser', label: 'Zen', description: 'web AI prompt' },

    // Writing Apps
    'notes': { type: 'writing', label: 'Notes', description: 'note/writing prompt' },
    'textedit': { type: 'writing', label: 'TextEdit', description: 'writing prompt' },
    'pages': { type: 'writing', label: 'Pages', description: 'document writing prompt' },
    'notion': { type: 'writing', label: 'Notion', description: 'document/note prompt' },
    'obsidian': { type: 'writing', label: 'Obsidian', description: 'note/knowledge prompt' },
    'craft': { type: 'writing', label: 'Craft', description: 'document prompt' },
    'bear': { type: 'writing', label: 'Bear', description: 'note prompt' },

    // Communication
    'slack': { type: 'messaging', label: 'Slack', description: 'message draft' },
    'discord': { type: 'messaging', label: 'Discord', description: 'message draft' },
    'messages': { type: 'messaging', label: 'Messages', description: 'message draft' },
    'telegram': { type: 'messaging', label: 'Telegram', description: 'message draft' },
    'whatsapp': { type: 'messaging', label: 'WhatsApp', description: 'message draft' },
    'mail': { type: 'email', label: 'Mail', description: 'email draft' },

    // Terminal
    'terminal': { type: 'terminal', label: 'Terminal', description: 'terminal command' },
    'iterm2': { type: 'terminal', label: 'iTerm2', description: 'terminal command' },
    'warp': { type: 'terminal', label: 'Warp', description: 'terminal prompt' },
};

function getAppContext(appName) {
    if (!appName) return { type: 'general', label: 'Unknown', description: 'general prompt' };

    const lower = appName.toLowerCase();

    // Direct match
    if (APP_CONTEXT[lower]) return APP_CONTEXT[lower];

    // Partial match
    for (const [key, ctx] of Object.entries(APP_CONTEXT)) {
        if (lower.includes(key) || key.includes(lower)) return ctx;
    }

    return { type: 'general', label: appName, description: 'general prompt' };
}

// ============================================
// ACCESSIBILITY WATCHER
// ============================================

class AccessibilityWatcher extends EventEmitter {
    constructor(options = {}) {
        super();
        this.pollInterval = options.pollInterval || 1500;  // Poll every 1.5s
        this.debounceMs = options.debounceMs || 3000;      // Wait 3s after last change
        this.minLength = options.minLength || 10;
        this.enabled = true;

        this._timer = null;
        this._debounceTimer = null;
        this._lastText = '';
        this._lastEnhancedText = '';
        this._lastEnhancedTexts = new Set();
        this._isReading = false;
        this._lastApp = '';
    }

    // ============================================
    // GRAB TEXT: One-shot ⌘A ⌘C grab
    // Called when user presses ⌥P
    // ============================================

    grabFocusedText() {
        return new Promise((resolve) => {
            const script = `
                try
                    tell application "System Events"
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        
                        delay 0.05
                        
                        -- Select all in focused field
                        key code 0 using {command down}
                        delay 0.15
                        
                        -- Copy selection
                        key code 8 using {command down}
                        delay 0.15
                        
                        return appName
                    end tell
                on error errMsg
                    return "error:" & errMsg
                end try
            `;

            console.log('📎 Running text grab AppleScript...');

            execFile('osascript', ['-e', script], { timeout: 5000 }, (err, stdout, stderr) => {
                if (err) {
                    console.log('❌ AppleScript error:', err.message);
                    if (stderr) console.log('   stderr:', stderr.trim());
                    return resolve({ success: false, app: null, error: err.message });
                }

                const output = (stdout || '').trim();
                console.log('📎 AppleScript returned:', output);

                if (output.startsWith('error:')) {
                    return resolve({ success: false, app: null, error: output });
                }

                resolve({ success: true, app: output.toLowerCase() });
            });
        });
    }

    // ============================================
    // BACKGROUND POLL: Read via Accessibility API
    // ============================================

    _readFocusedField() {
        return new Promise((resolve) => {
            if (this._isReading) return resolve(null);
            this._isReading = true;

            const script = `
                try
                    tell application "System Events"
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        set focusedElem to value of attribute "AXFocusedUIElement" of frontApp

                        -- Try direct value
                        try
                            set fieldValue to value of focusedElem
                            if fieldValue is not "" and fieldValue is not missing value then
                                return appName & "|||" & fieldValue
                            end if
                        end try

                        -- Try AXValue attribute
                        try
                            set fieldValue to value of attribute "AXValue" of focusedElem
                            if fieldValue is not "" and fieldValue is not missing value then
                                return appName & "|||" & fieldValue
                            end if
                        end try

                        -- Try children text areas
                        try
                            set childElements to UI elements of focusedElem
                            repeat with child in childElements
                                try
                                    set childVal to value of child
                                    if childVal is not "" and childVal is not missing value then
                                        return appName & "|||" & childVal
                                    end if
                                end try
                            end repeat
                        end try
                    end tell
                    return "none|||"
                on error
                    return "error|||"
                end try
            `;

            execFile('osascript', ['-e', script], { timeout: 3000 }, (err, stdout) => {
                this._isReading = false;
                if (err) return resolve(null);

                const output = (stdout || '').trim();
                if (!output || output.startsWith('error|||') || output.startsWith('none|||')) {
                    return resolve(null);
                }

                const idx = output.indexOf('|||');
                if (idx === -1) return resolve(null);

                const app = output.substring(0, idx).trim();
                const text = output.substring(idx + 3).trim();
                if (!text || text.length < this.minLength) return resolve(null);

                resolve({ app, text });
            });
        });
    }

    // ============================================
    // PROMPT DETECTION HEURISTIC
    // ============================================

    _isLikelyPrompt(text) {
        // Too many special code characters = probably code, not a prompt
        const codeCharsCount = (text.match(/[{}();=<>]/g) || []).length;
        const codeRatio = codeCharsCount / text.length;
        if (codeRatio > 0.15) return false;

        // Has spaces and words = likely natural language
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 3) return false;

        // Contains common prompt patterns
        const promptPatterns = /\b(create|make|build|write|generate|design|implement|add|fix|update|change|help|explain|how|what|why|show|give|convert|translate|optimize|improve|refactor|debug|test|deploy|analyze|list|find|search|remove|delete|combine|merge|split|compare|summarize|describe|can you|please|i want|i need)\b/i;
        if (promptPatterns.test(text)) return true;

        // If it's mostly alphanumeric + spaces, it's likely a prompt
        const alphaRatio = (text.match(/[a-zA-Z\s]/g) || []).length / text.length;
        if (alphaRatio > 0.8) return true;

        return false;
    }

    // ============================================
    // POLLING LOOP
    // ============================================

    start() {
        if (this._timer) return;
        console.log('👁️  Accessibility watcher started (poll: ${this.pollInterval}ms, debounce: ${this.debounceMs}ms)');

        this._timer = setInterval(async () => {
            if (!this.enabled) return;
            try {
                const result = await this._readFocusedField();
                if (!result) return;

                const { app, text } = result;

                // Skip if same text as before, or already enhanced
                if (text === this._lastText) return;
                if (this._lastEnhancedTexts.has(text)) return;

                // Update last seen text and app
                this._lastText = text;
                this._lastApp = app;

                // Clear existing debounce timer
                clearTimeout(this._debounceTimer);

                // Start debounce — wait for text to be stable for 3s
                this._debounceTimer = setTimeout(() => {
                    // Re-check: text must still be the same and not enhanced
                    if (text === this._lastText && !this._lastEnhancedTexts.has(text)) {
                        // Check if it looks like a prompt
                        if (this._isLikelyPrompt(text)) {
                            const appContext = getAppContext(app);
                            console.log(`\n✨ Auto-detected prompt in ${appContext.label} (${text.length} chars)`);
                            console.log(`   Text: "${text.substring(0, 80)}..."`);
                            console.log(`   Context: ${appContext.description}`);
                            this.emit('prompt-detected', { app, text, appContext });
                        }
                    }
                }, this.debounceMs);
            } catch (err) { /* silent */ }
        }, this.pollInterval);
    }

    stop() {
        clearInterval(this._timer);
        clearTimeout(this._debounceTimer);
        this._timer = null;
    }

    markEnhanced(text) {
        this._lastEnhancedTexts.add(text);
        this._lastEnhancedText = text;
        // Keep only last 30
        if (this._lastEnhancedTexts.size > 30) {
            const first = this._lastEnhancedTexts.values().next().value;
            this._lastEnhancedTexts.delete(first);
        }
    }

    setEnabled(enabled) { this.enabled = enabled; }
}

module.exports = { AccessibilityWatcher, getAppContext };
