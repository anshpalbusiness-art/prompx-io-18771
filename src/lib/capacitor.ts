// PromptX — Capacitor Native Initialization
// Only runs when the app is packaged inside a native mobile shell
import { getPlatform } from './apiClient';

/** Initialize native Capacitor plugins if running on mobile */
export async function initCapacitor(): Promise<void> {
    if (getPlatform() !== 'capacitor') return;

    try {
        // Status bar — dark style to match PromptX theme
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });

        // Splash screen — hide after app loads
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();

        // Keyboard — manage viewport scrolling when keyboard appears
        const { Keyboard } = await import('@capacitor/keyboard');
        Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-open');
        });
        Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open');
        });

        // App — handle back button on Android
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
                window.history.back();
            } else {
                App.minimizeApp();
            }
        });

        // Handle deep links
        App.addListener('appUrlOpen', ({ url }) => {
            const route = url.replace('promptx://', '/');
            if (route && route !== '/') {
                window.location.hash = `#${route}`;
            }
        });

        console.log('📱 Capacitor native plugins initialized');
    } catch (err) {
        console.warn('Capacitor init skipped:', err);
    }
}
