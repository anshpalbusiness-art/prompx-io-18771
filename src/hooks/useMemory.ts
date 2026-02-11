// React hooks for PromptX Memory System
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    SessionMemory,
    LongTermMemory,
    MemoryLearning,
    BehaviorTracking,
    getSessionMemory,
    getLongTermMemory,
    getMemoryLearning,
    getBehaviorTracking,
    initializeMemory,
    MemoryEntry,
    ChatContextEntry,
    UserProfile,
    BehaviorData,
} from '@/lib/memoryService';

// ==================== useSessionMemory ====================

export function useSessionMemory() {
    const sessionMemory = useMemo(() => getSessionMemory(), []);
    const [chatContext, setChatContext] = useState<ChatContextEntry[]>([]);
    const [recentInputs, setRecentInputs] = useState<string[]>([]);

    useEffect(() => {
        setChatContext(sessionMemory.getChatContext(10));
        setRecentInputs(sessionMemory.getRecentInputs(5));
    }, [sessionMemory]);

    const addChatMessage = useCallback((role: 'user' | 'assistant', content: string) => {
        sessionMemory.addChatMessage(role, content);
        setChatContext(sessionMemory.getChatContext(10));
    }, [sessionMemory]);

    const addRecentInput = useCallback((input: string) => {
        sessionMemory.addRecentInput(input);
        setRecentInputs(sessionMemory.getRecentInputs(5));
    }, [sessionMemory]);

    const clearChatContext = useCallback(() => {
        sessionMemory.clearChatContext();
        setChatContext([]);
    }, [sessionMemory]);

    const getUIState = useCallback(<T,>(key: string, defaultValue: T): T => {
        return sessionMemory.getUIState(key, defaultValue);
    }, [sessionMemory]);

    const setUIState = useCallback((key: string, value: unknown) => {
        sessionMemory.setUIState(key, value);
    }, [sessionMemory]);

    return {
        chatContext,
        recentInputs,
        addChatMessage,
        addRecentInput,
        clearChatContext,
        getUIState,
        setUIState,
    };
}

// ==================== useLongTermMemory ====================

export function useLongTermMemory() {
    const longTermMemory = useMemo(() => getLongTermMemory(), []);
    const [memories, setMemories] = useState<MemoryEntry[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Initialize with user ID
    useEffect(() => {
        const initUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                setUserId(session.user.id);
                initializeMemory(session.user.id);
            }
        };
        initUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            if (session?.user?.id) {
                setUserId(session.user.id);
                initializeMemory(session.user.id);
            } else {
                setUserId(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const refreshMemories = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await longTermMemory.getMemories();
            setMemories(data);
            const profile = await longTermMemory.getUserProfile();
            setUserProfile(profile);
        } catch (e) {
            console.error('Failed to refresh memories:', e);
        } finally {
            setLoading(false);
        }
    }, [longTermMemory, userId]);

    useEffect(() => {
        if (userId) {
            refreshMemories();
        }
    }, [userId, refreshMemories]);

    const addMemory = useCallback(async (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
        const result = await longTermMemory.addMemory(entry);
        if (result) {
            await refreshMemories();
        }
        return result;
    }, [longTermMemory, refreshMemories]);

    const updateMemory = useCallback(async (id: string, value: string) => {
        const success = await longTermMemory.updateMemory(id, value);
        if (success) {
            await refreshMemories();
        }
        return success;
    }, [longTermMemory, refreshMemories]);

    const deleteMemory = useCallback(async (id: string) => {
        const success = await longTermMemory.deleteMemory(id);
        if (success) {
            await refreshMemories();
        }
        return success;
    }, [longTermMemory, refreshMemories]);

    return {
        memories,
        userProfile,
        loading,
        userId,
        addMemory,
        updateMemory,
        deleteMemory,
        refreshMemories,
    };
}

// ==================== useMemoryContext ====================

export function useMemoryContext() {
    const memoryLearning = useMemo(() => getMemoryLearning(), []);
    const [contextString, setContextString] = useState<string>('');

    const refreshContext = useCallback(async () => {
        const context = await memoryLearning.getMemoryContext();
        setContextString(context);
        return context;
    }, [memoryLearning]);

    const learnFromMessage = useCallback(async (message: string) => {
        await memoryLearning.learnFromMessage(message);
        await refreshContext();
    }, [memoryLearning, refreshContext]);

    const analyzeMessage = useCallback((message: string) => {
        return memoryLearning.analyzeMessage(message);
    }, [memoryLearning]);

    useEffect(() => {
        refreshContext();
    }, [refreshContext]);

    return {
        contextString,
        refreshContext,
        learnFromMessage,
        analyzeMessage,
    };
}

// ==================== useBehaviorTracking ====================

export function useBehaviorTracking() {
    const behaviorTracking = useMemo(() => getBehaviorTracking(), []);
    const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);

    useEffect(() => {
        setBehaviorData(behaviorTracking.getData());
    }, [behaviorTracking]);

    const trackPanelOpen = useCallback((panelId: string) => {
        behaviorTracking.trackPanelOpen(panelId);
        setBehaviorData(behaviorTracking.getData());
    }, [behaviorTracking]);

    const trackModelUsed = useCallback((modelId: string) => {
        behaviorTracking.trackModelUsed(modelId);
        setBehaviorData(behaviorTracking.getData());
    }, [behaviorTracking]);

    const trackAgentUsed = useCallback((agentId: string) => {
        behaviorTracking.trackAgentUsed(agentId);
        setBehaviorData(behaviorTracking.getData());
    }, [behaviorTracking]);

    const trackFeatureUsed = useCallback((featureId: string) => {
        behaviorTracking.trackFeatureUsed(featureId);
        setBehaviorData(behaviorTracking.getData());
    }, [behaviorTracking]);

    const getMostUsedPanels = useCallback((limit?: number) => {
        return behaviorTracking.getMostUsedPanels(limit);
    }, [behaviorTracking]);

    const getMostUsedModels = useCallback((limit?: number) => {
        return behaviorTracking.getMostUsedModels(limit);
    }, [behaviorTracking]);

    const getMostUsedAgents = useCallback((limit?: number) => {
        return behaviorTracking.getMostUsedAgents(limit);
    }, [behaviorTracking]);

    return {
        behaviorData,
        trackPanelOpen,
        trackModelUsed,
        trackAgentUsed,
        trackFeatureUsed,
        getMostUsedPanels,
        getMostUsedModels,
        getMostUsedAgents,
    };
}

// ==================== Combined useMemory ====================

export function useMemory() {
    const sessionMemory = useSessionMemory();
    const longTermMemory = useLongTermMemory();
    const memoryContext = useMemoryContext();
    const behaviorTracking = useBehaviorTracking();

    return {
        session: sessionMemory,
        longTerm: longTermMemory,
        context: memoryContext,
        behavior: behaviorTracking,
    };
}
