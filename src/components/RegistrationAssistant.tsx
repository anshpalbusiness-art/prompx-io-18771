import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { generateText } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface RegistrationAssistantProps {
    itemType: "CLI" | "Workflow" | "Prompt";
    onSuggest: (suggestions: any) => void;
    onAutoSubmit: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const RegistrationAssistant = ({ itemType, onSuggest, onAutoSubmit }: RegistrationAssistantProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hi! I'm your AI Marketplace Assistant. Ready to list your ${itemType}? Tell me what it does, and I'll help you write a great name, description, and figure out the right price. If you like my suggestions, I can even register it for you automatically! What kind of ${itemType} are you building?`
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const systemPrompt = `You are an expert product marketer for an AI marketplace helping a user list a ${itemType}. 
Your goal is to converse with the user, figure out what their item does, and suggest a catchy Name, a compelling Description, appropriate Category/Tags, a fair Market Price (usually $0 for simple, $5-$20 for complex), and the core Prompt/Configuration.
Keep your conversational responses short, enthusiastic, and helpful. Always emphasize how awesome their idea is.

CRITICAL INSTRUCTION:
If you have enough information to make a strong suggestion, or if the user explicitly asks you to generate the details, you MUST include a JSON block in your response. The JSON block MUST be wrapped exactly in \`\`\`json ... \`\`\`. 
The JSON structure should be:
{
  "title": "Suggested Name",
  "description": "Suggested description (including installation guide if CLI)",
  "price": 5.00,
  "tags": "tag1, tag2",
  "system_prompt": "Suggested system prompt or workflow configuration",
  "autoSubmit": false
}
For a Workflow, use 'template_prompt' instead of 'system_prompt', and 'template_name' instead of 'title'.
For a CLI, use 'system_prompt' and 'title'.

If the user explicitly says something like "Yes, go ahead", "Register it", "Do it", or "Looks good, submit it", you MUST set "autoSubmit": true in that JSON block.`;

            // Prepare context
            const conversationHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
            const prompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\nUser: ${userMsg}\nAssistant:`;

            const responseText = await generateText(prompt);

            // Check for JSON block
            const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/) || responseText.match(/{[\s\S]*"title"[\s\S]*}/);

            let displayContent = responseText;

            if (jsonMatch) {
                try {
                    const jsonStr = jsonMatch[1] || jsonMatch[0]; // match[1] is the group inside ```json, match[0] is raw brace match
                    const suggestions = JSON.parse(jsonStr.trim());

                    // Call the suggest callback to update the UI form
                    onSuggest(suggestions);

                    if (suggestions.autoSubmit) {
                        displayContent = "Registering your item now! Give me just a second...";
                        setTimeout(() => {
                            onAutoSubmit();
                        }, 1500);
                    } else {
                        // Clean up the display text to remove the raw JSON from the user's view
                        displayContent = responseText.replace(/```json\n[\s\S]*?\n```/g, '').replace(/```\n[\s\S]*?\n```/g, '').trim();
                        if (!displayContent) {
                            displayContent = "I've drafted some details for you! Check them out in the form. Let me know if you want to tweak anything, or just say 'Register it' and I'll submit it for you.";
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse AI JSON suggestion:", e);
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: displayContent }]);

        } catch (error) {
            console.error("Error communicating with AI:", error);
            toast({
                title: "Connection Error",
                description: "Failed to reach the AI assistant. Please try again.",
                variant: "destructive"
            });
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I lost my connection for a second. What were we talking about?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 rounded-xl border border-white/10 overflow-hidden backdrop-blur-md">
            <div className="bg-primary/10 p-4 border-b border-white/5 flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">AI Listing Assistant</h3>
                    <p className="text-xs text-muted-foreground">Chat to auto-fill & publish</p>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 text-sm ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                ? 'bg-secondary'
                                : 'bg-primary/20 text-primary'
                                }`}>
                                {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'user'
                                ? 'bg-secondary rounded-tr-sm'
                                : 'bg-white/5 border border-white/10 rounded-tl-sm text-zinc-300 whitespace-pre-wrap'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-muted-foreground text-xs">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 bg-black/40 border-t border-white/5">
                <div className="relative flex items-center">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Describe your ${itemType}...`}
                        className="pr-12 bg-white/5 border-white/10 rounded-full h-11 focus-visible:ring-primary/30 text-sm sm:text-base placeholder:text-muted-foreground/70 tracking-tight"
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 w-9 h-9 rounded-full hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-50"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
