// PromptX Extension — Content Script
// Injected into AI chatbot pages to detect prompts and show enhancement widget

(function () {
    'use strict';


    // Actual PromptX logo as base64 data URI (32x32 PNG, optimized for widget)
    const PROMPTX_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAAIMElEQVRIDT1W228dRxnfuezt7LnbPnawU1+SNDQQQkQVTKK2gKAURIGAIBIg8UAe4A0eUNO/ggcgqgo8IFQ1kEZKJZRWfYgiaBMKotCkDZji2k4d59g55+z63Pcyu/y+Waez9pzZme/7ft99ljV37tm2ZWQsM+gxsoxxZjBmmmYYhnjljBuMZ5nKMkNwLECUE6Z0BOI0S9MUCAH+FOyMOa436vcgx7Zs5vvtXHQGsXg0P4lgmGgwgxOqFmpoNfJdnIBxj+UBMTQDiMpSkxMeHknU0IkI9ZLkaU7wchzhLNVgdM7JOCNTmhVMDC96JsVICjg5bDEErMIGqMlk4tekWlOmbdCARKJx6TczLdZuh347Nk28kmj6A34unJDpXaUKHiNgOsxggZahz4BHRIRHj94jMttiYahefW3r8sWmKeQ3v7Pv5ON12xFJnJLanFmmFccxHAbpUspM0T5Jxlmn0yElNBxtItp49CGMRFSFYG+/3b544c6tfw4sKU0hJJNHP1H8xpl9B464qTKkZcdRxBB/yNVBBjvcT9jACIIO/AX3Egx2aJvgbdtWabzdHL544vtXr+6oUHqO7ZiOyaU0mFC86JnLT1S+cHqiMimTBDJyHXXgSXtKJ0qqjt/WvtSo8DSiZDBpsdEoufLK6oU//K+1E7uW65pu0a0U3aItJYvjTMUy4yLl+6bdU18pH3nctV2hEi0p9wOcQ/nqsLbfpmTRu8AV2Ofsxpubv/v9zVs3O7bluFbBtaslr1awXJ4KR/KiLawsS6KYJamZcscw5w6bJ05XZo+gnlAYUiUKImECWQILtLPIa0LwZjM4/9z1q9fWVSI917XtsleY8pwKPMOUEKlwpSxYsuJyT3IGS6KIpwYJYFcePFF45MtmbcZRMapSZyDhQWFSn4Zpyleu/O2FF15VKoTajlsvFafwQ7WToIyF40jbNgUTcciTiLm2bJS8asF1XZklyZ8v3b79xnaaJSQdWuuAS5R3npqAgU04VmFrGHBvpuYWahmUi4RpWYh5wZYeap9zicxBQiRGOEIusJJr7XbbWzvrQd8fDctCyjRWlClUK5mktKeHXARNJ+q1UqnOMt7ZficdjyenjznFquM4bkFCkGsJm3FTMZ6kIspMxeMwXdte2+3eF9wuerVao4w60zEl6SgHFJruczo1wyj56tOfCXbF8+df6/fa40Gn668W3KxUWXILtmMJzxQWARimylicDtpBp+33+36YhNVK5YnvHjj22Yk01jpTupIJEnNGhYYEzSzJb9z470uX/1VtHK5PjMbDUcrSTrAlLbUwv1Qp1V0ubYTKYOPuaKfVGQZdppRd8CrlRqXQuH1tOLnADxyvpyhqCkFGGU+/VBZkB8K4vrF16x83GtOH5uaX9y/Ox/FOz2+Ne8Pm2pYIjepswzbk/Xv9diuIRyFqYnqxWirUuu3x5ubqvZ2Ng59/9NCnJvJOpJ1C0UIJUoA1SIrWoFQ66m9v3XnTMuXiwx+fnV8c3m+Oe6rdGsgksIxiL0ig2vRMcW6mJjN7Y/Xu2trKYNAdxwgOpaTOIQikShbnzj2rUxQTcsio1yuMWZsfBP1uLxwMoyQq16bmFvdPTBTSMItCriLpeezQR4uzsxP9IFz598b62mowbHsl77GnDy8/td9GylKDJyT8i3PPPkOQVHVwVlarepONiXf+0/P9Ma6rKFLdYDdV2eTU5EPzNTS+clUeOFxSKntv5d7t2xsdvxvFY8uxHv7YgS9+f3FmoYCjPY0pyIx1gjbk5v6yLXn12s2f/OyPmVHGKJholjJV3LYoAQ8uzS7MNyzGtjd3N97fHuwO0JQ8xyy72DPHQ6mU/71n9n/y1CxVsgYBgCTpFABsZOhE2zudu+vvVmr7OJu36qXqxJQwjGF/EAT3b94cNjdbtrT9Vg/NriDF1HS9aJfGgyTo7nT8tY6/1bpf5mIuibV7qBL0hUPSNaKeUChJEu0Oe3dMKXBtFovV6uRkMo4GQbe5M7a4DciJWrXu1bKx8P1Rr7/pB3fG434Yo0nkokjffEikZopbQ/cmdMFjxw6ePHX0rbdWjVF3V63E445KllQ87Xm1yYbXDwLB0qn6Pp45Pspr1PKD94ejTqZwi1nHlw8fPNJAElKRQTx9n3DWH/SSJKGaoy0AqdE4unDh2m9+feXupu866HmFUvkjlfJC0ZlyLY8zkyXIpd6otzHoNRVGzBoz1TM/XP7S6Udwb8SJvh/JFoSYsd2uD8zcSZgpcwW3LLm+sX3+ly9ffun6OMwAYtmFcmmuUlyS3ApHzUF/K8W1E2VewX3ya0fPnF1+aHEyjpJUX9LaOQAgqZRFSCGCyyd9iEng8uXs+uvv/uLnL9+4vmKauI+Fa1VNYcfJwFDMUOLRE0s/+umTxz89j6+IhC4ZnS3knQ+F0ZXZgmTqSNooIsrXms62zOEovHTxL8/96k8fbLQ8NFUAhMn8wswPzn7u698+USg4UYSrMh8P9MwxSBTHldmhdoehEXTC7kEBibA5mr51Z337t89fuXThdWbIb5157OyPn5rdXwcStWYkOthQSzkfp4WGwLbB/KBDHsKZVlx/suyVBnZBoU8MQenG//7XFWTayVNHEnwAwSck5kOSfPVANulMR/mdrAXpDW1KvqJjoGLSKOQ600QNHART85JeeYnmr8RL1AS7N1BoRKFNo4WWqYlARhbr+Of2EkuMuzC3SMvZM5dEEmHODT4iJRQSyMM4hGoYtEVndBHRK7KZDECYiDYnR5emFZolUUAz+qMlWYqvH1qDgWhIUoZPyv8DW/9h290X3dcAAAAASUVORK5CYII=';


    // Site-specific textarea selectors (multiple fallbacks per site)
    const SITE_SELECTORS = {
        'chatgpt.com': [
            '#prompt-textarea',
            '[id="prompt-textarea"]',
            'div[contenteditable="true"][data-placeholder]',
            'div.ProseMirror[contenteditable="true"]',
            'textarea[data-id="root"]',
            'form textarea'
        ],
        'chat.openai.com': [
            '#prompt-textarea',
            '[id="prompt-textarea"]',
            'div[contenteditable="true"][data-placeholder]',
            'div.ProseMirror[contenteditable="true"]',
            'textarea[data-id="root"]',
            'form textarea'
        ],
        'claude.ai': [
            'div.ProseMirror[contenteditable="true"]',
            'fieldset div[contenteditable="true"]',
            'div[contenteditable="true"]'
        ],
        'gemini.google.com': [
            '.ql-editor[contenteditable="true"]',
            'rich-textarea .textarea',
            'div[contenteditable="true"]',
            'textarea'
        ],
        'grok.com': [
            'textarea',
            'textarea[placeholder]',
            'div[contenteditable="true"]',
            'div[role="textbox"]',
            '[data-testid="tweetTextarea_0"]',
            '.DraftEditor-root [contenteditable="true"]'
        ],
        'x.com': [
            'textarea',
            'textarea[placeholder]',
            'div[contenteditable="true"]',
            'div[role="textbox"]',
            '.DraftEditor-root [contenteditable="true"]'
        ],
        'perplexity.ai': [
            'textarea[placeholder]',
            'textarea',
            'div[contenteditable="true"]'
        ],
        'chat.deepseek.com': [
            'textarea#chat-input',
            'textarea',
            'div[contenteditable="true"]'
        ],
        'chat.mistral.ai': [
            'textarea',
            'div[contenteditable="true"]'
        ],
        'copilot.microsoft.com': [
            '#searchbox',
            'textarea',
            'div[contenteditable="true"]'
        ]
    };

    // State
    let widget = null;
    let debounceTimer = null;
    let lastPrompt = '';
    let lastOriginalPrompt = '';
    let currentEnhancement = null;
    let isEnabled = true;
    let isEnhancing = false;
    let isMinimized = false;
    let attachedElements = new WeakSet();

    // Detect current site
    function getCurrentSite() {
        const hostname = window.location.hostname;
        for (const site of Object.keys(SITE_SELECTORS)) {
            if (hostname.includes(site)) return site;
        }
        return null;
    }

    // Get textarea element for current site — tries multiple selectors
    function getTextarea() {
        const site = getCurrentSite();
        if (!site) return null;
        const selectors = SITE_SELECTORS[site];
        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (el) return el;
            } catch (e) {
                continue;
            }
        }
        return null;
    }

    // Get text content from various input types
    function getInputText(element) {
        if (!element) return '';
        if (element.getAttribute('contenteditable') === 'true') {
            return (element.innerText || element.textContent || '').trim();
        }
        return (element.value || element.innerText || element.textContent || '').trim();
    }

    // Set text content back into input
    function setInputText(element, text) {
        if (!element) return;

        if (element.getAttribute('contenteditable') === 'true') {
            // For contenteditable divs (Claude, Gemini, ChatGPT new)
            element.focus();

            // Clear existing content
            element.innerHTML = '';

            // Create a paragraph with the text
            const p = document.createElement('p');
            p.textContent = text;
            element.appendChild(p);

            // Dispatch events to notify the framework
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
            element.dispatchEvent(new Event('change', { bubbles: true }));

            // Move cursor to end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

        } else {
            // For standard textarea elements
            element.focus();
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            )?.set || Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            )?.set;

            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, text);
            } else {
                element.value = text;
            }
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Create the floating enhancement widget
    function createWidget() {
        if (widget && document.body.contains(widget)) return widget;
        if (widget) widget.remove();

        widget = document.createElement('div');
        widget.id = 'promptx-widget';
        widget.innerHTML = `
      <div class="promptx-header">
        <div class="promptx-logo">
          <img src="${chrome.runtime.getURL('logo.jpg')}" alt="PromptX" style="display:block; width:28px; height:28px; border-radius:7px; object-fit:cover;">
          <span>PromptX</span>
        </div>
        <div class="promptx-badge" id="promptx-category">🟢 Ready</div>
        <button class="promptx-close" id="promptx-close" title="Minimize">−</button>
      </div>
      <div class="promptx-body" id="promptx-body">
        <div class="promptx-status" id="promptx-status">
          <span class="promptx-pulse"></span>
          Watching for your prompts... Type anything and I'll suggest improvements ✨
        </div>
        <div class="promptx-enhanced" id="promptx-enhanced" style="display:none;">
          <div class="promptx-label">✨ Enhanced Prompt</div>
          <div class="promptx-char-count" id="promptx-char-count" style="font-size:11px; color:rgba(255,255,255,0.4); margin-bottom:8px;"></div>
          <div class="promptx-enhanced-text" id="promptx-enhanced-text"></div>
          <div class="promptx-actions" style="grid-template-columns:1fr 1fr 1fr;">
            <button class="promptx-btn promptx-btn-primary" id="promptx-use">⚡ Use</button>
            <button class="promptx-btn promptx-btn-secondary" id="promptx-copy">📋 Copy</button>
            <button class="promptx-btn promptx-btn-secondary" id="promptx-undo">↩ Undo</button>
          </div>
          <div class="promptx-tips" id="promptx-tips" style="display:none;">
            <div class="promptx-tips-label">💡 Pro Tips</div>
            <div class="promptx-tips-text" id="promptx-tips-text"></div>
          </div>
        </div>
        <div class="promptx-loading" id="promptx-loading" style="display:none;">
          <div class="promptx-spinner"></div>
          <span>Enhancing your prompt...</span>
        </div>
      </div>
      <div class="promptx-footer">
        <span class="promptx-powered">Powered by PromptX AI</span>
        <button class="promptx-toggle" id="promptx-toggle" title="Toggle auto-enhance">
          <span class="promptx-toggle-dot"></span>
        </button>
      </div>
    `;

        document.body.appendChild(widget);

        // Make draggable
        let isDragging = false;
        let dragOffsetX, dragOffsetY;
        const header = widget.querySelector('.promptx-header');

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.promptx-close')) return;
            isDragging = true;
            const rect = widget.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            widget.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const x = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, e.clientX - dragOffsetX));
            const y = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, e.clientY - dragOffsetY));
            widget.style.left = x + 'px';
            widget.style.top = y + 'px';
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            widget.style.transition = '';
        });

        // Minimized state — restore from storage
        chrome.storage.local.get(['widgetMinimized'], (data) => {
            if (data.widgetMinimized) {
                isMinimized = true;
                const body = document.getElementById('promptx-body');
                if (body) body.style.display = 'none';
                document.getElementById('promptx-close').textContent = '+';
                widget.classList.add('promptx-minimized');
            }
        });

        document.getElementById('promptx-close').addEventListener('click', () => {
            const body = document.getElementById('promptx-body');
            isMinimized = !isMinimized;
            body.style.display = isMinimized ? 'none' : 'block';
            document.getElementById('promptx-close').textContent = isMinimized ? '+' : '−';
            widget.classList.toggle('promptx-minimized', isMinimized);
            chrome.storage.local.set({ widgetMinimized: isMinimized });
        });

        // Use enhanced prompt
        document.getElementById('promptx-use').addEventListener('click', () => {
            if (currentEnhancement) {
                const textarea = getTextarea();
                if (textarea) {
                    setInputText(textarea, currentEnhancement);
                    showStatus('✅ Enhanced prompt applied! Press Enter to send.');
                    lastPrompt = currentEnhancement;
                } else {
                    showStatus('⚠️ Could not find the text input. Try copying instead.');
                }
            }
        });

        // Copy to clipboard
        document.getElementById('promptx-copy').addEventListener('click', () => {
            if (currentEnhancement) {
                navigator.clipboard.writeText(currentEnhancement).then(() => {
                    const copyBtn = document.getElementById('promptx-copy');
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
                });
            }
        });

        // Undo — restore original prompt
        document.getElementById('promptx-undo').addEventListener('click', () => {
            if (lastOriginalPrompt) {
                const textarea = getTextarea();
                if (textarea) {
                    setInputText(textarea, lastOriginalPrompt);
                    showStatus('↩ Original prompt restored.');
                    lastPrompt = lastOriginalPrompt;
                    currentEnhancement = null;
                } else {
                    showStatus('⚠️ Could not find the text input.');
                }
            } else {
                showStatus('⚠️ No original prompt to restore.');
            }
        });

        // Toggle auto-enhance
        const toggleBtn = document.getElementById('promptx-toggle');
        toggleBtn.addEventListener('click', () => {
            isEnabled = !isEnabled;
            widget.classList.toggle('promptx-disabled', !isEnabled);
            toggleBtn.classList.toggle('active', isEnabled);
            chrome.storage.local.set({ enabled: isEnabled });
            showStatus(isEnabled ? '🟢 Auto-enhance enabled' : '🔴 Auto-enhance paused');
            if (!isEnabled) {
                clearTimeout(debounceTimer);
                isEnhancing = false;
            }
        });
        // Set initial toggle visual state
        toggleBtn.classList.toggle('active', isEnabled);

        return widget;
    }

    // Show status message
    function showStatus(text) {
        const statusEl = document.getElementById('promptx-status');
        const enhancedEl = document.getElementById('promptx-enhanced');
        const loadingEl = document.getElementById('promptx-loading');

        if (statusEl) { statusEl.style.display = 'flex'; statusEl.innerHTML = `<span class="promptx-pulse"></span>${text}`; }
        if (enhancedEl) enhancedEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'none';
    }

    // Show loading state
    function showLoading() {
        const statusEl = document.getElementById('promptx-status');
        const enhancedEl = document.getElementById('promptx-enhanced');
        const loadingEl = document.getElementById('promptx-loading');

        if (statusEl) statusEl.style.display = 'none';
        if (enhancedEl) enhancedEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'flex';
    }

    // Show enhanced result
    function showEnhanced(data) {
        const statusEl = document.getElementById('promptx-status');
        const enhancedEl = document.getElementById('promptx-enhanced');
        const loadingEl = document.getElementById('promptx-loading');
        const textEl = document.getElementById('promptx-enhanced-text');
        const categoryEl = document.getElementById('promptx-category');
        const tipsEl = document.getElementById('promptx-tips');
        const tipsTextEl = document.getElementById('promptx-tips-text');

        if (statusEl) statusEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'none';
        if (enhancedEl) enhancedEl.style.display = 'block';
        if (textEl) textEl.textContent = data.enhanced;
        if (categoryEl) {
            const categoryIcons = {
                code: '💻', image: '🎨', writing: '✍️', research: '🔬',
                business: '💼', creative: '💡', general: '⚡'
            };
            categoryEl.textContent = `${categoryIcons[data.category] || '⚡'} ${data.category.charAt(0).toUpperCase() + data.category.slice(1)}`;
        }

        if (data.tips && data.tips.length > 0 && tipsEl && tipsTextEl) {
            tipsEl.style.display = 'block';
            tipsTextEl.innerHTML = data.tips.map(t => `• ${t}`).join('<br>');
        } else if (tipsEl) {
            tipsEl.style.display = 'none';
        }

        currentEnhancement = data.enhanced;

        // Show character count improvement
        const charCountEl = document.getElementById('promptx-char-count');
        if (charCountEl && lastOriginalPrompt) {
            const origLen = lastOriginalPrompt.length;
            const newLen = data.enhanced.length;
            const pct = Math.round(((newLen - origLen) / origLen) * 100);
            const arrow = pct >= 0 ? '↑' : '↓';
            charCountEl.textContent = `${origLen} → ${newLen} chars (${arrow}${Math.abs(pct)}%)`;
            charCountEl.style.display = 'block';
        }

        // Auto-expand if minimized
        const body = document.getElementById('promptx-body');
        if (body && body.style.display === 'none') {
            body.style.display = 'block';
            const closeBtn = document.getElementById('promptx-close');
            if (closeBtn) closeBtn.textContent = '−';
            widget.classList.remove('promptx-minimized');
        }
    }

    // Reset widget to initial state
    function resetWidget() {
        currentEnhancement = null;
        showStatus('Watching for your prompts... Type anything and I\'ll suggest improvements ✨');
        const categoryEl = document.getElementById('promptx-category');
        if (categoryEl) categoryEl.textContent = '🟢 Ready';
    }

    // Handle prompt input with debounce
    function handleInput(event, isPaste = false) {
        if (!isEnabled || isEnhancing) return;

        const element = event?.target || getTextarea();
        if (!element) return;

        const text = getInputText(element);

        // Only trigger if prompt is meaningfully long enough and different from last
        if (!text || text.length < 8 || text === lastPrompt) return;

        // Don't re-enhance something we just injected
        if (text === currentEnhancement) return;

        clearTimeout(debounceTimer);
        const delay = isPaste ? 500 : 1500; // Faster for paste
        debounceTimer = setTimeout(() => {
            lastPrompt = text;
            lastOriginalPrompt = text;
            enhancePrompt(text);
        }, delay);
    }

    // Call the enhancement API via background (NO local preview, straight to AI)
    async function enhancePrompt(prompt) {
        if (isEnhancing || !isEnabled) return;
        isEnhancing = true;

        createWidget();
        showLoading();

        // Safety timeout (12 seconds)
        const safetyTimeout = setTimeout(() => {
            if (isEnhancing) {
                isEnhancing = false;
                console.warn('PromptX: API timed out after 12s');
                showStatus('⚠️ API timeout. Is the proxy server running?');
            }
        }, 12000);

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'ENHANCE_PROMPT',
                data: {
                    prompt,
                    site: getCurrentSite(),
                    category: null  // Let API detect category
                }
            });

            clearTimeout(safetyTimeout);

            if (response && response.success && response.data?.enhanced) {
                showEnhanced(response.data);
                console.log(`✅ PromptX: Received AI-enhanced prompt (${response.data.enhanced.length} chars)`);
            } else {
                const errorMsg = response?.error || 'Enhancement failed';
                console.error('PromptX API Error:', errorMsg);
                showStatus(`⚠️ ${errorMsg}`);
            }
        } catch (error) {
            clearTimeout(safetyTimeout);
            console.error('PromptX Extension Error:', error);
            if (error.message?.includes('context invalidated')) {
                showStatus('🔄 Extension reloaded. Please refresh the page.');
            } else if (error.message?.includes('receiving end does not exist')) {
                showStatus('⚠️ Extension error. Try reloading the extension.');
            } else {
                showStatus('⚠️ Connection failed. Is proxy server running on port 3001?');
            }
        } finally {
            isEnhancing = false;
        }
    }


    // Listen for messages from side panel / popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'INJECT_PROMPT') {
            const textarea = getTextarea();
            if (textarea) {
                setInputText(textarea, message.text);
                lastPrompt = message.text; // Prevent re-enhancing
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'No textarea found' });
            }
        }
        return true;
    });

    // ============================================
    // INITIALIZATION
    // ============================================
    function attachToTextarea(textarea) {
        if (!textarea || attachedElements.has(textarea)) return false;

        attachedElements.add(textarea);

        // Listen for input events (only 'input' — no 'keyup' to avoid double-firing)
        textarea.addEventListener('input', handleInput, { passive: true });

        // Also listen for paste events (faster response)
        textarea.addEventListener('paste', () => {
            setTimeout(() => handleInput({ target: textarea }, true), 200);
        }, { passive: true });

        console.log('✅ PromptX attached to input field');
        return true;
    }

    // Find all possible textarea/input elements for the current site
    function findAllTextareas() {
        const site = getCurrentSite();
        if (!site) return [];
        const selectors = SITE_SELECTORS[site];
        const found = [];
        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!found.includes(el)) found.push(el);
                });
            } catch (e) {
                continue;
            }
        }
        return found;
    }

    function init() {
        const site = getCurrentSite();
        if (!site) return;

        console.log(`🚀 PromptX active on ${site}`);

        // Create widget immediately
        createWidget();

        // Robust MutationObserver — continuously scans for new textareas
        const observer = new MutationObserver(() => {
            const textarea = getTextarea();
            if (textarea) {
                attachToTextarea(textarea);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable']
        });

        // Try to attach immediately
        const textarea = getTextarea();
        if (textarea) {
            attachToTextarea(textarea);
        }

        // Also retry every 2 seconds for 30 seconds (handles slow-loading SPAs)
        let retryCount = 0;
        const retryInterval = setInterval(() => {
            retryCount++;
            const textarea = getTextarea();
            if (textarea) {
                attachToTextarea(textarea);
            }
            if (retryCount > 15) clearInterval(retryInterval);
        }, 2000);
    }

    // Sync toggle state from storage whenever it changes (popup, sidepanel, or widget)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.enabled) {
            isEnabled = changes.enabled.newValue;
            if (widget) {
                widget.classList.toggle('promptx-disabled', !isEnabled);
                const toggleBtn = widget.querySelector('#promptx-toggle');
                if (toggleBtn) toggleBtn.classList.toggle('active', isEnabled);
            }
            if (!isEnabled) {
                clearTimeout(debounceTimer);
                isEnhancing = false;
            }
            console.log(`PromptX: ${isEnabled ? 'Enabled' : 'Disabled'} via storage sync`);
        }
    });

    // Handle visibility change (tab switching, window focus)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👁️ PromptX: Page visible again, rechecking textareas...');
            // Re-scan for textareas when tab becomes visible
            setTimeout(() => {
                const textareas = findAllTextareas();
                textareas.forEach(textarea => {
                    if (!attachedElements.has(textarea) && textarea.offsetParent !== null) {
                        attachToTextarea(textarea);
                    }
                });
            }, 300);
        }
    });

    // Check extension status before initializing
    chrome.storage.local.get(['enabled'], (data) => {
        isEnabled = data.enabled !== false;
        console.log(`⚙️ PromptX enabled: ${isEnabled}`);

        // Multi-stage initialization for maximum reliability
        // Stage 1: Immediate (for static content)
        setTimeout(init, 300);

        // Stage 2: After page load (for dynamic content)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(init, 500);
            });
        }

        // Stage 3: After all resources (for lazy-loaded SPAs)
        window.addEventListener('load', () => {
            setTimeout(init, 1000);
        });
    });

})();
