// PromptX Memory Service
// Handles both session memory (localStorage) and long-term memory (Supabase)

import { supabase } from "@/integrations/supabase/client";

// ==================== TYPES ====================

export type MemoryType = 'fact' | 'preference' | 'context' | 'history' | 'tone' | 'style' | 'project' | 'workflow' | 'contact';

export interface MemoryEntry {
    id: string;
    key: string;
    value: string;
    type: MemoryType;
    category?: string;
    confidence?: number;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
}

export interface SessionMemoryState {
    chatContext: ChatContextEntry[];
    recentInputs: string[];
    recentWorkflows: string[];
    uiState: Record<string, unknown>;
    lastActivity: string;
}

export interface ChatContextEntry {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface UserProfile {
    tone: string[];
    style: string[];
    projects: string[];
    favoriteModels: string[];
    favoriteAgents: string[];
    frequentWorkflows: string[];
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
    SESSION_MEMORY: 'promptx_session_memory',
    USER_PROFILE: 'promptx_user_profile',
    CHAT_CONTEXT: 'promptx_chat_context',
    BEHAVIOR_ANALYTICS: 'promptx_behavior',
};

// ==================== SESSION MEMORY CLASS ====================

export class SessionMemory {
    private state: SessionMemoryState;

    constructor() {
        this.state = this.load();
    }

    private load(): SessionMemoryState {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.SESSION_MEMORY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load session memory:', e);
        }
        return this.getDefaultState();
    }

    private getDefaultState(): SessionMemoryState {
        return {
            chatContext: [],
            recentInputs: [],
            recentWorkflows: [],
            uiState: {},
            lastActivity: new Date().toISOString(),
        };
    }

    private save(): void {
        try {
            this.state.lastActivity = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.SESSION_MEMORY, JSON.stringify(this.state));
        } catch (e) {
            console.warn('Failed to save session memory:', e);
        }
    }

    // Chat Context
    addChatMessage(role: 'user' | 'assistant', content: string): void {
        this.state.chatContext.push({
            role,
            content,
            timestamp: new Date().toISOString(),
        });
        // Keep last 50 messages for context
        if (this.state.chatContext.length > 50) {
            this.state.chatContext = this.state.chatContext.slice(-50);
        }
        this.save();
    }

    getChatContext(limit: number = 10): ChatContextEntry[] {
        return this.state.chatContext.slice(-limit);
    }

    clearChatContext(): void {
        this.state.chatContext = [];
        this.save();
    }

    // Recent Inputs
    addRecentInput(input: string): void {
        // Avoid duplicates
        this.state.recentInputs = this.state.recentInputs.filter(i => i !== input);
        this.state.recentInputs.unshift(input);
        // Keep last 20 unique inputs
        if (this.state.recentInputs.length > 20) {
            this.state.recentInputs = this.state.recentInputs.slice(0, 20);
        }
        this.save();
    }

    getRecentInputs(limit: number = 5): string[] {
        return this.state.recentInputs.slice(0, limit);
    }

    // Recent Workflows
    addRecentWorkflow(workflow: string): void {
        this.state.recentWorkflows = this.state.recentWorkflows.filter(w => w !== workflow);
        this.state.recentWorkflows.unshift(workflow);
        if (this.state.recentWorkflows.length > 10) {
            this.state.recentWorkflows = this.state.recentWorkflows.slice(0, 10);
        }
        this.save();
    }

    getRecentWorkflows(): string[] {
        return this.state.recentWorkflows;
    }

    // UI State
    setUIState(key: string, value: unknown): void {
        this.state.uiState[key] = value;
        this.save();
    }

    getUIState<T>(key: string, defaultValue: T): T {
        return (this.state.uiState[key] as T) ?? defaultValue;
    }

    // Full State
    getState(): SessionMemoryState {
        return { ...this.state };
    }

    reset(): void {
        this.state = this.getDefaultState();
        this.save();
    }
}

// ==================== LONG-TERM MEMORY CLASS ====================

export class LongTermMemory {
    private userId: string | null = null;
    private cache: Map<string, MemoryEntry[]> = new Map();

    setUserId(userId: string): void {
        this.userId = userId;
        this.cache.clear();
    }

    async getMemories(type?: MemoryType): Promise<MemoryEntry[]> {
        if (!this.userId) return [];

        const cacheKey = type || 'all';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        try {
            let query = supabase
                .from('user_memory')
                .select('*')
                .eq('user_id', this.userId)
                .order('updated_at', { ascending: false });

            if (type) {
                query = query.eq('memory_type', type);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Failed to fetch memories:', error);
                return [];
            }

            const memories = (data || []).map(row => ({
                id: row.id,
                key: row.memory_key,
                value: row.memory_value,
                type: row.memory_type as MemoryType,
                category: row.category,
                confidence: row.confidence,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                expiresAt: row.expires_at,
            }));

            this.cache.set(cacheKey, memories);
            return memories;
        } catch (e) {
            console.error('Error fetching memories:', e);
            return [];
        }
    }

