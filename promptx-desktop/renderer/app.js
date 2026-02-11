// PromptX Desktop — Deep Navy Glass Logic

let currentEnhancement = null;
let originalPrompt = '';

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // States
    idleState: document.getElementById('idle-state'),
    loadingState: document.getElementById('loading-state'),
    resultState: document.getElementById('result-state'),

    // Header
    statusText: document.getElementById('status-text'),
    statusDot: document.getElementById('status-dot'),
    closeBtn: document.getElementById('close-btn'),

    // Result
    resultText: document.getElementById('result-text'),
    charCount: document.getElementById('char-count'),
    tipsSection: document.getElementById('tips-section'),
    tipsText: document.getElementById('tips-text'),

    // Actions
    copyBtn: document.getElementById('copy-btn'), // "Use"
    copyTextBtn: document.getElementById('copy-text-btn'), // "Copy"
    undoBtn: document.getElementById('undo-btn'), // "Undo"

    // Footer
    autoEnhanceToggle: document.getElementById('auto-enhance-toggle')
};

// ============================================
// STATE MANAGEMENT
// ============================================

function showState(state) {
    // Hide all first
    elements.idleState.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.resultState.style.display = 'none'; // Using display for flex/grid logic

    if (state === 'idle') {
        elements.idleState.classList.remove('hidden');
        resetHeader('READY', 'var(--success)');
    } else if (state === 'loading') {
        elements.loadingState.classList.remove('hidden');
        resetHeader('ENHANCING', '#a78bfa');
    } else if (state === 'result') {
        elements.resultState.style.display = 'flex';
        resetHeader('DONE', '#a78bfa');
        elements.resultState.classList.add('fade-in');
    }
}

function resetHeader(text, color) {
    elements.statusText.textContent = text;
    elements.statusDot.style.backgroundColor = color;
    if (text === 'READY') {
        elements.statusDot.classList.add('pulsing');
    } else {
        elements.statusDot.classList.remove('pulsing');
    }
}

// ============================================
// LOGIC
// ============================================

async function processPrompt(prompt, source = 'manual') {
    if (!prompt || prompt.length < 5) return;

    originalPrompt = prompt;
    showState('loading');

    try {
        const result = await window.promptx.enhance(prompt);

        if (result.error) {
            elements.resultText.textContent = `❌ ${result.error}`;
            showState('result');
            return;
        }

        currentEnhancement = result.enhanced;

        // Update Enhanced View
        elements.resultText.textContent = result.enhanced;

        // Stats
        const origLen = originalPrompt.length;
        const newLen = result.enhanced.length;
        const pct = Math.round(((newLen - origLen) / origLen) * 100);
        elements.charCount.textContent = `${origLen} -> ${newLen} chars (↑${Math.abs(pct)}%)`;

        // Tips
        if (result.tips && result.tips.length > 0) {
            elements.tipsSection.style.display = 'block';
            elements.tipsText.innerHTML = result.tips.map(t => `• ${t}`).join('<br>');
        } else {
            elements.tipsSection.style.display = 'none';
        }

        showState('result');

    } catch (err) {
        elements.resultText.textContent = `❌ Error: ${err.message}`;
        showState('result');
    }
}

// ============================================
// ACTIONS
// ============================================

// "Use" Button -> Copy and Paste into active app
elements.copyBtn.addEventListener('click', async () => {
    if (currentEnhancement) {
        await window.promptx.pasteToApp(currentEnhancement);
        // Overlay hides automatically via pasteToApp
    }
});

// "Copy" Button -> Copy only
elements.copyTextBtn.addEventListener('click', async () => {
    if (currentEnhancement) {
        await window.promptx.writeClipboard(currentEnhancement);
        showToast('📋 Copied to clipboard');
    }
});

// "Undo" Button -> Show Original
elements.undoBtn.addEventListener('click', () => {
    if (elements.resultText.textContent === originalPrompt) {
        // Redo? No, just keep simple
        return;
    }
    // Swap text to original
    elements.resultText.textContent = originalPrompt;
    elements.charCount.textContent = 'Original Prompt';
});

// Toggle Switch
elements.autoEnhanceToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    window.promptx.toggleAutoEnhance(enabled);

    if (enabled) {
        elements.statusText.textContent = 'READY';
    } else {
        elements.statusText.textContent = 'PAUSED';
        elements.statusDot.classList.remove('pulsing');
        elements.statusDot.style.backgroundColor = '#64748b'; // Slate 500
    }
});

// Close
elements.closeBtn.addEventListener('click', () => {
    window.promptx.hideOverlay();
});

// ESC Key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.promptx.hideOverlay();
    }
});

// Toast Helper
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
}

// ============================================
// IPC EVENTS
// ============================================

window.promptx.onShown((data) => {
    const { clipboardText, autoEnhance } = data || {};

    // Reset toggle UI if needed (optimization: sync with main process)
    // elements.autoEnhanceToggle.checked = true; // Assume true on show for now

    if (clipboardText && clipboardText.length >= 5) {
        // If triggered by auto-enhance or manual paste, process it
        processPrompt(clipboardText, autoEnhance ? 'auto' : 'manual');
    } else {
        showState('idle');
    }
});

window.promptx.onHidden(() => {
    // Optional: Reset state
    setTimeout(() => showState('idle'), 300);
});

// ============================================
// RESIZE OBSERVER
// ============================================

const resizeObserver = new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    window.promptx.resize(height);
});
resizeObserver.observe(document.body);
