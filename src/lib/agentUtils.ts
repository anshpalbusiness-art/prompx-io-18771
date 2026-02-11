// Agent Execution and Metrics Tracking Utilities

const STORAGE_KEYS = {
    AGENT_METRICS: 'promptx_agent_metrics',
    AGENT_MEMORY: 'promptx_agent_memory',
    PURCHASED_AGENTS: 'promptx_purchased_agents',
    AGENT_TOOLS: 'promptx_agent_tools',
};

// Types
export interface AgentMetrics {
    agentId: string;
    executions: number;
    totalTokens: number;
    totalResponseTime: number; // in ms
    lastExecuted: string;
    qualityScores: number[]; // Array of ratings 1-5
}

export interface AgentMemoryEntry {
    id: string;
    key: string;
    value: string;
    type: 'fact' | 'preference' | 'context' | 'history';
    agentId: string;
    createdAt: string;
    updatedAt: string;
}

export interface AgentToolConfig {
    toolId: string;
    enabled: boolean;
    config?: Record<string, string>;
}

// ============ METRICS ============

export const getAgentMetrics = (agentId: string): AgentMetrics | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AGENT_METRICS);
        const allMetrics: Record<string, AgentMetrics> = stored ? JSON.parse(stored) : {};
        return allMetrics[agentId] || null;
    } catch {
        return null;
    }
};

export const getAllAgentMetrics = (): Record<string, AgentMetrics> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AGENT_METRICS);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

export const recordAgentExecution = (
    agentId: string,
    responseTimeMs: number,
    tokensUsed: number
): void => {
    try {
        const allMetrics = getAllAgentMetrics();
        const existing = allMetrics[agentId] || {
            agentId,
            executions: 0,
            totalTokens: 0,
            totalResponseTime: 0,
            lastExecuted: '',
            qualityScores: [],
        };

        const updated: AgentMetrics = {
            ...existing,
            executions: existing.executions + 1,
            totalTokens: existing.totalTokens + tokensUsed,
            totalResponseTime: existing.totalResponseTime + responseTimeMs,
            lastExecuted: new Date().toISOString(),
        };

        allMetrics[agentId] = updated;
        localStorage.setItem(STORAGE_KEYS.AGENT_METRICS, JSON.stringify(allMetrics));
    } catch (error) {
        console.error('Error recording agent execution:', error);
    }
};

export const recordAgentQuality = (agentId: string, score: number): void => {
    try {
        const allMetrics = getAllAgentMetrics();
        const existing = allMetrics[agentId];
        if (existing) {
            existing.qualityScores.push(Math.max(1, Math.min(5, score)));
            // Keep only last 100 scores
            if (existing.qualityScores.length > 100) {
                existing.qualityScores = existing.qualityScores.slice(-100);
            }
            localStorage.setItem(STORAGE_KEYS.AGENT_METRICS, JSON.stringify(allMetrics));
        }
    } catch (error) {
        console.error('Error recording quality score:', error);
    }
};

export const getAverageQuality = (agentId: string): number => {
    const metrics = getAgentMetrics(agentId);
    if (!metrics || metrics.qualityScores.length === 0) return 0;
    const sum = metrics.qualityScores.reduce((a, b) => a + b, 0);
    return (sum / metrics.qualityScores.length) * 20; // Convert to percentage
};

export const getAverageResponseTime = (agentId: string): number => {
    const metrics = getAgentMetrics(agentId);
    if (!metrics || metrics.executions === 0) return 0;
    return metrics.totalResponseTime / metrics.executions;
};

// ============ MEMORY ============

export const getAgentMemory = (agentId: string): AgentMemoryEntry[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AGENT_MEMORY);
        const allMemory: Record<string, AgentMemoryEntry[]> = stored ? JSON.parse(stored) : {};
        return allMemory[agentId] || [];
    } catch {
        return [];
    }
};

export const getAllMemory = (): Record<string, AgentMemoryEntry[]> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AGENT_MEMORY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

