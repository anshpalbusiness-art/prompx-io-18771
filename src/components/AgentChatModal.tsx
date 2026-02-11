import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Bot, Send, X, Loader2, User, Sparkles,
    ThumbsUp, ThumbsDown, Copy, RefreshCw
} from "lucide-react";
import { Agent } from "./AgentCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    executeAgent,
    recordAgentExecution,
    getMemoryAsContext,
    getToolsAsContext
} from "@/lib/agentUtils";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    rated?: 'up' | 'down';
}

interface AgentChatModalProps {
    agent: Agent;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AgentChatModal = ({ agent, open, onOpenChange }: AgentChatModalProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when modal opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    // Reset on agent change
    useEffect(() => {
        setMessages([]);
    }, [agent.id]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Create placeholder for streaming
        const assistantId = `msg-${Date.now() + 1}`;
        const streamingMessage: Message = {
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
        };
        setMessages(prev => [...prev, streamingMessage]);

        const startTime = performance.now();

        try {
            // Get memory and tools context
            const memoryContext = getMemoryAsContext(agent.id);
            const toolsContext = getToolsAsContext(agent.id);

            // Build enhanced system prompt
            let systemPrompt = agent.system_prompt || `You are ${agent.name}, a helpful AI assistant.`;

            if (memoryContext) {
                systemPrompt += `\n\n## Memory Context:\n${memoryContext}`;
            }
            if (toolsContext) {
                systemPrompt += `\n\n## Available Tools:\n${toolsContext}`;
            }

            // Build conversation history
            const conversationHistory = messages
                .filter(m => !m.isStreaming)
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n\n');

            const fullPrompt = conversationHistory
                ? `${conversationHistory}\n\nUser: ${userMessage.content}`
                : userMessage.content;

            // Execute agent
            const result = await executeAgent(agent.id, systemPrompt, fullPrompt);

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            if (result.success && result.response) {
                // Simulate streaming with typing effect
                const fullResponse = result.response;
                let streamedContent = '';

                for (let i = 0; i < fullResponse.length; i++) {
                    streamedContent += fullResponse[i];
                    setMessages(prev => prev.map(m =>
                        m.id === assistantId
                            ? { ...m, content: streamedContent }
                            : m
                    ));

                    // Vary typing speed for natural effect
                    const delay = fullResponse[i] === ' ' ? 5 :
                        fullResponse[i] === '.' ? 30 :
                            fullResponse[i] === '\n' ? 15 : 8;
                    await new Promise(r => setTimeout(r, delay));
                }

                // Mark as done streaming
                setMessages(prev => prev.map(m =>
                    m.id === assistantId
                        ? { ...m, isStreaming: false }
                        : m
                ));

                // Record metrics
                recordAgentExecution(agent.id, fullResponse.length * 0.75, responseTime);
            } else {
                throw new Error(result.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => prev.map(m =>
                m.id === assistantId
                    ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
                    : m
            ));
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to get response",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRate = (messageId: string, rating: 'up' | 'down') => {
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, rated: rating } : m
        ));
        // Record quality feedback in localStorage
        const qualityKey = `promptx_quality_${agent.id}`;
        const quality = JSON.parse(localStorage.getItem(qualityKey) || '[]');
        quality.push({ rating, timestamp: Date.now() });
        localStorage.setItem(qualityKey, JSON.stringify(quality));
        toast({
            title: rating === 'up' ? "Thanks for the feedback! 👍" : "Feedback recorded",
            description: rating === 'up' ? "We're glad this was helpful!" : "We'll work on improving.",
        });
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        toast({ title: "Copied!", description: "Message copied to clipboard" });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 bg-background border-white/10">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-secondary border border-white/10">
                                <Bot className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">{agent.name}</DialogTitle>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-xs border-white/10">{agent.category}</Badge>
                                    <span className="text-xs text-muted-foreground">{agent.model || 'grok-3'}</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMessages([])}
                            disabled={messages.length === 0}
                            title="Clear chat"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 px-6" ref={scrollRef}>
                    <div className="py-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="inline-flex p-4 rounded-2xl bg-secondary/50 border border-white/10 mb-4">
                                    <Sparkles className="h-8 w-8 text-foreground" />
                                </div>
                                <h3 className="font-semibold mb-1">Start a Conversation</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Ask {agent.name} anything. This agent specializes in {agent.category?.toLowerCase()} tasks.
                                </p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-3",
                                        message.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="p-2 rounded-lg bg-secondary h-fit shrink-0">
                                            <Bot className="h-4 w-4 text-foreground" />
                                        </div>
                                    )}

                                    <div className={cn(
                                        "max-w-[80%] rounded-2xl px-4 py-3",
                                        message.role === 'user'
                                            ? "bg-foreground text-background"
                                            : "bg-muted/50 border border-white/10"
                                    )}>
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {message.content}
                                            {message.isStreaming && (
                                                <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                                            )}
                                        </p>

                                        {/* Actions for assistant messages */}
                                        {message.role === 'assistant' && !message.isStreaming && message.content && (
                                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn("h-6 w-6 hover:bg-white/10", message.rated === 'up' && "text-foreground")}
                                                    onClick={() => handleRate(message.id, 'up')}
                                                    disabled={!!message.rated}
                                                >
                                                    <ThumbsUp className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn("h-6 w-6 hover:bg-white/10", message.rated === 'down' && "text-foreground")}
                                                    onClick={() => handleRate(message.id, 'down')}
                                                    disabled={!!message.rated}
                                                >
                                                    <ThumbsDown className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 ml-auto hover:bg-white/10"
                                                    onClick={() => handleCopy(message.content)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {message.role === 'user' && (
                                        <div className="p-2 rounded-lg bg-secondary h-fit shrink-0">
                                            <User className="h-4 w-4 text-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="px-6 py-4 border-t border-white/10 flex-shrink-0 bg-background">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message ${agent.name}...`}
                            disabled={isLoading}
                            className="flex-1 bg-muted/30 border-white/10 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Press Enter to send • Responses are streamed in real-time
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AgentChatModal;
