// PromptX — macOS Text Grabber
// Grabs text from the focused input field in ANY app using multiple strategies

const { execFile } = require('child_process');
const { EventEmitter } = require('events');

class AccessibilityWatcher extends EventEmitter {
    constructor(options = {}) {
        super();
        this.pollInterval = options.pollInterval || 2000;
        this.debounceMs = options.debounceMs || 2500;
        this.minLength = options.minLength || 10;
        this.enabled = true;

        this._timer = null;
        this._debounceTimer = null;
        this._lastText = '';
        this._lastEnhancedText = '';
        this._isReading = false;
    }

    // ============================================
    // GRAB TEXT: One-shot ⌘A ⌘C grab
    // Called when user presses ⌥P
    // ============================================

    grabFocusedText() {
        return new Promise((resolve) => {
            // This AppleScript:
            // 1. Gets the name of the frontmost app
            // 2. Simulates ⌘A (select all) in the focused field
            // 3. Simulates ⌘C (copy) to clipboard
            // 4. Returns the app name
            const script = `
                try
                    tell application "System Events"
                        set frontApp to first application process whose frontmost is true
                        set appName to name of frontApp
                        
                        -- Small delay to ensure we're targeting the right app
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
    // Works for native apps (Notes, TextEdit, etc.)
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

                const app = output.substring(0, idx).toLowerCase();
                const text = output.substring(idx + 3).trim();
                if (!text || text.length < this.minLength) return resolve(null);

                resolve({ app, text });
            });
        });
    }

    // ============================================
    // POLLING LOOP
    // ============================================

    start() {
        if (this._timer) return;
        console.log('👁️  Accessibility watcher started');

        this._timer = setInterval(async () => {
            if (!this.enabled) return;
            try {
                const result = await this._readFocusedField();
                if (!result) return;

                const { app, text } = result;
                if (text === this._lastText || text === this._lastEnhancedText) return;

                this._lastText = text;
                clearTimeout(this._debounceTimer);

                this._debounceTimer = setTimeout(() => {
                    if (text === this._lastText && text !== this._lastEnhancedText) {
                        console.log(`✨ Auto-detected in ${app} (${text.length} chars)`);
                        this.emit('prompt-detected', { app, text });
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

    markEnhanced(text) { this._lastEnhancedText = text; }
    setEnabled(enabled) { this.enabled = enabled; }
}

module.exports = { AccessibilityWatcher };