export const addAgentMemory = (entry: Omit<AgentMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): AgentMemoryEntry => {
    const allMemory = getAllMemory();
    const agentMemory = allMemory[entry.agentId] || [];

    const newEntry: AgentMemoryEntry = {
        ...entry,
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    agentMemory.unshift(newEntry);
    allMemory[entry.agentId] = agentMemory;
    localStorage.setItem(STORAGE_KEYS.AGENT_MEMORY, JSON.stringify(allMemory));

    return newEntry;
};

export const updateAgentMemory = (agentId: string, entryId: string, value: string): void => {
    const allMemory = getAllMemory();
    const agentMemory = allMemory[agentId] || [];

    const index = agentMemory.findIndex(m => m.id === entryId);
    if (index !== -1) {
        agentMemory[index] = {
            ...agentMemory[index],
            value,
            updatedAt: new Date().toISOString(),
        };
        allMemory[agentId] = agentMemory;
        localStorage.setItem(STORAGE_KEYS.AGENT_MEMORY, JSON.stringify(allMemory));
    }
};

export const deleteAgentMemory = (agentId: string, entryId: string): void => {
    const allMemory = getAllMemory();
    const agentMemory = allMemory[agentId] || [];
    allMemory[agentId] = agentMemory.filter(m => m.id !== entryId);
    localStorage.setItem(STORAGE_KEYS.AGENT_MEMORY, JSON.stringify(allMemory));
};

export const getMemoryAsContext = (agentId: string): string => {
    const memories = getAgentMemory(agentId);
    if (memories.length === 0) return '';

    const grouped = {
        fact: memories.filter(m => m.type === 'fact'),
        preference: memories.filter(m => m.type === 'preference'),
        context: memories.filter(m => m.type === 'context'),
        history: memories.filter(m => m.type === 'history'),
    };

    let context = '\n\n--- AGENT MEMORY ---\n';

    if (grouped.fact.length > 0) {
        context += '\nFacts:\n' + grouped.fact.map(m => `- ${m.key}: ${m.value}`).join('\n');
    }
    if (grouped.preference.length > 0) {
        context += '\n\nUser Preferences:\n' + grouped.preference.map(m => `- ${m.key}: ${m.value}`).join('\n');
    }
    if (grouped.context.length > 0) {
        context += '\n\nContext:\n' + grouped.context.map(m => `- ${m.key}: ${m.value}`).join('\n');
    }
    if (grouped.history.length > 0) {
        context += '\n\nRecent History:\n' + grouped.history.slice(0, 5).map(m => `- ${m.value}`).join('\n');
    }

    context += '\n--- END MEMORY ---\n';
    return context;
};

// ============ PURCHASED AGENTS ============

export const getPurchasedAgentIds = (): Set<string> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PURCHASED_AGENTS);
        return new Set(stored ? JSON.parse(stored) : []);
    } catch {
        return new Set();
    }
};

export const markAgentAsPurchased = (agentId: string): void => {
    const purchased = getPurchasedAgentIds();
    purchased.add(agentId);
    localStorage.setItem(STORAGE_KEYS.PURCHASED_AGENTS, JSON.stringify([...purchased]));
};

export const isAgentPurchased = (agentId: string): boolean => {
    return getPurchasedAgentIds().has(agentId);
};

// ============ TOOLS ============

export const getAgentTools = (agentId: string): AgentToolConfig[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AGENT_TOOLS);
        const allTools: Record<string, AgentToolConfig[]> = stored ? JSON.parse(stored) : {};
        return allTools[agentId] || getDefaultTools();
    } catch {
        return getDefaultTools();
    }
};

export const getDefaultTools = (): AgentToolConfig[] => [
    { toolId: 'web-search', enabled: true },
    { toolId: 'calculator', enabled: true },
    { toolId: 'file-read', enabled: true },
    { toolId: 'code-interpreter', enabled: false },
    { toolId: 'file-write', enabled: false },
    { toolId: 'database-query', enabled: false },
];

