// PromptX — Smart API Client
// Detects the platform (Electron, Capacitor, Web) and routes API calls accordingly.

type Platform = 'electron' | 'capacitor' | 'web';

declare global {
    interface Window {
        electronAPI?: {
            isElectron: boolean;
            platform: string;
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            show: () => void;
            notify: (title: string, body: string) => void;
            getVersion: () => Promise<string>;
            getPlatform: () => Promise<string>;
        };
        Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string };
    }
}

/** Detect which platform the app is running on */
export function getPlatform(): Platform {
    if (window.electronAPI?.isElectron) return 'electron';
    if (window.Capacitor?.isNativePlatform()) return 'capacitor';
    return 'web';
}

/** Check if running as a native app (Electron or Capacitor) */
export function isNativeApp(): boolean {
    return getPlatform() !== 'web';
}

/**
 * Get the base URL for API requests.
 * - Electron: always localhost (embedded proxy)
 * - Capacitor (mobile): use deployed API URL or Supabase
 * - Web (browser): use relative URL if same-origin, else proxy
 */
export function getApiBaseUrl(): string {
    const platform = getPlatform();

    if (platform === 'electron') {
        // Electron has the proxy embedded in the main process
        return 'http://127.0.0.1:3001';
    }

    if (platform === 'capacitor') {
        // Mobile apps: use the deployed API endpoint
        // Falls back to localhost for local development
        return import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
    }

    // Web: use the Vite dev server proxy (same port) or deployed URL
    return import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
}

/** Make an API request with automatic base URL routing */
export async function apiRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const base = getApiBaseUrl();
    const url = `${base}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || `API request failed: ${response.status}`);
    }

    // For binary responses (like TTS audio)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('audio/')) {
        return response.blob() as unknown as T;
    }

    return response.json();
}

/** Send native notification (works on Electron and Web) */
export function sendNotification(title: string, body: string): void {
    const platform = getPlatform();

    if (platform === 'electron') {
        window.electronAPI?.notify(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    } else if ('Notification' in window) {
        Notification.requestPermission().then((perm) => {
            if (perm === 'granted') new Notification(title, { body });
        });
    }
}

/** Get display platform name */
export function getPlatformDisplayName(): string {
    const platform = getPlatform();
    if (platform === 'electron') {
        const os = window.electronAPI?.platform;
        if (os === 'darwin') return 'macOS';
        if (os === 'win32') return 'Windows';
        if (os === 'linux') return 'Linux';
        return 'Desktop';
    }
    if (platform === 'capacitor') {
        const cap = window.Capacitor?.getPlatform();
        if (cap === 'android') return 'Android';
        if (cap === 'ios') return 'iOS';
        return 'Mobile';
    }
    return 'Web';
}
