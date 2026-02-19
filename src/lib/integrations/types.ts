// ═══════════════════════ Integration System — Types ═══════════════════════

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type ExecutionMode = 'ai' | 'integration' | 'hybrid';

/** Configuration stored per integration (credentials, settings) */
export interface IntegrationConfig {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    baseUrl?: string;
    settings?: Record<string, any>;
    connectedAt?: number;
}

/** Result from an integration adapter execution */
export interface IntegrationResult {
    success: boolean;
    data: Record<string, any>;
    source: string;       // e.g., "duckduckgo", "filesystem", "shell"
    rawResponse?: any;     // Original API response for debugging
    error?: string;
}

/** Plugin interface — every integration implements this */
export interface IntegrationAdapter {
    id: string;                          // e.g., "web-search", "file-system"
    name: string;                        // e.g., "Web Search", "File System"
    icon: string;                        // Emoji icon
    description: string;
    category: 'search' | 'scraping' | 'filesystem' | 'shell' | 'communication' | 'social' | 'commerce' | 'crm' | 'calendar' | 'notification' | 'database' | 'custom';
    requiresAuth: boolean;               // true = needs OAuth/API key
    status: IntegrationStatus;

    /** Check if this integration is available and configured */
    isConnected(): boolean;

    /** Execute the integration with the given input */
    execute(input: Record<string, any>): Promise<IntegrationResult>;

    /** Keywords the AI planner uses to match agents to this integration */
    matchKeywords: string[];
}

/** Summary for UI display */
export interface IntegrationInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: string;
    status: IntegrationStatus;
    requiresAuth: boolean;
}
