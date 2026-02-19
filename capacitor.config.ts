import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.promptx.app',
    appName: 'PromptX',
    webDir: 'dist',
    server: {
        // Uncomment for dev mode (run `npm run dev` first)
        // url: 'http://YOUR_LOCAL_IP:8080',
        // cleartext: true,
        androidScheme: 'https',
    },
    plugins: {
        SplashScreen: {
            launchAutoHide: true,
            launchShowDuration: 2000,
            backgroundColor: '#000000',
            showSpinner: false,
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#000000',
        },
    },
    android: {
        allowMixedContent: true,
        backgroundColor: '#000000',
    },
    ios: {
        backgroundColor: '#000000',
        contentInset: 'always',
    },
};

export default config;
