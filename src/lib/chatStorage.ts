export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    model?: string;
    attachments?: string[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    model?: string;
}

const STORAGE_KEY = "promptx_chat_sessions";

// Helper to parse dates when loading from localStorage
const reviveDates = (session: any): ChatSession => ({
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
    })),
});

export const chatStorage = {
    // Get all chat sessions
    getAllSessions: (): ChatSession[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return [];
            const sessions = JSON.parse(data);
            return sessions.map(reviveDates).sort((a: ChatSession, b: ChatSession) =>
                b.updatedAt.getTime() - a.updatedAt.getTime()
            );
        } catch (error) {
            console.error("Error loading chat sessions:", error);
            return [];
        }
    },

    // Get a specific session by ID
    getSession: (id: string): ChatSession | null => {
        const sessions = chatStorage.getAllSessions();
        return sessions.find(s => s.id === id) || null;
    },

    // Save or update a chat session
    saveSession: (session: ChatSession): void => {
        try {
            const sessions = chatStorage.getAllSessions();
            const existingIndex = sessions.findIndex(s => s.id === session.id);

            if (existingIndex >= 0) {
                sessions[existingIndex] = session;
            } else {
                sessions.push(session);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        } catch (error) {
            console.error("Error saving chat session:", error);
        }
    },

    // Delete a chat session
    deleteSession: (id: string): void => {
        try {
            const sessions = chatStorage.getAllSessions();
            const filtered = sessions.filter(s => s.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
            console.error("Error deleting chat session:", error);
        }
    },

    // Create a new session
    createSession: (title?: string, model?: string): ChatSession => {
        const now = new Date();
        return {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title || "New Chat",
            messages: [],
            createdAt: now,
            updatedAt: now,
            model,
        };
    },

    // Generate title from first user message
    generateTitle: (firstMessage: string): string => {
        // Take first 50 characters and clean up
        const cleaned = firstMessage.trim().replace(/\n/g, " ");
        return cleaned.length > 50 ? cleaned.substring(0, 50) + "..." : cleaned;
    },

    // Update session metadata
    updateMetadata: (id: string, updates: Partial<Pick<ChatSession, 'title' | 'updatedAt'>>): void => {
        const session = chatStorage.getSession(id);
        if (session) {
            chatStorage.saveSession({
                ...session,
                ...updates,
            });
        }
    },
};
