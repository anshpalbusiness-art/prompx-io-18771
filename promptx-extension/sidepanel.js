// PromptX Extension — Side Panel Script

document.addEventListener('DOMContentLoaded', () => {
    // Tab navigation
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.style.display = 'none');

            // Activate clicked
            tab.classList.add('active');
            const targetId = `tab-${tab.dataset.tab}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.style.display = 'block';
                // Trigger animation
                targetContent.style.animation = 'none';
                targetContent.offsetHeight; /* trigger reflow */
                targetContent.style.animation = 'fade-in 0.3s ease-out';
            }
        });
    });

    // Make sure initial state is correct
    contents.forEach(c => {
        if (!c.classList.contains('active')) c.style.display = 'none';
    });

    // Manual enhance
    const manualInput = document.getElementById('manual-prompt');
    const enhanceBtn = document.getElementById('manual-enhance-btn');
    const resultSection = document.getElementById('result-section');
    const resultText = document.getElementById('result-text');
    const resultCategory = document.getElementById('result-category');
    const loadingSection = document.getElementById('loading-section');
    const resultTips = document.getElementById('result-tips');
    const tipsContent = document.getElementById('tips-content');

    enhanceBtn.addEventListener('click', async () => {
        const prompt = manualInput.value.trim();
        if (!prompt || prompt.length < 5) return;

        resultSection.style.display = 'none';
        loadingSection.style.display = 'block'; // Block for centered text

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'ENHANCE_PROMPT',
                data: { prompt, site: 'sidepanel', category: null }
            });

            loadingSection.style.display = 'none';

            if (response && response.success) {
                const data = response.data;
                resultSection.style.display = 'block';
                resultText.textContent = data.enhanced;

                const categoryIcons = {
                    code: '💻', image: '🎨', writing: '✍️', research: '🔬',
                    business: '💼', creative: '💡', general: '⚡'
                };
                resultCategory.textContent = `${categoryIcons[data.category] || '⚡'} ${data.category.charAt(0).toUpperCase() + data.category.slice(1)}`;

                if (data.tips && data.tips.length > 0) {
                    resultTips.style.display = 'block';
                    tipsContent.innerHTML = data.tips.map(t => `• ${t}`).join('<br>');
                } else {
                    resultTips.style.display = 'none';
                }
            } else {
                resultSection.style.display = 'block';
                resultText.textContent = '⚠️ Enhancement failed. Please try again.';
                resultCategory.textContent = '❌ Error';
            }
        } catch (err) {
            loadingSection.style.display = 'none';
            resultSection.style.display = 'block';
            resultText.textContent = '⚠️ Connection error: ' + err.message;
            resultCategory.textContent = '❌ Error';
        }
    });

    // Use in chat — inject into active tab's textarea
    document.getElementById('result-use').addEventListener('click', () => {
        const enhanced = resultText.textContent;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'INJECT_PROMPT',
                    text: enhanced
                });
            }
        });
    });

    // Copy
    document.getElementById('result-copy').addEventListener('click', () => {
        const enhanced = resultText.textContent;
        navigator.clipboard.writeText(enhanced).then(() => {
            const btn = document.getElementById('result-copy');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
        });
    });

    // Load history
    function loadHistory() {
        chrome.storage.local.get(['history'], (data) => {
            const historyList = document.getElementById('history-list');
            const history = data.history || [];

            if (history.length === 0) {
                historyList.innerHTML = '<div style="font-size:12px; color:hsl(var(--muted-foreground)); text-align:center; padding:20px;">No enhancements yet. Start by typing a prompt on any AI site!</div>';
                return;
            }

            historyList.innerHTML = history.map((item, index) => {
                const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const categoryIcons = {
                    code: '💻', image: '🎨', writing: '✍️', research: '🔬',
                    business: '💼', creative: '💡', general: '⚡'
                };
                return `
          <div class="history-item" data-index="${index}">
            <div class="history-meta">
              <span style="font-weight:600; font-size:11px; color:hsl(var(--primary))">${categoryIcons[item.category] || '⚡'} ${item.category}</span>
              <span style="font-size:10px;">${time}</span>
            </div>
            <div class="history-preview" style="margin-bottom:4px; opacity:0.7; font-size:11px;">${item.original}</div>
            <div class="history-preview" style="font-weight:500;">${item.enhanced}</div>
            <div style="margin-top:8px; display:flex; gap:8px;">
                <button class="history-use-btn btn-secondary" style="width:100%; padding:4px; font-size:11px; border-radius:4px; cursor:pointer;">Copy Enhanced</button>
            </div>
          </div>
        `;
            }).join('');

            // Attach handlers
            historyList.querySelectorAll('.history-use-btn').forEach((btn, i) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.closest('.history-item').dataset.index);
                    navigator.clipboard.writeText(history[idx].enhanced).then(() => {
                        btn.textContent = '✅ Copied!';
                        setTimeout(() => { btn.textContent = 'Copy Enhanced'; }, 2000);
                    });
                });
            });
        });
    }

    // Load stats
    function loadStats() {
        chrome.storage.local.get(['enhancementCount', 'history'], (data) => {
            const totalEl = document.getElementById('total-enhanced');
            const topCatEl = document.getElementById('top-category');

            if (totalEl) totalEl.textContent = data.enhancementCount || 0;

            const history = data.history || [];
            if (history.length > 0 && topCatEl) {
                const catCounts = {};
                history.forEach(h => {
                    catCounts[h.category] = (catCounts[h.category] || 0) + 1;
                });
                const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
                topCatEl.textContent = topCat ? topCat[0].charAt(0).toUpperCase() + topCat[0].slice(1) : '—';
            }
        });
    }

    // Settings
    // Auto-enhance
    const autoToggle = document.getElementById('setting-auto');
    if (autoToggle) {
        chrome.storage.local.get(['enabled'], (data) => {
            autoToggle.checked = data.enabled !== false;
        });
        autoToggle.addEventListener('change', () => {
            chrome.storage.local.set({ enabled: autoToggle.checked });
            chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' });
        });
    }

    // Tab switch handlers to refresh data
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.dataset.tab === 'history') loadHistory();
            if (tab.dataset.tab === 'settings') loadStats();
        });
    });

    // Listen for updates from content script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'ENHANCEMENT_RESULT') {
            resultSection.style.display = 'block';
            loadingSection.style.display = 'none';
            resultText.textContent = message.data.enhanced;

            const categoryIcons = {
                code: '💻', image: '🎨', writing: '✍️', research: '🔬',
                business: '💼', creative: '💡', general: '⚡'
            };
            resultCategory.textContent = `${categoryIcons[message.data.category] || '⚡'} ${message.data.category.charAt(0).toUpperCase() + message.data.category.slice(1)}`;

            // Switch to enhance tab
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.style.display = 'none');

            const enhanceTab = document.querySelector('[data-tab="enhance"]');
            if (enhanceTab) enhanceTab.classList.add('active');

            const enhanceContent = document.getElementById('tab-enhance');
            if (enhanceContent) enhanceContent.style.display = 'block';
        }
    });

    // Initial load
    loadHistory();
    loadStats();
});
