// PromptX — Context Intelligence
// Makes the AI remember what the user talked about in current AND previous chats.
// Pulls relevant context from chat history and injects it into the system prompt.

import { chatStorage, ChatSession, ChatMessage } from './chatStorage';

// ─── Types ───────────────────────────────────────────────────────────────

interface ConversationDigest {
    id: string;
    title: string;
    summary: string;
    topics: string[];
    lastUpdated: Date;
}

interface ContextIntelligenceResult {
    /** Context block to inject into the system prompt */
    contextBlock: string;
    /** Number of previous sessions referenced */
    sessionsReferenced: number;
    /** Key topics identified across all chats */
    topics: string[];
}

// ─── Storage Key ─────────────────────────────────────────────────────────

const DIGEST_CACHE_KEY = 'promptx_context_digests';
const TOPICS_KEY = 'promptx_global_topics';

// ─── Digest Cache ────────────────────────────────────────────────────────

function loadDigestCache(): Record<string, ConversationDigest> {
    try {
        const stored = localStorage.getItem(DIGEST_CACHE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function saveDigestCache(cache: Record<string, ConversationDigest>): void {
    try {
        localStorage.setItem(DIGEST_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to save digest cache:', e);
    }
}

// ─── Topic Extraction ────────────────────────────────────────────────────

/** Extract key topics/subjects from a message */
function extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lower = content.toLowerCase();

    // Programming & tech topics
    const techPatterns: [RegExp, string][] = [
        [/\b(react|vue|angular|svelte|next\.?js|nuxt)\b/i, 'frontend development'],
        [/\b(python|javascript|typescript|java|rust|go|c\+\+|ruby)\b/i, 'programming'],
        [/\b(ai|artificial intelligence|machine learning|ml|deep learning|neural|llm|gpt)\b/i, 'AI/ML'],
        [/\b(api|rest|graphql|endpoint|backend|server)\b/i, 'backend/API'],
        [/\b(database|sql|postgres|mongo|supabase|firebase)\b/i, 'databases'],
        [/\b(deploy|hosting|aws|vercel|netlify|docker|kubernetes)\b/i, 'deployment'],
        [/\b(css|tailwind|styling|design|ui|ux)\b/i, 'design/UI'],
        [/\b(mobile|android|ios|capacitor|react native|flutter)\b/i, 'mobile development'],
        [/\b(electron|desktop|native app)\b/i, 'desktop development'],
        [/\b(prompt|prompting|prompt engineer)\b/i, 'prompt engineering'],
    ];

    for (const [pattern, topic] of techPatterns) {
        if (pattern.test(lower) && !topics.includes(topic)) {
            topics.push(topic);
        }
    }

    // Business topics
    const bizPatterns: [RegExp, string][] = [
        [/\b(marketing|brand|advertising|campaign|social media)\b/i, 'marketing'],
        [/\b(business|startup|company|enterprise|strategy)\b/i, 'business'],
        [/\b(writing|content|blog|article|copy|seo)\b/i, 'content writing'],
        [/\b(email|newsletter|outreach)\b/i, 'email/outreach'],
        [/\b(data|analytics|metrics|dashboard)\b/i, 'data analytics'],
        [/\b(education|learning|course|tutorial|teach)\b/i, 'education'],
    ];

    for (const [pattern, topic] of bizPatterns) {
        if (pattern.test(lower) && !topics.includes(topic)) {
            topics.push(topic);
        }
    }

    return topics;
}

// ─── Conversation Digest Builder ─────────────────────────────────────────

/** Build a compact digest of a chat session */
function buildDigest(session: ChatSession): ConversationDigest {
    const userMessages = session.messages.filter(m => m.role === 'user');
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');

    // Collect all topics from user messages
    const allTopics: string[] = [];
    for (const msg of userMessages) {
        allTopics.push(...extractTopics(msg.content));
    }
    const uniqueTopics = [...new Set(allTopics)];

    // Build a summary from the conversation
    const summaryParts: string[] = [];

    // First user message = primary intent
    if (userMessages.length > 0) {
        const firstMsg = userMessages[0].content;
        summaryParts.push(firstMsg.length > 150 ? firstMsg.slice(0, 150) + '...' : firstMsg);
    }

    // Key questions asked (subsequent user messages, condensed)
    if (userMessages.length > 1) {
        const followUps = userMessages.slice(1, 4).map(m => {
            const text = m.content.trim();
            return text.length > 80 ? text.slice(0, 80) + '...' : text;
        });
        if (followUps.length > 0) {
            summaryParts.push(`Follow-ups: ${followUps.join(' | ')}`);
        }
    }

    // Key AI conclusions (first sentence of last assistant message)
    if (assistantMessages.length > 0) {
        const lastReply = assistantMessages[assistantMessages.length - 1].content;
        const firstSentence = lastReply.split(/[.!?]/)[0];
        if (firstSentence && firstSentence.length > 10) {
            summaryParts.push(`AI conclusion: ${firstSentence.slice(0, 120)}`);
        }
    }

    return {
        id: session.id,
        title: session.title,
        summary: summaryParts.join('\n'),
        topics: uniqueTopics,
        lastUpdated: session.updatedAt,
    };
}

// ─── Core: Build Context Intelligence Block ──────────────────────────────

/**
 * Build the context intelligence block for the system prompt.
 * This analyzes:
 * 1. The current conversation (for coherence)
 * 2. Recent previous conversations (for continuity)
 * 3. Global topics the user frequently discusses
 */
export function buildContextIntelligence(
    currentChatId: string | null,
    currentMessages: Array<{ role: string; content: string }>,
    maxPreviousChats: number = 5
): ContextIntelligenceResult {
    // Get all previous chat sessions
    const allSessions = chatStorage.getAllSessions();
    const digestCache = loadDigestCache();

    // Build/update digests for recent sessions (excluding current)
    const otherSessions = allSessions
        .filter(s => s.id !== currentChatId && s.messages.length > 0)
        .slice(0, maxPreviousChats);

    const digests: ConversationDigest[] = [];
    const updatedCache = { ...digestCache };

    for (const session of otherSessions) {
        // Use cached digest if session hasn't been updated
        const cached = digestCache[session.id];
        if (cached && new Date(cached.lastUpdated).getTime() >= session.updatedAt.getTime()) {
            digests.push(cached);
        } else {
            const digest = buildDigest(session);
            digests.push(digest);
            updatedCache[session.id] = digest;
        }
    }

    // Clean old entries from cache
    const activeIds = new Set(allSessions.map(s => s.id));
    for (const key of Object.keys(updatedCache)) {
        if (!activeIds.has(key)) {
            delete updatedCache[key];
        }
    }
    saveDigestCache(updatedCache);

    // Collect global topics
    const allTopics: string[] = [];
    for (const digest of digests) {
        allTopics.push(...digest.topics);
    }
    // Add topics from current conversation
    for (const msg of currentMessages.filter(m => m.role === 'user')) {
        allTopics.push(...extractTopics(msg.content));
    }

    // Count topic frequency
    const topicCounts: Record<string, number> = {};
    for (const t of allTopics) {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
    const topTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([topic]) => topic);

    // Save global topics
    try {
        localStorage.setItem(TOPICS_KEY, JSON.stringify(topTopics));
    } catch { /* ignore */ }

    // Build the context block
    const parts: string[] = [];

    // Section 1: Previous conversation summaries
    if (digests.length > 0) {
        parts.push('PREVIOUS CONVERSATION HISTORY:');
        parts.push('The user has had these recent conversations with you. Use this context to maintain continuity and remember what was discussed:');
        parts.push('');

        for (const digest of digests.slice(0, maxPreviousChats)) {
            parts.push(`- Chat "${digest.title}":`);
            parts.push(`  ${digest.summary.split('\n').join('\n  ')}`);
            if (digest.topics.length > 0) {
                parts.push(`  Topics: ${digest.topics.join(', ')}`);
            }
            parts.push('');
        }
    }

    // Section 2: User's recurring interests
    if (topTopics.length > 0) {
        parts.push(`USER INTERESTS: The user frequently discusses: ${topTopics.join(', ')}.`);
        parts.push('Tailor your responses and examples to align with these interests when relevant.');
        parts.push('');
    }

    // Section 3: Current conversation awareness
    if (currentMessages.length > 0) {
        const currentTopics = [...new Set(
            currentMessages
                .filter(m => m.role === 'user')
                .flatMap(m => extractTopics(m.content))
        )];
        if (currentTopics.length > 0) {
            parts.push(`CURRENT SESSION TOPICS: ${currentTopics.join(', ')}`);
            parts.push('');
        }
    }

    // Instructions for how to use this context
    if (parts.length > 0) {
        parts.push('CONTEXT INTELLIGENCE RULES:');
        parts.push('- Reference previous conversations naturally when relevant (e.g., "As we discussed in your earlier chat about X...")');
        parts.push('- Remember user preferences and working style from past interactions');
        parts.push('- Do NOT repeat information the user already knows from previous chats');
        parts.push('- If the user asks something related to a previous chat, connect the dots proactively');
        parts.push('- Keep responses coherent with what was established in earlier conversations');
    }

    return {
        contextBlock: parts.join('\n'),
        sessionsReferenced: digests.length,
        topics: topTopics,
    };
}

/**
 * Get the user's global topics (for display or analytics)
 */
export function getUserTopics(): string[] {
    try {
        const stored = localStorage.getItem(TOPICS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}
