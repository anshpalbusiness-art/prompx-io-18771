import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types ──────────────────────────────────────────── */
export interface Peer {
    userId: string;
    email: string;
    color: string;
    cursor: { x: number; y: number } | null;
    selectedNodeId: string | null;
    onlineAt: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/* 8 distinct colours for up to 8 simultaneous collaborators */
const COLORS = [
    '#a78bfa', '#f472b6', '#34d399', '#fbbf24',
    '#60a5fa', '#fb923c', '#e879f9', '#2dd4bf',
];

function pickColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

/* ─── Constants ──────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const HEARTBEAT_INTERVAL = 5000;   // Send heartbeat every 5s
const POLL_INTERVAL = 5000;        // Poll for peers every 5s

/* ─── Hook ───────────────────────────────────────────── */
/**
 * Collaboration presence via server-side endpoints.
 * The server uses a service role key to bypass Supabase RLS,
 * allowing cross-user presence visibility.
 */
export function useCollaborativeWorkflow(activeWorkflowId: string | null) {
    const [peers, setPeers] = useState<Peer[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const selfIdRef = useRef<string | null>(null);
    const selfEmailRef = useRef<string>('Guest');
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const presenceIdRef = useRef<string | null>(null);

    /* ── Heartbeat: write presence via server (bypasses RLS) ── */
    const sendHeartbeat = useCallback(async () => {
        if (!selfIdRef.current) return;

        try {
            const response = await fetch(`${API_BASE}/api/presence/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selfIdRef.current,
                    email: selfEmailRef.current,
                    color: pickColor(selfIdRef.current),
                    activeWorkflowId,
                    presenceId: presenceIdRef.current,
                }),
            });

            const result = await response.json();

            if (result.presenceId) {
                presenceIdRef.current = result.presenceId;
            } else if (presenceIdRef.current && !result.presenceId) {
                // Server signaled to re-insert (update failed)
                presenceIdRef.current = null;
            }

            if (result.error) {
                console.error('[Collab] Heartbeat error:', result.error);
            }
        } catch (err) {
            console.warn('[Collab] Heartbeat failed:', err);
        }
    }, [activeWorkflowId]);

    /* ── Poll: read ALL users' presence via server (bypasses RLS) ── */
    const pollPeers = useCallback(async () => {
        if (!selfIdRef.current) return;

        try {
            const response = await fetch(
                `${API_BASE}/api/presence/peers?excludeUserId=${encodeURIComponent(selfIdRef.current)}`,
            );

            const result = await response.json();

            if (result.peers) {
                setPeers(result.peers);
                console.log(`[Collab] Poll: ${result.peers.length} peer(s), ${result.total} total active`);
            } else if (result.error) {
                console.error('[Collab] Poll error:', result.error);
            }
        } catch (err) {
            console.warn('[Collab] Poll failed:', err);
        }
    }, []);

    /* ── Start polling ── */
    const startPolling = useCallback(async () => {
        console.log('[Collab] Starting presence polling via server...');
        setConnectionStatus('connected');

        // Initial heartbeat + poll
        await sendHeartbeat();
        await pollPeers();

        // Set up intervals
        heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        pollTimerRef.current = setInterval(pollPeers, POLL_INTERVAL);
    }, [sendHeartbeat, pollPeers]);

    /* ── Cleanup presence on unmount ── */
    const cleanupPresence = useCallback(async () => {
        try {
            await fetch(`${API_BASE}/api/presence/cleanup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    presenceId: presenceIdRef.current,
                    userId: selfIdRef.current,
                }),
            });
        } catch {
            // Best effort cleanup
        }
        presenceIdRef.current = null;
    }, []);

    /* ── Main effect ── */
    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (cancelled) return;

                const userId = user?.id ?? 'anon-' + Math.random().toString(36).slice(2, 6);
                const email = user?.email ?? 'Guest';
                selfIdRef.current = userId;
                selfEmailRef.current = email;

                console.log('[Collab] Initializing for user:', email, '(', userId, ')');

                // Go straight to server-side polling (reliable, bypasses RLS)
                startPolling();
            } catch (err) {
                console.error('[Collab] Failed to initialise:', err);
                if (!cancelled) {
                    setConnectionStatus('error');
                }
            }
        }

        init();

        return () => {
            cancelled = true;

            // Cleanup polling
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);

            // Clean up presence row
            cleanupPresence();

            setConnectionStatus('disconnected');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Broadcast cursor position (no-op in polling mode) ── */
    const broadcastCursor = useCallback(
        (_cursor: { x: number; y: number } | null, _selectedNodeId: string | null) => {
            // Cursor sharing requires WebSocket — not supported in polling mode
        },
        [],
    );

    return { peers, broadcastCursor, connectionStatus };
}
