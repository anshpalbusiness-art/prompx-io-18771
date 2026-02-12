/**
 * Storage service — AsyncStorage wrapper for enhancement history and settings.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EnhancementResult } from './enhancer';

const HISTORY_KEY = '@promptx_history';
const SETTINGS_KEY = '@promptx_settings';
const MAX_HISTORY = 50;

export interface Settings {
    autoEnhance: boolean;
    apiKey: string;
    clipboardMonitor: boolean;
    hapticFeedback: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    autoEnhance: true,
    apiKey: '',
    clipboardMonitor: true,
    hapticFeedback: true,
};

// --- History ---

export async function getHistory(): Promise<EnhancementResult[]> {
    try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function addToHistory(item: EnhancementResult): Promise<void> {
    try {
        const history = await getHistory();
        history.unshift(item);
        if (history.length > MAX_HISTORY) {
            history.length = MAX_HISTORY;
        }
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.warn('Failed to save history:', error);
    }
}

export async function clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(HISTORY_KEY);
}

// --- Settings ---

export async function getSettings(): Promise<Settings> {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function updateSettings(
    partial: Partial<Settings>,
): Promise<Settings> {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
}
