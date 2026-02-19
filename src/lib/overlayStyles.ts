// PromptX Overlay — Enhancement Style Presets
// Shared config used by both web settings UI and API

export interface OverlayStyle {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    badge?: string;
}

export const OVERLAY_STYLES: OverlayStyle[] = [
    {
        id: 'professional',
        name: 'Professional',
        description: 'Clear, structured, enterprise-grade prompts with precise language and specific requirements.',
        icon: '💼',
        color: 'from-blue-500/20 to-indigo-500/20',
    },
    {
        id: 'maximum_detail',
        name: 'Maximum Detail',
        description: 'Massively expanded prompts with extreme specificity — context, constraints, format, examples, edge cases.',
        icon: '🔬',
        color: 'from-purple-500/20 to-pink-500/20',
        badge: 'Popular',
    },
    {
        id: 'aggressive',
        name: 'Aggressive',
        description: 'Direct, unrestricted, imperative-style prompts with role-playing and chain-of-thought reasoning.',
        icon: '⚡',
        color: 'from-red-500/20 to-orange-500/20',
        badge: 'Power',
    },
    {
        id: 'concise',
        name: 'Concise & Sharp',
        description: 'Maximally short and precise. Under 3 sentences. Every word earns its place.',
        icon: '🎯',
        color: 'from-emerald-500/20 to-teal-500/20',
    },
    {
        id: 'creative',
        name: 'Creative Storyteller',
        description: 'Vivid, evocative language with narrative framing, metaphors, and stylistic direction.',
        icon: '🎨',
        color: 'from-amber-500/20 to-yellow-500/20',
    },
];

export const SUPPORTED_APPS = [
    { name: 'ChatGPT', android: 'com.openai.chatgpt', ios: 'com.openai.chat', icon: '🤖' },
    { name: 'Claude', android: 'com.anthropic.claude', ios: 'com.anthropic.claude', icon: '🟠' },
    { name: 'Gemini', android: 'com.google.android.apps.bard', ios: 'com.google.bard', icon: '💎' },
    { name: 'Grok', android: 'ai.x.grok', ios: 'ai.x.grok', icon: '🧠' },
    { name: 'Perplexity', android: 'ai.perplexity.app.android', ios: 'ai.perplexity.app', icon: '🔍' },
    { name: 'Poe', android: 'com.quora.poe', ios: 'com.quora.poe', icon: '🌊' },
    { name: 'Copilot', android: 'com.microsoft.copilot', ios: 'com.microsoft.copilot', icon: '🪁' },
    { name: 'DeepSeek', android: 'com.deepseek.chat', ios: 'com.deepseek.chat', icon: '🐋' },
];

export interface OverlaySettings {
    enabled: boolean;
    style: string;
    autoSend: boolean;
    privacyMode: boolean;
    debounceMs: number;
    apiEndpoint: string;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
    enabled: true,
    style: 'professional',
    autoSend: false,
    privacyMode: false,
    debounceMs: 3000,
    apiEndpoint: 'https://promptx.io/api/overlay-enhance',
};

const SETTINGS_KEY = 'promptx_overlay_settings';

export function loadOverlaySettings(): OverlaySettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? { ...DEFAULT_OVERLAY_SETTINGS, ...JSON.parse(stored) } : DEFAULT_OVERLAY_SETTINGS;
    } catch {
        return DEFAULT_OVERLAY_SETTINGS;
    }
}

export function saveOverlaySettings(settings: Partial<OverlaySettings>): void {
    try {
        const current = loadOverlaySettings();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
    } catch (e) {
        console.warn('Failed to save overlay settings:', e);
    }
}
