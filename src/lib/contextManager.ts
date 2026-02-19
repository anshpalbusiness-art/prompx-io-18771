// PromptX — Context Window Manager
// Intelligently manages the conversation context sent to the API
// Summarizes old messages when approaching token limits

import {
    estimateTokens,
    estimateMessagesTokens,
    getModelContextLimit,
} from './tokenCounter';

interface ChatMessage {
    role: string;
    content: string;
}

interface ContextWindowResult {
    /** Messages to send to the API (optimized) */
    messages: ChatMessage[];
    /** Total token count of the prepared messages */
    tokenCount: number;
    /** Whether old messages were truncated/summarized */
    wasTruncated: boolean;
    /** Summary of old messages (if truncated) */
    summary?: string;
    /** Number of messages that were summarized */
    summarizedCount: number;
    /** Number of messages kept verbatim */
    keptCount: number;
}

// ─── Configuration ───────────────────────────────────────────────────────

/** Use at most 80% of the model's context window (leave room for response) */
const MAX_CONTEXT_RATIO = 0.80;

/** Always keep the most recent N messages verbatim (never summarize these) */
const RECENT_MESSAGES_TO_KEEP = 10;

/** Maximum tokens for the summary of old messages */
const SUMMARY_MAX_TOKENS = 600;

/** Minimum messages before we even consider summarizing */
const MIN_MESSAGES_FOR_SUMMARY = 12;

// ─── Summary Cache ───────────────────────────────────────────────────────

const summaryCache = new Map<string, string>();

function getSummaryCacheKey(messages: ChatMessage[]): string {
    // Hash based on first and last message + count
    const first = messages[0]?.content?.slice(0, 50) || '';
    const last = messages[messages.length - 1]?.content?.slice(0, 50) || '';
    return `${messages.length}:${first}:${last}`;
}

// ─── Core Function ───────────────────────────────────────────────────────

/**
 * Prepare the context window for an API call.
 * If the conversation fits within the model's limit → sends everything.
 * If it's too long → summarizes old messages and keeps recent ones verbatim.
 */
export async function prepareContextWindow(
    systemPrompt: ChatMessage,
    allMessages: ChatMessage[],
    modelId: string = 'grok-3'
): Promise<ContextWindowResult> {
    const contextLimit = getModelContextLimit(modelId);
    const maxTokens = Math.floor(contextLimit * MAX_CONTEXT_RATIO);

    const systemTokens = estimateTokens(systemPrompt.content) + 4;
    const allMessagesTokens = estimateMessagesTokens(allMessages);
    const totalTokens = systemTokens + allMessagesTokens;

    // Case 1: Everything fits — no truncation needed
    if (totalTokens <= maxTokens || allMessages.length < MIN_MESSAGES_FOR_SUMMARY) {
        return {
            messages: [systemPrompt, ...allMessages],
            tokenCount: totalTokens,
            wasTruncated: false,
            summarizedCount: 0,
            keptCount: allMessages.length,
        };
    }

    // Case 2: Need to truncate — summarize old messages
    const recentCount = Math.min(RECENT_MESSAGES_TO_KEEP, allMessages.length);
    const recentMessages = allMessages.slice(-recentCount);
    const oldMessages = allMessages.slice(0, -recentCount);

    // Check if we have a cached summary for these old messages
    const cacheKey = getSummaryCacheKey(oldMessages);
    let summary = summaryCache.get(cacheKey);

    if (!summary) {
        // Generate summary of old messages
        summary = generateLocalSummary(oldMessages);
        summaryCache.set(cacheKey, summary);

        // Keep cache small (max 20 entries)
        if (summaryCache.size > 20) {
            const firstKey = summaryCache.keys().next().value;
            if (firstKey) summaryCache.delete(firstKey);
        }
    }

    // Build the context with summary + recent messages
    const summaryMessage: ChatMessage = {
        role: 'system',
        content: `CONVERSATION SUMMARY (earlier messages condensed):\n${summary}\n\nThe following are the most recent messages in this conversation:`,
    };

    const preparedMessages = [systemPrompt, summaryMessage, ...recentMessages];
    const preparedTokens = estimateMessagesTokens(preparedMessages);

    // If still over limit, progressively drop more old recent messages
    if (preparedTokens > maxTokens) {
        const trimmedRecent = trimMessagesToFit(
            [systemPrompt, summaryMessage],
            recentMessages,
            maxTokens
        );
        const finalMessages = [systemPrompt, summaryMessage, ...trimmedRecent];
        return {
            messages: finalMessages,
            tokenCount: estimateMessagesTokens(finalMessages),
            wasTruncated: true,
            summary,
            summarizedCount: oldMessages.length + (recentMessages.length - trimmedRecent.length),
            keptCount: trimmedRecent.length,
        };
    }

    return {
        messages: preparedMessages,
        tokenCount: preparedTokens,
        wasTruncated: true,
        summary,
        summarizedCount: oldMessages.length,
        keptCount: recentMessages.length,
    };
}