    async addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry | null> {
        if (!this.userId) return null;

        try {
            const { data, error } = await supabase
                .from('user_memory')
                .insert({
                    user_id: this.userId,
                    memory_key: entry.key,
                    memory_value: entry.value,
                    memory_type: entry.type,
                    category: entry.category,
                    confidence: entry.confidence || 1.0,
                    expires_at: entry.expiresAt,
                })
                .select()
                .single();

            if (error) {
                console.error('Failed to add memory:', error);
                return null;
            }

            this.cache.clear();

            return {
                id: data.id,
                key: data.memory_key,
                value: data.memory_value,
                type: data.memory_type as MemoryType,
                category: data.category,
                confidence: data.confidence,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                expiresAt: data.expires_at,
            };
        } catch (e) {
            console.error('Error adding memory:', e);
            return null;
        }
    }

    async updateMemory(id: string, value: string): Promise<boolean> {
        if (!this.userId) return false;

        try {
            const { error } = await supabase
                .from('user_memory')
                .update({ memory_value: value, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', this.userId);

            if (error) {
                console.error('Failed to update memory:', error);
                return false;
            }

            this.cache.clear();
            return true;
        } catch (e) {
            console.error('Error updating memory:', e);
            return false;
        }
    }

    async deleteMemory(id: string): Promise<boolean> {
        if (!this.userId) return false;

        try {
            const { error } = await supabase
                .from('user_memory')
                .delete()
                .eq('id', id)
                .eq('user_id', this.userId);

            if (error) {
                console.error('Failed to delete memory:', error);
                return false;
            }

            this.cache.clear();
            return true;
        } catch (e) {
            console.error('Error deleting memory:', e);
            return false;
        }
    }

    async getUserProfile(): Promise<UserProfile> {
        const memories = await this.getMemories();

        return {
            tone: memories.filter(m => m.type === 'tone').map(m => m.value),
            style: memories.filter(m => m.type === 'style').map(m => m.value),
            projects: memories.filter(m => m.type === 'project').map(m => m.value),
            favoriteModels: memories.filter(m => m.type === 'preference' && m.category === 'model').map(m => m.value),
            favoriteAgents: memories.filter(m => m.type === 'preference' && m.category === 'agent').map(m => m.value),
            frequentWorkflows: memories.filter(m => m.type === 'workflow').map(m => m.value),
        };
    }

    clearCache(): void {
        this.cache.clear();
    }
}

// ==================== MEMORY LEARNING ====================

export class MemoryLearning {
    private sessionMemory: SessionMemory;
    private longTermMemory: LongTermMemory;

    constructor(sessionMemory: SessionMemory, longTermMemory: LongTermMemory) {
        this.sessionMemory = sessionMemory;
        this.longTermMemory = longTermMemory;
    }

    // Analyze user message to learn tone and style
    analyzeMessage(message: string): { tone: string[]; style: string[] } {
        const tones: string[] = [];
        const styles: string[] = [];

        // Tone detection
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('please') || lowerMessage.includes('thank') || lowerMessage.includes('kindly')) {
            tones.push('polite');
        }
        if (message.includes('!') && message.length < 100) {
            tones.push('enthusiastic');
        }
        if (lowerMessage.includes('asap') || lowerMessage.includes('urgent') || lowerMessage.includes('quickly')) {
            tones.push('urgent');
        }
        if (/^[A-Z][^.!?]*[.!?]$/.test(message)) {
            tones.push('formal');
        }
        if (lowerMessage.includes('lol') || lowerMessage.includes('haha') || lowerMessage.includes(':)')) {
            tones.push('casual');
        }

        // Style detection
        if (message.length > 300) {
            styles.push('detailed');
        } else if (message.length < 50) {
            styles.push('concise');
        }
        if (message.includes('•') || message.includes('-') || message.includes('1.')) {
            styles.push('structured');
        }
        if (message.includes('?')) {
            styles.push('inquisitive');
        }

        return { tone: tones, style: styles };
    }

    // Learn from user interaction
    async learnFromMessage(message: string): Promise<void> {
        const analysis = this.analyzeMessage(message);

        // Store in session memory for immediate use
        this.sessionMemory.addRecentInput(message);

        // Update long-term memory with learned patterns
        for (const tone of analysis.tone) {
            await this.longTermMemory.addMemory({
                key: `learned_tone_${Date.now()}`,
                value: tone,
                type: 'tone',
                confidence: 0.7, // Initial confidence
            });
        }

        for (const style of analysis.style) {
            await this.longTermMemory.addMemory({
                key: `learned_style_${Date.now()}`,
                value: style,
                type: 'style',
                confidence: 0.7,
            });
        }
    }

    // Get memory context for AI prompts
    async getMemoryContext(): Promise<string> {
        const profile = await this.longTermMemory.getUserProfile();
        const recentContext = this.sessionMemory.getChatContext(5);

        let context = '';

        if (profile.tone.length > 0) {
            context += `User prefers ${[...new Set(profile.tone)].join(', ')} tone. `;
        }

        if (profile.style.length > 0) {
            context += `User communication style is ${[...new Set(profile.style)].join(', ')}. `;
        }

        if (profile.projects.length > 0) {
            context += `User is working on: ${profile.projects.slice(0, 3).join(', ')}. `;
        }

        if (recentContext.length > 0) {
            context += `\n\nRecent conversation context:\n`;
            for (const msg of recentContext) {
                context += `${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`;
            }
        }

        return context.trim();
    }
}

// ==================== BEHAVIOR TRACKING ====================

export interface BehaviorData {
    panelUsage: Record<string, number>;
    modelUsage: Record<string, number>;
    agentUsage: Record<string, number>;
    featureUsage: Record<string, number>;
    lastUpdated: string;
}

export class BehaviorTracking {
    private data: BehaviorData;

