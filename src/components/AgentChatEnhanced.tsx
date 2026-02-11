import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Send, User, Bot, Download, Trash2, Copy, CheckCircle,
  Save, BarChart3, Upload, X, Sparkles
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Agent {
  id: string;
  name: string;
  description: string;
  model?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  tokensUsed?: number;
  responseTime?: number;
}

interface AgentChatEnhancedProps {
  agent: Agent;
  userId: string;
}

const AgentChatEnhanced = ({ agent, userId }: AgentChatEnhancedProps) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Generate conversation ID on mount
    setConversationId(crypto.randomUUID());

    // Generate initial suggested prompts
    generateSuggestedPrompts();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Update analytics
    const tokens = messages.reduce((sum, msg) => sum + (msg.tokensUsed || 0), 0);
    const times = messages.filter(msg => msg.responseTime).map(msg => msg.responseTime!);
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    setTotalTokens(tokens);
    setAvgResponseTime(avg);
  }, [messages]);

  const generateSuggestedPrompts = async () => {
    // Generate context-aware suggestions based on agent type
    const suggestions = [
      "Tell me more about your capabilities",
      "Can you provide an example?",
      "What are the best practices?",
    ];
    setSuggestedPrompts(suggestions);
  };

  const handleSubmit = async (e: React.FormEvent, customPrompt?: string) => {
    e.preventDefault();
    const userMessage = customPrompt || input.trim();
    if (!userMessage || loading) return;

    const timestamp = Date.now();
    setInput("");
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp }]);
    setLoading(true);
    setSuggestedPrompts([]);

    try {
      // First, sanitize the prompt automatically
      const { data: sanitizeData, error: sanitizeError } = await supabase.functions.invoke("sanitize-prompt", {
        body: { prompt: userMessage },
      });

      // Check if we have a reframed response
      if (!sanitizeError && sanitizeData && !sanitizeData.isSafe && sanitizeData.sanitizedPrompt) {
        // Use the reframed response directly as the AI's answer
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: sanitizeData.sanitizedPrompt,
            timestamp: Date.now(),
          }
        ]);
        setLoading(false);
        generateSuggestedPrompts();
        return;
      }

      let promptToUse = userMessage;

      // Prepare conversation history (limit to last 10 messages for context window)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('execute-agent', {
        body: {
          agentId: agent.id,
          userInput: promptToUse,
          conversationHistory,
          conversationId,
          userId,
          stream: false, // Can be enabled for streaming
        }
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
          tokensUsed: data.tokensUsed,
          responseTime: data.responseTime,
        }
      ]);

      // Generate new suggested prompts
      generateSuggestedPrompts();

      if (data.responseTime) {
        console.log(`Response: ${data.responseTime}ms, ${data.tokensUsed} tokens`);
      }
    } catch (error) {
      console.error('Error executing agent:', error);

      let errorMessage = "Failed to get response from agent. Please try again.";
      let errorTitle = "Error";

      if (error instanceof Error) {
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          errorTitle = "Rate Limit Exceeded";
          errorMessage = "Too many requests. Please wait before trying again.";
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
    toast({
      title: "Files added",
      description: `${files.length} file(s) ready to process`,
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleSaveConversation = async () => {
    try {
      const { error } = await supabase
        .from('agent_conversations')
        .upsert({
          user_id: userId,
          agent_id: agent.id,
          messages: messages as any,
          title: messages[0]?.content.substring(0, 100) || "Untitled Conversation",
        });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Saved",
        description: "Conversation saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save conversation",
        variant: "destructive",
      });
    }
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
    setConversationId(crypto.randomUUID());
    setIsSaved(false);
    setUploadedFiles([]);
    generateSuggestedPrompts();
    toast({
      title: "Cleared",
      description: "Conversation history cleared",
    });
  };

  return (
    <div className="flex flex-col h-[700px]">
      {/* Enhanced Header with Stats */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{agent.name}</h3>
              <p className="text-xs text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
                {agent.model && ` • ${agent.model.split('/')[1]}`}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveConversation}
                title="Save conversation"
              >
                <Save className="w-4 h-4" />
              </Button>
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

        {/* Analytics Bar */}
        {messages.length > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              <span>{totalTokens} tokens</span>
            </div>
            <div className="flex items-center gap-1">
              <span>⚡ {avgResponseTime.toFixed(0)}ms avg</span>
            </div>
            {isSaved && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4 inline-flex p-4 rounded-full bg-primary/10">
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Ready to assist!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                {agent.description || "Ask me anything and I'll provide context-aware, intelligent responses."}
              </p>

              {/* Suggested Prompts */}
              {suggestedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {suggestedPrompts.map((prompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        setInput(prompt);
                        handleSubmit(e, prompt);
                      }}
                      className="text-xs"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <Card
                key={index}
                className={`p-4 group relative ${message.role === 'user'
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
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {message.timestamp && (
                        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      )}
                      {message.responseTime && (
                        <Badge variant="secondary" className="text-xs">
                          {message.responseTime}ms
                        </Badge>
                      )}
                      {message.tokensUsed && (
                        <Badge variant="secondary" className="text-xs">
                          {message.tokensUsed} tokens
                        </Badge>
                      )}
                    </div>
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                  <Progress value={33} className="mt-2 h-1" />
                </div>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadedFiles.map((file, idx) => (
              <Badge key={idx} variant="secondary" className="pr-1">
                {file.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1"
                  onClick={() => removeFile(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            title="Upload files"
          >
            <Upload className="w-4 h-4" />
          </Button>
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
          Press Enter to send • Shift+Enter for new line • {totalTokens} tokens used
        </p>
      </form>
    </div>
  );
};

export default AgentChatEnhanced;