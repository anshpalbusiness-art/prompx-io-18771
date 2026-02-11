// PromptX Extension — Popup Script

document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggle-switch');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    const statCount = document.getElementById('stat-count');
    const siteName = document.getElementById('site-name');
    const siteIndicator = document.getElementById('site-indicator');
    const openPanelBtn = document.getElementById('open-panel-btn');
    const historyBtn = document.getElementById('history-btn');

    // Load current state
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response) {
            updateUI(response.enabled, response.count);
        }
    });

    // Detect current site
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const url = new URL(tabs[0].url);
            const supportedSites = {
                'chatgpt.com': '🤖 ChatGPT',
                'chat.openai.com': '🤖 ChatGPT',
                'claude.ai': '🧠 Claude',
                'gemini.google.com': '✨ Gemini',
                'grok.com': '⚡ Grok',
                'x.com': '⚡ Grok',
                'perplexity.ai': '🔍 Perplexity',
                'chat.deepseek.com': '🐋 DeepSeek',
                'chat.mistral.ai': '🌬️ Mistral',
                'copilot.microsoft.com': '💠 Copilot'
            };

            let detected = null;
            for (const [domain, name] of Object.entries(supportedSites)) {
                if (url.hostname.includes(domain)) {
                    detected = name;
                    break;
                }
            }

            if (detected) {
                siteName.textContent = detected;
                siteIndicator.classList.add('active');
            } else {
                siteName.textContent = '🚫 Not an AI page';
            }
        }
    });

    // Toggle switch — write directly to storage (content script syncs via onChanged)
    toggleSwitch.addEventListener('change', () => {
        const newState = toggleSwitch.checked;
        chrome.storage.local.set({ enabled: newState });
        updateUI(newState);
    });

    // Open side panel
    openPanelBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.sidePanel.open({ tabId: tabs[0].id });
                window.close();
            }
        });
    });

    // View history (opens side panel to history tab)
    historyBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Open panel first
                chrome.sidePanel.open({ tabId: tabs[0].id });
                // Note: We can't easily switch tabs from here without more messaging,
                // but the user can click the history tab once open.
                window.close();
            }
        });
    });

    function updateUI(enabled, count) {
        if (typeof enabled !== 'undefined') {
            toggleSwitch.checked = enabled;
            if (enabled) {
                statusBadge.classList.add('active');
                statusText.textContent = 'Active';
            } else {
                statusBadge.classList.remove('active');
                statusText.textContent = 'Paused';
            }
        }
        if (typeof count !== 'undefined') {
            statCount.textContent = count;
        }
    }
});
