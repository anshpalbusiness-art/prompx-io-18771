// PromptX — Token Counter Utility
// Lightweight token estimator (no external dependencies)
// Uses word-based heuristic: ~1.3 tokens per word (accurate within 10% for English text)

/** Model context window limits (in tokens) */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
    'grok-3': 131072,           // 128K
    'grok-3-mini': 131072,      // 128K
    'grok-3-mini-fast': 131072, // 128K
    'grok-beta': 131072,        // 128K
    'gpt-4': 128000,            // 128K
    'gpt-4o': 128000,           // 128K
    'gpt-4-turbo': 128000,      // 128K
    'gpt-3.5-turbo': 16385,     // 16K
    'claude-3-opus': 200000,    // 200K
    'claude-3-sonnet': 200000,  // 200K
    'claude-3-haiku': 200000,   // 200K
    'gemini-pro': 1000000,      // 1M
    'mistral-large': 128000,    // 128K
    'llama-3': 128000,          // 128K
    'deepseek-v3': 128000,      // 128K
};

/** Default context limit for unknown models */
const DEFAULT_CONTEXT_LIMIT = 131072; // 128K

/** Tokens per word ratio (empirically, English text averages ~1.3 tokens/word for GPT-style tokenizers) */
const TOKENS_PER_WORD = 1.33;

/** Overhead tokens per message (role label, formatting, separators) */
const MESSAGE_OVERHEAD = 4;

/**
 * Estimate the number of tokens in a text string
 * Uses word-based heuristic — no external tokenizer needed
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;

    // Count words (split on whitespace)
    const words = text.trim().split(/\s+/).filter(Boolean);

    // Base token count from words
    let tokenCount = Math.ceil(words.length * TOKENS_PER_WORD);

    // Add extra tokens for special characters, punctuation, code blocks
    const codeBlockCount = (text.match(/```/g) || []).length / 2;
    tokenCount += codeBlockCount * 3;

    // URLs count as more tokens (they get split by the tokenizer)
    const urlCount = (text.match(/https?:\/\/\S+/g) || []).length;
    tokenCount += urlCount * 5;

    // Numbers and special tokens
    const numberCount = (text.match(/\d+/g) || []).length;
    tokenCount += Math.ceil(numberCount * 0.3);

    return Math.max(1, tokenCount);
}

/**
 * Estimate total tokens for an array of messages
 * Includes per-message overhead (role labels, formatting)
 */
export function estimateMessagesTokens(
    messages: Array<{ role: string; content: string }>
): number {
    let total = 0;

    for (const msg of messages) {
        total += estimateTokens(msg.content) + MESSAGE_OVERHEAD;
    }

    // Base overhead for the request (3 tokens for priming)
    total += 3;

    return total;
}

/**
 * Get the context limit for a given model
 */
export function getModelContextLimit(modelId: string): number {
    return MODEL_CONTEXT_LIMITS[modelId] || DEFAULT_CONTEXT_LIMIT;
}

/**
 * Format token count for display (e.g., "3.2K")
 */
export function formatTokenCount(tokens: number): string {
    if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`;
    }
    return `${tokens}`;
}

/**
 * Get the context usage percentage
 */
export function getContextUsagePercent(tokens: number, modelId: string): number {
    const limit = getModelContextLimit(modelId);
    return Math.min(100, (tokens / limit) * 100);
}

/**
 * Get the context usage status color
 */
export function getContextStatusColor(percent: number): 'green' | 'yellow' | 'red' {
    if (percent >= 85) return 'red';
    if (percent >= 70) return 'yellow';
    return 'green';
}
