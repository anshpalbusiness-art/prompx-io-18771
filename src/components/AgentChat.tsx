import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, User, Bot, Download, Trash2, Copy, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Agent {
  id: string;
  name: string;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface AgentChatProps {
  agent: Agent;
}

const AgentChat = ({ agent }: AgentChatProps) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const timestamp = Date.now();
    
    setInput("");
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp }]);
    setLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const contextPrompt = conversationHistory.length > 0
        ? `Previous conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\nUser: ${userMessage}`
        : userMessage;

      const response = await supabase.functions.invoke('execute-claude', {
        body: {
          prompt: contextPrompt,
          systemPrompt: `You are ${agent.name}. ${agent.description}`,
          model: "claude-sonnet-4-5",
          temperature: 0.7,
          maxTokens: 4000
        }
      });

      if (response.error) throw response.error;
      
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: response.data.result,
          timestamp: Date.now()
        }
      ]);

      toast({
        title: `${agent.name} Responded`,
        description: "Response generated with Claude 4 Sonnet",
      });
    } catch (error) {
      console.error('Error executing agent:', error);
      
      // Handle specific error cases with better messages
      let errorMessage = "Failed to get response from agent. Please try again.";
      let errorTitle = "Error";
      
      if (error instanceof Error) {
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          errorTitle = "Rate Limit Exceeded";
          errorMessage = "Too many requests. Please wait a moment before trying again.";
        } else if (error.message?.includes('credits') || error.message?.includes('402')) {
          errorTitle = "Insufficient Credits";
          errorMessage = "AI credits depleted. Please add credits to continue using AI agents.";
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorTitle = "Connection Error";
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleExportConversation = () => {
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? 'You' : agent.name}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name}-conversation-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Conversation exported successfully",
    });
  };

  const handleClearConversation = () => {
    setMessages([]);
    toast({
      title: "Cleared",
      description: "Conversation history cleared",
    });
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Enhanced Header with Actions */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportConversation}
              title="Export conversation"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Ready to help!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {agent.description || "Ask me anything and I'll assist you with context-aware responses."}
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <Card
                key={index}
                className={`p-4 group relative ${
                  message.role === 'user'
                    ? 'bg-primary/10 ml-auto max-w-[80%]'
                    : 'bg-muted max-w-[80%]'
                }`}
              >
                <div className="flex gap-3">
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  ) : (
                    <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.timestamp && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-8 w-8"
                    onClick={() => handleCopy(message.content, index)}
                  >
                    {copied === index ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </Card>
            ))
          )}
          {loading && (
            <Card className="p-4 bg-muted max-w-[80%]">
              <div className="flex gap-3">
                <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send • Shift+Enter for new line • Context-aware responses enabled
        </p>
      </form>
    </div>
  );
};

export default AgentChat;