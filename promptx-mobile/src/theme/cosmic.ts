/**
 * PromptX Cosmic Dark Theme — matching the web app + Chrome Extension aesthetic.
 */
export const Colors = {
    // Core backgrounds
    bg: {
        primary: '#050816',
        secondary: '#0a0e27',
        tertiary: '#0d1440',
        card: 'rgba(15, 20, 60, 0.6)',
        overlay: 'rgba(5, 8, 22, 0.92)',
        input: 'rgba(15, 20, 60, 0.4)',
    },

    // Text
    text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.75)',
        muted: 'rgba(255, 255, 255, 0.45)',
        accent: '#818CF8',
    },

    // Accents
    accent: {
        primary: '#818CF8',    // Indigo
        secondary: '#6366F1',
        success: '#34D399',    // Emerald
        warning: '#FBBF24',    // Amber
        error: '#F87171',      // Red
        info: '#60A5FA',       // Blue
    },

    // Borders
    border: {
        subtle: 'rgba(255, 255, 255, 0.08)',
        default: 'rgba(255, 255, 255, 0.12)',
        accent: 'rgba(129, 140, 248, 0.3)',
    },

    // Gradients (as arrays for LinearGradient)
    gradient: {
        cosmic: ['#050816', '#0d1440', '#050816'],
        card: ['rgba(15, 20, 60, 0.6)', 'rgba(10, 14, 39, 0.8)'],
        accent: ['#818CF8', '#6366F1', '#4F46E5'],
        success: ['#34D399', '#10B981'],
    },

    // Categories
    category: {
        coding: '#818CF8',
        writing: '#34D399',
        image: '#F472B6',
        business: '#FBBF24',
        general: '#60A5FA',
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 40,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
};