export const setAgentTools = (agentId: string, tools: AgentToolConfig[]): void => {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.AGENT_TOOLS);
        const allTools: Record<string, AgentToolConfig[]> = stored ? JSON.parse(stored) : {};
        allTools[agentId] = tools;
        localStorage.setItem(STORAGE_KEYS.AGENT_TOOLS, JSON.stringify(allTools));
    } catch (error) {
        console.error('Error saving agent tools:', error);
    }
};

export const getToolsAsContext = (agentId: string): string => {
    const tools = getAgentTools(agentId);
    const enabled = tools.filter(t => t.enabled);

    if (enabled.length === 0) return '';

    const toolDescriptions: Record<string, string> = {
        'web-search': 'Web Search: You can search the internet for current information.',
        'calculator': 'Calculator: You can perform mathematical calculations.',
        'file-read': 'File Reader: You can read and analyze uploaded documents.',
        'code-interpreter': 'Code Interpreter: You can execute Python code.',
        'file-write': 'File Writer: You can generate downloadable files.',
        'database-query': 'Database Query: You can query connected databases.',
    };

    let context = '\n\n--- AVAILABLE TOOLS ---\n';
    context += enabled.map(t => toolDescriptions[t.toolId] || t.toolId).join('\n');
    context += '\n--- END TOOLS ---\n';

    return context;
};

// ============ AGENT EXECUTION ============

export interface AgentExecutionResult {
    success: boolean;
    response?: string;
    error?: string;
    tokensUsed: number;
    responseTimeMs: number;
}

export const executeAgent = async (
    agentId: string,
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = []
): Promise<AgentExecutionResult> => {
    const startTime = Date.now();

    try {
        // Get memory and tools context
        const memoryContext = getMemoryAsContext(agentId);
        const toolsContext = getToolsAsContext(agentId);

        // Build enhanced system prompt
        const enhancedSystemPrompt = systemPrompt + memoryContext + toolsContext;

        // Prepare messages
        const messages = [
            { role: 'system', content: enhancedSystemPrompt },
            ...conversationHistory,
            { role: 'user', content: userMessage }
        ];

        // Call API
        const response = await fetch('http://localhost:3001/api/chat-completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model: 'grok-3',
                stream: false
            })
        });

        const responseTimeMs = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || '';
        const tokensUsed = data.usage?.total_tokens || estimateTokens(enhancedSystemPrompt + userMessage + assistantMessage);

        // Record metrics
        recordAgentExecution(agentId, responseTimeMs, tokensUsed);

        return {
            success: true,
            response: assistantMessage,
            tokensUsed,
            responseTimeMs
        };

    } catch (error) {
        const responseTimeMs = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tokensUsed: 0,
            responseTimeMs
        };
    }
};

// Simple token estimation (4 chars ≈ 1 token)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// ============ ORCHESTRATION ============

export interface OrchestrationStep {
    agentId: string;
    agentName: string;
    systemPrompt: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input?: string;
    output?: string;
    error?: string;
}

export const runOrchestration = async (
    steps: OrchestrationStep[],
    initialInput: string,
    onStepUpdate: (stepIndex: number, step: OrchestrationStep) => void
): Promise<{ success: boolean; finalOutput: string; error?: string }> => {
    let currentInput = initialInput;

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Update to running
        onStepUpdate(i, { ...step, status: 'running', input: currentInput });

        // Execute agent
        const result = await executeAgent(
            step.agentId,
            step.systemPrompt,
            currentInput
        );

        if (!result.success) {
            onStepUpdate(i, { ...step, status: 'failed', error: result.error });
            return { success: false, finalOutput: '', error: result.error };
        }

        // Update to completed
        onStepUpdate(i, { ...step, status: 'completed', output: result.response });

        // Use output as next input
        currentInput = result.response || '';
    }

    return { success: true, finalOutput: currentInput };
};
