import React from 'react';
import { ChatSession, chatStorage } from '@/lib/chatStorage';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Trash2, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    isOpen,
    onClose,
    currentChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
}) => {
    const [sessions, setSessions] = React.useState<ChatSession[]>([]);

    // Load sessions on mount and when sidebar opens
    React.useEffect(() => {
        if (isOpen) {
            setSessions(chatStorage.getAllSessions());
        }
    }, [isOpen]);

    const formatTimestamp = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed top-0 left-0 h-full w-80 bg-background/95 backdrop-blur-2xl border-r border-border z-50 transition-transform duration-300 ease-out shadow-2xl",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex-none px-6 py-5 border-b border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-foreground tracking-tight">Chat History</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                            >
                                <X className="w-4 h-4" strokeWidth={2} />
                            </Button>
                        </div>

                        {/* New Chat Button */}
                        <Button
                            onClick={() => {
                                onNewChat();
                                onClose();
                            }}
                            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-sm transition-all duration-200 gap-2"
                        >
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            New Chat
                        </Button>
                    </div>

                    {/* Chat List */}
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-2">
                            {sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
                                    <p className="text-sm text-muted-foreground">No chat history yet</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">Start a new conversation</p>
                                </div>
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={cn(
                                            "group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border",
                                            currentChatId === session.id
                                                ? "bg-accent border-accent-foreground/20 shadow-sm"
                                                : "bg-muted/30 border-transparent hover:bg-muted hover:border-border"
                                        )}
                                        onClick={() => {
                                            onSelectChat(session.id);
                                            onClose();
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-3 w-full pr-1">
                                            <div className="flex-1 min-w-0 grid gap-0.5">
                                                <h3 className="text-sm font-semibold text-foreground truncate">
                                                    {session.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" strokeWidth={2} />
                                                    <span>{formatTimestamp(session.updatedAt)}</span>
                                                    {session.messages.length > 0 && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteChat(session.id);
                                                    setSessions(chatStorage.getAllSessions());
                                                }}
                                                className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all flex-shrink-0"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </>
    );
};
