import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type ChatMessage, type TerminalLine, type CLIBuildPlan, type CLILanguage, type FileEntry, uid } from '@/lib/cliGenerator';

// ─── TYPES ───

export interface SessionData {
    id: string;
    title: string;
    date: string; // "Today", "Yesterday", etc. (for display)
    preview: string;

    // Persistable State
    language: CLILanguage;
    messages: ChatMessage[];
    terminalLines: TerminalLine[];
    plan: CLIBuildPlan | null;
    projectPath: string | null;
    buildPhase: 'idle' | 'gathering' | 'building' | 'done';
    conversationHistory: { role: string; content: string }[];
    fileTree: FileEntry[];
    timestamp: number; // For sorting
}

interface CLIGeneratorContextType {
    // Current Session State
    activeSessionId: string | null;
    activeSession: SessionData | null;

    // Actions
    createSession: (initialPrompt?: string) => string;
    switchSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    updateActiveSession: (updates: Partial<SessionData> | ((prev: SessionData) => Partial<SessionData>)) => void;

    // Lists
    sessions: Record<string, SessionData>;
    recentChats: SessionData[]; // Sorted list for sidebar
}

const CLIGeneratorContext = createContext<CLIGeneratorContextType | undefined>(undefined);

// ─── HELPER: Format Date ───
const formatDateLabel = (ts: number): string => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
};

// ─── PROVIDER ───

export function CLIGeneratorProvider({ children }: { children: ReactNode }) {
    // Load from localStorage or use empty default
    const [sessions, setSessions] = useState<Record<string, SessionData>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cli_generator_sessions');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (typeof parsed !== 'object' || parsed === null) return {};

                    // Sanitize: ensure valid structure
                    const cleanSessions: Record<string, SessionData> = {};
                    Object.entries(parsed).forEach(([key, val]: [string, any]) => {
                        if (val && typeof val === 'object' && val.id) {
                            // Fix potential corrupted arrays
                            val.messages = Array.isArray(val.messages)
                                ? val.messages.filter((m: any) => m && typeof m.content === 'string')
                                : [];
                            val.terminalLines = Array.isArray(val.terminalLines) ? val.terminalLines : [];
                            cleanSessions[key] = val as SessionData;
                        }
                    });
                    return cleanSessions;
                } catch (e) {
                    console.error("Failed to parse sessions", e);
                    // Start fresh if corrupted
                    return {};
                }
            }
        }
        return {};
    });

    const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('cli_generator_active_id') || null;
        }
        return null;
    });

    // Persist to localStorage whenever state changes
    useEffect(() => {
        try {
            // Exclude attachments (base64 images) to prevent quota issues
            const serialized = JSON.stringify(sessions, (key, value) => {
                if (key === 'attachments') return undefined;
                return value;
            });
            localStorage.setItem('cli_generator_sessions', serialized);
        } catch (e) {
            console.error("Failed to save sessions to localStorage", e);
        }
    }, [sessions]);

    useEffect(() => {
        if (activeSessionId) {
            localStorage.setItem('cli_generator_active_id', activeSessionId);
        } else {
            localStorage.removeItem('cli_generator_active_id');
        }
    }, [activeSessionId]);

    // ─── ACTIONS ───

    const createSession = (initialPrompt?: string) => {
        const id = uid();
        const timestamp = Date.now();
        const newSession: SessionData = {
            id,
            title: initialPrompt ? initialPrompt.slice(0, 30) + '...' : 'New Session',
            date: 'Today',
            preview: initialPrompt || 'Start a new conversation',
            language: 'nodejs',
            messages: initialPrompt ? [{ id: uid(), role: 'user', content: initialPrompt, timestamp }] : [],
            terminalLines: [],
            plan: null,
            projectPath: null,
            buildPhase: 'idle',
            conversationHistory: initialPrompt ? [{ role: 'user', content: initialPrompt }] : [],
            fileTree: [],
            timestamp
        };

        setSessions(prev => ({ ...prev, [id]: newSession }));
        setActiveSessionId(id);
        return id;
    };

    const switchSession = (sessionId: string) => {
        if (sessions[sessionId]) {
            setActiveSessionId(sessionId);
        }
    };

    const deleteSession = (sessionId: string) => {
        setSessions(prev => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
        }
    };

    const updateActiveSession = (updates: Partial<SessionData> | ((prev: SessionData) => Partial<SessionData>)) => {
        if (!activeSessionId) return;

        setSessions(prev => {
            const current = prev[activeSessionId];
            if (!current) return prev;

            let resolvedUpdates: Partial<SessionData> = {};
            if (typeof updates === 'function') {
                try {
                    resolvedUpdates = updates(current);
                } catch (e) {
                    console.error("Error resolving session updates", e);
                    return prev;
                }
            } else {
                resolvedUpdates = updates;
            }

            // Defend against corrupted property updates (e.g. function instead of value)
            if (resolvedUpdates.messages && typeof resolvedUpdates.messages === 'function') {
                console.warn("Attempted functional update on messages property - ignoring to prevent corruption");
                delete resolvedUpdates.messages;
            }
            if (resolvedUpdates.terminalLines && typeof resolvedUpdates.terminalLines === 'function') {
                console.warn("Attempted functional update on terminalLines property - ignoring to prevent corruption");
                delete resolvedUpdates.terminalLines;
            }

            // Auto-update title/preview if messages change and it's still generic
            let newTitle = current.title;
            let newPreview = current.preview;

            if (resolvedUpdates.messages && Array.isArray(resolvedUpdates.messages) && resolvedUpdates.messages.length > 0) {
                const msgs = resolvedUpdates.messages as ChatMessage[];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && typeof lastMsg.content === 'string') {
                    newPreview = lastMsg.content.slice(0, 50) + '...';
                }

                const firstMsg = msgs[0];
                if (current.title === 'New Session' && firstMsg && firstMsg.role === 'user' && typeof firstMsg.content === 'string') {
                    newTitle = firstMsg.content.slice(0, 30);
                }
            }

            return {
                ...prev,
                [activeSessionId]: {
                    ...current,
                    ...resolvedUpdates,
                    title: resolvedUpdates.title || newTitle,
                    preview: resolvedUpdates.preview || newPreview,
                    timestamp: Date.now(), // Bump timestamp on update
                    date: formatDateLabel(Date.now())
                }
            };
        });
    };

    // Sorted list for sidebar
    const recentChats = Object.values(sessions).sort((a, b) => b.timestamp - a.timestamp);

    // Initial load: if no sessions, maybe load mock data? Or just start empty.
    // Let's load mock data ONLY if absolutely empty to help user see UI.
    useEffect(() => {
        // Only if absolutely no sessions existed (first run ever)
        if (Object.keys(sessions).length === 0 && !localStorage.getItem('cli_generator_sessions')) {
            // Optional: seeding with MOCK_DATA if desired, but user wants persistence fixing.
            // Let's start clean to avoid confusion, or create ONE default empty session.
            // Actually, the issue "reseted" implies they want THEIR work saved.
            // So we start empty/clean.
        }
    }, []);


    return (
        <CLIGeneratorContext.Provider value={{
            activeSessionId,
            activeSession: activeSessionId ? sessions[activeSessionId] : null,
            createSession,
            switchSession,
            deleteSession,
            updateActiveSession,
            sessions,
            recentChats
        }}>
            {children}
        </CLIGeneratorContext.Provider>
    );
}

export const useCLIGenerator = () => {
    const context = useContext(CLIGeneratorContext);
    if (context === undefined) {
        throw new Error('useCLIGenerator must be used within a CLIGeneratorProvider');
    }
    return context;
};