// ─── Local Summary Generator ─────────────────────────────────────────────

/**
 * Generate a summary of messages locally (without an API call).
 * Extracts key topics, decisions, and action items from the conversation.
 */
function generateLocalSummary(messages: ChatMessage[]): string {
    const topics: string[] = [];
    const keyPoints: string[] = [];
    let userGoal = '';

    for (const msg of messages) {
        const content = msg.content.trim();
        if (!content) continue;

        if (msg.role === 'user') {
            // Extract the user's first substantive message as their goal
            if (!userGoal && content.length > 20) {
                userGoal = content.length > 200 ? content.slice(0, 200) + '...' : content;
            }

            // Extract topics from user messages
            const topic = extractTopic(content);
            if (topic && !topics.includes(topic)) {
                topics.push(topic);
            }
        }

        if (msg.role === 'assistant') {
            // Extract key conclusions/answers from assistant
            const keyPoint = extractKeyPoint(content);
            if (keyPoint) {
                keyPoints.push(keyPoint);
            }
        }
    }

    // Build summary
    const parts: string[] = [];

    if (userGoal) {
        parts.push(`User's initial request: "${userGoal}"`);
    }

    if (topics.length > 0) {
        parts.push(`Topics discussed: ${topics.slice(0, 8).join(', ')}`);
    }

    if (keyPoints.length > 0) {
        parts.push(`Key points covered:\n${keyPoints.slice(0, 6).map(p => `- ${p}`).join('\n')}`);
    }

    parts.push(`Total messages summarized: ${messages.length}`);

    const summary = parts.join('\n\n');

    // Ensure summary doesn't exceed our token budget
    const summaryTokens = estimateTokens(summary);
    if (summaryTokens > SUMMARY_MAX_TOKENS) {
        // Truncate to fit
        const words = summary.split(/\s+/);
        const maxWords = Math.floor(SUMMARY_MAX_TOKENS / 1.33);
        return words.slice(0, maxWords).join(' ') + '...';
    }

    return summary;
}

/**
 * Extract a short topic description from a user message
 */
function extractTopic(content: string): string {
    // Take the first sentence or first 80 chars
    const firstSentence = content.match(/^[^.!?]+[.!?]/);
    if (firstSentence && firstSentence[0].length <= 100) {
        return firstSentence[0].trim();
    }

    // Just take the first line, truncated
    const firstLine = content.split('\n')[0];
    if (firstLine.length <= 80) return firstLine.trim();
    return firstLine.slice(0, 80).trim() + '...';
}

/**
 * Extract a key point from an assistant message
 */
function extractKeyPoint(content: string): string {
    // Take the first meaningful sentence
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    if (sentences.length === 0) return '';

    const first = sentences[0].trim();
    return first.length > 120 ? first.slice(0, 120) + '...' : first;
}

// ─── Helper Functions ────────────────────────────────────────────────────

/**
 * Progressively trim recent messages to fit within the token budget
 */
function trimMessagesToFit(
    prefix: ChatMessage[],
    recent: ChatMessage[],
    maxTokens: number
): ChatMessage[] {
    const prefixTokens = estimateMessagesTokens(prefix);
    let availableTokens = maxTokens - prefixTokens;

    // Start from the most recent and work backwards
    const result: ChatMessage[] = [];
    for (let i = recent.length - 1; i >= 0; i--) {
        const msgTokens = estimateTokens(recent[i].content) + 4;
        if (availableTokens - msgTokens >= 0) {
            result.unshift(recent[i]);
            availableTokens -= msgTokens;
        } else {
            break;
        }
    }

    return result;
}

/**
 * Get context window stats for the UI indicator
 */
export function getContextStats(
    systemPrompt: ChatMessage,
    messages: ChatMessage[],
    modelId: string = 'grok-3'
) {
    const contextLimit = getModelContextLimit(modelId);
    const systemTokens = estimateTokens(systemPrompt.content) + 4;
    const messagesTokens = estimateMessagesTokens(messages);
    const totalTokens = systemTokens + messagesTokens;
    const usagePercent = Math.min(100, (totalTokens / contextLimit) * 100);

    return {
        totalTokens,
        contextLimit,
        usagePercent,
        messageCount: messages.length,
        isNearLimit: usagePercent >= 70,
        isOverLimit: totalTokens > contextLimit * MAX_CONTEXT_RATIO,
    };
}