    constructor() {
        this.data = this.load();
    }

    private load(): BehaviorData {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.BEHAVIOR_ANALYTICS);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load behavior data:', e);
        }
        return this.getDefaultData();
    }

    private getDefaultData(): BehaviorData {
        return {
            panelUsage: {},
            modelUsage: {},
            agentUsage: {},
            featureUsage: {},
            lastUpdated: new Date().toISOString(),
        };
    }

    private save(): void {
        try {
            this.data.lastUpdated = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.BEHAVIOR_ANALYTICS, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save behavior data:', e);
        }
    }

    trackPanelOpen(panelId: string): void {
        this.data.panelUsage[panelId] = (this.data.panelUsage[panelId] || 0) + 1;
        this.save();
    }

    trackModelUsed(modelId: string): void {
        this.data.modelUsage[modelId] = (this.data.modelUsage[modelId] || 0) + 1;
        this.save();
    }

    trackAgentUsed(agentId: string): void {
        this.data.agentUsage[agentId] = (this.data.agentUsage[agentId] || 0) + 1;
        this.save();
    }

    trackFeatureUsed(featureId: string): void {
        this.data.featureUsage[featureId] = (this.data.featureUsage[featureId] || 0) + 1;
        this.save();
    }

    getMostUsedPanels(limit: number = 5): string[] {
        return Object.entries(this.data.panelUsage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([panel]) => panel);
    }

    getMostUsedModels(limit: number = 5): string[] {
        return Object.entries(this.data.modelUsage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([model]) => model);
    }

    getMostUsedAgents(limit: number = 5): string[] {
        return Object.entries(this.data.agentUsage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([agent]) => agent);
    }

    getData(): BehaviorData {
        return { ...this.data };
    }

    reset(): void {
        this.data = this.getDefaultData();
        this.save();
    }
}

// ==================== SINGLETON INSTANCES ====================

let sessionMemoryInstance: SessionMemory | null = null;
let longTermMemoryInstance: LongTermMemory | null = null;
let memoryLearningInstance: MemoryLearning | null = null;
let behaviorTrackingInstance: BehaviorTracking | null = null;

export function getSessionMemory(): SessionMemory {
    if (!sessionMemoryInstance) {
        sessionMemoryInstance = new SessionMemory();
    }
    return sessionMemoryInstance;
}

export function getLongTermMemory(): LongTermMemory {
    if (!longTermMemoryInstance) {
        longTermMemoryInstance = new LongTermMemory();
    }
    return longTermMemoryInstance;
}

export function getMemoryLearning(): MemoryLearning {
    if (!memoryLearningInstance) {
        memoryLearningInstance = new MemoryLearning(getSessionMemory(), getLongTermMemory());
    }
    return memoryLearningInstance;
}

export function getBehaviorTracking(): BehaviorTracking {
    if (!behaviorTrackingInstance) {
        behaviorTrackingInstance = new BehaviorTracking();
    }
    return behaviorTrackingInstance;
}

// Initialize with user ID when available
export function initializeMemory(userId: string): void {
    getLongTermMemory().setUserId(userId);
}
