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
const HEARTBEAT_INTERVAL = 5000;   // Send heartbeat every 5s
const POLL_INTERVAL = 5000;        // Poll for peers every 5s
const PRESENCE_TTL = 15000;        // Consider offline after 15s of no heartbeat
const MAX_REALTIME_RETRIES = 2;    // Try Realtime 2 times before falling back

/* ─── Hook ───────────────────────────────────────────── */
/**
 * Uses Supabase Realtime for collaboration when available.
 * Falls back to REST-based polling via the `user_activity` table
 * when Realtime WebSocket is unavailable (e.g. Lovable Cloud projects).
 */
export function useCollaborativeWorkflow(activeWorkflowId: string | null) {
    const [peers, setPeers] = useState<Peer[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const selfIdRef = useRef<string | null>(null);
    const selfEmailRef = useRef<string>('Guest');
    const retryCountRef = useRef(0);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const presenceIdRef = useRef<string | null>(null);
    const usingPollingRef = useRef(false);

    /* ── REST Polling Presence ── */

    /** Send a heartbeat to the user_activity table */
    const sendHeartbeat = useCallback(async () => {
        if (!selfIdRef.current) return;

        const presenceData = {
            email: selfEmailRef.current,
            color: pickColor(selfIdRef.current),
            cursor: null,
            selectedNodeId: activeWorkflowId,
            onlineAt: new Date().toISOString(),
            page: 'workflow',
        };

        try {
            if (presenceIdRef.current) {
                // Update existing heartbeat row
                await supabase
                    .from('user_activity')
                    .update({
                        created_at: new Date().toISOString(),
                        metadata: presenceData as any,
                    })
                    .eq('id', presenceIdRef.current);
            } else {
                // Insert initial heartbeat row
                const { data } = await supabase
                    .from('user_activity')
                    .insert({
                        user_id: selfIdRef.current,
                        activity_type: 'workflow_presence',
                        metadata: presenceData as any,
                    })
                    .select('id')
                    .single();

                if (data) {
                    presenceIdRef.current = data.id;
                }
            }
        } catch (err) {
            console.warn('[Collab/Polling] Heartbeat failed:', err);
        }
    }, [activeWorkflowId]);

    /** Poll for other users' presence */
    const pollPeers = useCallback(async () => {
        if (!selfIdRef.current) return;

        try {
            const cutoff = new Date(Date.now() - PRESENCE_TTL).toISOString();

            const { data, error } = await supabase
                .from('user_activity')
                .select('user_id, metadata, created_at')
                .eq('activity_type', 'workflow_presence')
                .gte('created_at', cutoff);

            if (error) {
                console.warn('[Collab/Polling] Poll failed:', error.message);
                return;
            }

            if (data) {
                const peerList: Peer[] = [];
                for (const row of data) {
                    // Skip self
                    if (row.user_id === selfIdRef.current) continue;

                    const meta = row.metadata as any;
                    if (meta && meta.page === 'workflow') {
                        peerList.push({
                            userId: row.user_id,
                            email: meta.email || 'User',
                            color: meta.color || pickColor(row.user_id),
                            cursor: meta.cursor || null,
                            selectedNodeId: meta.selectedNodeId || null,
                            onlineAt: meta.onlineAt || row.created_at,
                        });
                    }
                }
                setPeers(peerList);
            }
        } catch (err) {
            console.warn('[Collab/Polling] Poll error:', err);
        }
    }, []);

    /** Start REST polling mode */
    const startPolling = useCallback(async () => {
        usingPollingRef.current = true;
        console.log('[Collab] Falling back to REST polling mode');
        setConnectionStatus('connected');

        // Initial heartbeat + poll
        await sendHeartbeat();
        await pollPeers();

        // Set up intervals
        heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        pollTimerRef.current = setInterval(pollPeers, POLL_INTERVAL);
    }, [sendHeartbeat, pollPeers]);

    /** Clean up presence row on unmount */
    const cleanupPresence = useCallback(async () => {
        if (presenceIdRef.current) {
            try {
                await supabase
                    .from('user_activity')
                    .delete()
                    .eq('id', presenceIdRef.current);
            } catch {
                // Best effort cleanup
            }
            presenceIdRef.current = null;
        }
    }, []);

    /* ── Realtime Presence (primary) ── */

    const tryRealtime = useCallback(async (userId: string, email: string) => {
        const channelName = 'workflow_collab:page';
        const channel = supabase.channel(channelName, {
            config: {
                presence: { key: userId },
            },
        });

        /* ── Presence sync ── */
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<{
                    userId: string;
                    email: string;
                    color: string;
                    cursor: { x: number; y: number } | null;
                    selectedNodeId: string | null;
                    onlineAt: string;
                }>();

                const peerList: Peer[] = [];
                for (const key of Object.keys(state)) {
                    const presences = state[key];
                    if (presences && presences.length > 0) {
                        const p = presences[0];
                        if (p.userId === selfIdRef.current) continue;
                        peerList.push({
                            userId: p.userId,
                            email: p.email,
                            color: p.color,
                            cursor: p.cursor,
                            selectedNodeId: p.selectedNodeId,
                            onlineAt: p.onlineAt,
                        });
                    }
                }
                setPeers(peerList);
            })
            .on('broadcast', { event: 'cursor' }, ({ payload }) => {
                if (!payload || payload.userId === selfIdRef.current) return;
                setPeers(prev =>
                    prev.map(p =>
                        p.userId === payload.userId
                            ? { ...p, cursor: payload.cursor, selectedNodeId: payload.selectedNodeId }
                            : p,
                    ),
                );
            });

        setConnectionStatus('connecting');

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                retryCountRef.current = 0;
                setConnectionStatus('connected');
                await channel.track({
                    userId,
                    email,
                    color: pickColor(userId),
                    cursor: null,
                    selectedNodeId: activeWorkflowId,
                    onlineAt: new Date().toISOString(),
                });
                console.log('[Collab] Connected via Realtime as', email);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                retryCountRef.current++;
                console.warn(`[Collab] Realtime ${status} (attempt ${retryCountRef.current}/${MAX_REALTIME_RETRIES})`);

                channel.unsubscribe();
                channelRef.current = null;

                if (retryCountRef.current >= MAX_REALTIME_RETRIES) {
                    // WebSocket is broken — fall back to REST polling
                    console.log('[Collab] Realtime unavailable, switching to REST polling...');
                    startPolling();
                } else {
                    // Retry Realtime after a short delay
                    setConnectionStatus('connecting');
                    setTimeout(() => tryRealtime(userId, email), 3000);
                }
            } else if (status === 'CLOSED') {
                setConnectionStatus('disconnected');
            }
        });

        channelRef.current = channel;
    }, [activeWorkflowId, startPolling]);

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

                // Try Realtime first
                tryRealtime(userId, email);
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

            // Cleanup Realtime
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }

            // Cleanup polling
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);

            // Clean up presence row
            cleanupPresence();

            setConnectionStatus('disconnected');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Broadcast cursor position ── */
    const broadcastCursor = useCallback(
        (cursor: { x: number; y: number } | null, selectedNodeId: string | null) => {
            if (usingPollingRef.current) {
                // In polling mode, cursor sharing isn't supported (too expensive)
                return;
            }
            if (!channelRef.current) return;
            channelRef.current.send({
                type: 'broadcast',
                event: 'cursor',
                payload: {
                    userId: selfIdRef.current,
                    cursor,
                    selectedNodeId,
                },
            });
        },
        [],
    );

    return { peers, broadcastCursor, connectionStatus };
}
