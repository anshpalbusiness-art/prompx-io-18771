import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AICopilot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Prompt Co-Pilot. Let's build the perfect prompt together. What would you like to create a prompt for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationContext = messages.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');
      
      const response = await supabase.functions.invoke('execute-claude', {
        body: {
          prompt: `${conversationContext}\nUser: ${input}`,
          systemPrompt: "You are an AI Prompt Co-Pilot. Help users build better prompts through conversation. Ask clarifying questions and guide them to create effective prompts.",
          model: "claude-sonnet-4-5",
          temperature: 0.7,
          maxTokens: 4000
        }
      });

      if (response.error) throw response.error;

      const assistantMessage = response.data.result;
      
      // Check if it's a final prompt
      if (messages.length > 4) {
        const finalPromptMatch = assistantMessage.match(/FINAL_PROMPT:\s*([\s\S]+)/);
        if (finalPromptMatch) {
          setFinalPrompt(finalPromptMatch[1].trim());
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (finalPrompt) {
      navigator.clipboard.writeText(finalPrompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm your AI Prompt Co-Pilot. Let's build the perfect prompt together. What would you like to create a prompt for?",
      },
    ]);
    setFinalPrompt("");
    setInput("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Co-Pilot Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea ref={scrollRef} className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">
                      {message.content.replace(/FINAL_PROMPT:\s*/g, "")}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted max-w-[80%] rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.2s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50 [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your response..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {finalPrompt && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Final Prompt</span>
                  <Button
                    onClick={handleCopy}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{finalPrompt}</p>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleReset} variant="outline" className="w-full">
            Start New Conversation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
