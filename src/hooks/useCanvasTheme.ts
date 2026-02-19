import { useState, useCallback, useMemo } from 'react';

export type CanvasTheme = 'dark' | 'light';

export interface CanvasThemeColors {
    canvasBg: string;
    canvasGradient: string;
    gridDot: string;
    nodeBg: string;
    nodeBorder: string;
    nodeText: string;
    nodeSubtext: string;
    edgeStroke: string;
    edgeLabel: string;
    panelBg: string;
    panelBorder: string;
    titleBg: string;
    hoverBg: string;
}

const DARK_COLORS: CanvasThemeColors = {
    canvasBg: '#09090b',
    canvasGradient: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 60%)',
    gridDot: 'rgba(63,63,70,0.35)',
    nodeBg: 'rgba(24,24,27,0.85)',
    nodeBorder: 'rgba(63,63,70,0.4)',
    nodeText: '#e4e4e7',
    nodeSubtext: '#a1a1aa',
    edgeStroke: 'rgba(113,113,122,0.4)',
    edgeLabel: 'rgba(161,161,170,0.7)',
    panelBg: 'rgba(24,24,27,0.85)',
    panelBorder: 'rgba(63,63,70,0.5)',
    titleBg: 'rgba(24,24,27,0.8)',
    hoverBg: 'rgba(63,63,70,0.3)',
};

const LIGHT_COLORS: CanvasThemeColors = {
    canvasBg: '#fafafa',
    canvasGradient: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)',
    gridDot: 'rgba(161,161,170,0.4)',
    nodeBg: 'rgba(255,255,255,0.95)',
    nodeBorder: 'rgba(212,212,216,0.6)',
    nodeText: '#18181b',
    nodeSubtext: '#52525b',
    edgeStroke: 'rgba(161,161,170,0.5)',
    edgeLabel: 'rgba(82,82,91,0.7)',
    panelBg: 'rgba(255,255,255,0.9)',
    panelBorder: 'rgba(228,228,231,0.8)',
    titleBg: 'rgba(255,255,255,0.85)',
    hoverBg: 'rgba(244,244,245,0.6)',
};

const STORAGE_KEY = 'workflow-canvas-theme';

export function useCanvasTheme() {
    const [theme, setTheme] = useState<CanvasTheme>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return (saved === 'light' || saved === 'dark') ? saved : 'dark';
        } catch {
            return 'dark';
        }
    });

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem(STORAGE_KEY, next); } catch { }
            return next;
        });
    }, []);

    const themeColors = useMemo<CanvasThemeColors>(
        () => theme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
        [theme]
    );

    return { theme, toggleTheme, themeColors };
}
