import React, { useState, useRef, useEffect } from 'react';
import Starfield from "@/components/Starfield";
import { ChatbotLoader } from "@/components/ChatbotLoader";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { chatStorage, ChatMessage as StoredChatMessage } from "@/lib/chatStorage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send, Sparkles, Copy, Check, Bot, User as UserIcon,
  Mic, MicOff, Paperclip, Image as ImageIcon,
  MessageSquare, Zap, Brain, Code, Target, Palette, Video, Music, Settings, MoreVertical, X, Phone, PhoneOff, Search, MessagesSquare, History, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Copied from PromptEngineer.tsx to maintain available options
const AI_MODELS = [
  // Text & Reasoning
  { id: 'chatgpt', name: 'ChatGPT', icon: MessageSquare, description: 'OpenAI conversational AI', category: 'text', provider: 'OpenAI' },
  { id: 'claude', name: 'Claude', icon: Brain, description: 'Anthropic AI assistant', category: 'text', provider: 'Anthropic' },
  { id: 'gemini', name: 'Gemini', icon: Sparkles, description: 'Google multimodal AI', category: 'text', provider: 'Google' },
  { id: 'grok', name: 'Grok', icon: Zap, description: 'xAI real-time insights', category: 'text', provider: 'xAI' },
  { id: 'perplexity', name: 'Perplexity', icon: Search, description: 'AI-powered search', category: 'text', provider: 'Perplexity' },
  { id: 'mistral', name: 'Mistral', icon: MessagesSquare, description: 'Open-weight efficient AI', category: 'text', provider: 'Mistral AI' },
  { id: 'llama', name: 'Llama 3', icon: Brain, description: 'Meta open source model', category: 'text', provider: 'Meta' },
  { id: 'deepseek', name: 'DeepSeek', icon: Code, description: 'Advanced coding & math', category: 'text', provider: 'DeepSeek' },
  { id: 'cohere', name: 'Command R+', icon: MessageSquare, description: 'Enterprise RAG model', category: 'text', provider: 'Cohere' },

  // Image Generation
  { id: 'midjourney', name: 'Midjourney', icon: Palette, description: 'Artistic image generation', category: 'image', provider: 'Midjourney' },
  { id: 'dalle', name: 'DALL-E 3', icon: ImageIcon, description: 'OpenAI image system', category: 'image', provider: 'OpenAI' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: Palette, description: 'Open-source image gen', category: 'image', provider: 'Stability AI' },
  { id: 'leonardo', name: 'Leonardo.ai', icon: Palette, description: 'Creative asset generation', category: 'image', provider: 'Leonardo' },
  { id: 'firefly', name: 'Adobe Firefly', icon: Palette, description: 'Commercial safe images', category: 'image', provider: 'Adobe' },
  { id: 'ideogram', name: 'Ideogram', icon: Palette, description: 'Typography rich images', category: 'image', provider: 'Ideogram' },
  { id: 'flux', name: 'Flux.1', icon: Zap, description: 'High fidelity open model', category: 'image', provider: 'Black Forest' },

  // Video Generation
  { id: 'sora', name: 'Sora', icon: Video, description: 'Realistic video generation', category: 'video', provider: 'OpenAI' },
  { id: 'runway', name: 'Runway Gen-3', icon: Video, description: 'Cinematic video tools', category: 'video', provider: 'Runway' },
  { id: 'luma', name: 'Luma Dream Machine', icon: Video, description: 'High-quality video AI', category: 'video', provider: 'Luma Labs' },
  { id: 'kling', name: 'Kling', icon: Video, description: 'Next-gen video model', category: 'video', provider: 'Kuaishou' },
  { id: 'pika', name: 'Pika Art', icon: Video, description: 'Animation & video effects', category: 'video', provider: 'Pika' },
  { id: 'haiper', name: 'Haiper', icon: Video, description: 'Creative video foundation', category: 'video', provider: 'Haiper' },

  // Code Generation
  { id: 'copilot', name: 'GitHub Copilot', icon: Code, description: 'AI pair programmer', category: 'code', provider: 'Microsoft' },
  { id: 'cursor', name: 'Cursor', icon: Code, description: 'AI-first code editor', category: 'code', provider: 'Anysphere' },
  { id: 'replit', name: 'Replit Ghostwriter', icon: Code, description: 'Cloud IDE assistant', category: 'code', provider: 'Replit' },
  { id: 'q', name: 'Amazon Q', icon: Code, description: 'Enterprise coding companion', category: 'code', provider: 'AWS' },
  { id: 'codeium', name: 'Codeium', icon: Code, description: 'Fast code autocomplete', category: 'code', provider: 'Codeium' },

  // Audio & Music
  { id: 'suno', name: 'Suno', icon: Music, description: 'AI music generation', category: 'audio', provider: 'Suno' },
  { id: 'udio', name: 'Udio', icon: Music, description: 'High fidelity music', category: 'audio', provider: 'Udio' },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: Mic, description: 'Realistic voice synthesis', category: 'audio', provider: 'ElevenLabs' },
  { id: 'murf', name: 'Murf.ai', icon: Mic, description: 'Studio quality voiceovers', category: 'audio', provider: 'Murf' },
  { id: 'stable-audio', name: 'Stable Audio', icon: Music, description: 'Sound formatting & effects', category: 'audio', provider: 'Stability AI' },
];

// Provider URLs for redirect feature
const PROVIDER_URLS: Record<string, string> = {
  // Text & Reasoning
  'chatgpt': 'https://chat.openai.com',
  'claude': 'https://claude.ai',
  'gemini': 'https://gemini.google.com',
  'grok': 'https://x.com/i/grok',
  'perplexity': 'https://www.perplexity.ai',
  'mistral': 'https://chat.mistral.ai',
  'llama': 'https://www.meta.ai',
  'deepseek': 'https://chat.deepseek.com',
  'cohere': 'https://coral.cohere.com',

  // Image Generation
  'midjourney': 'https://www.midjourney.com',
  'dalle': 'https://chat.openai.com',
  'stable-diffusion': 'https://stability.ai',
  'leonardo': 'https://leonardo.ai',
  'firefly': 'https://firefly.adobe.com',
  'ideogram': 'https://ideogram.ai',
  'flux': 'https://flux.ai',

  // Video Generation
  'sora': 'https://openai.com/sora',
  'runway': 'https://runwayml.com',
  'luma': 'https://lumalabs.ai',
  'kling': 'https://klingai.com',
  'pika': 'https://pika.art',
  'haiper': 'https://haiper.ai',

  // Code Generation
  'copilot': 'https://github.com/features/copilot',
  'cursor': 'https://cursor.sh',
  'replit': 'https://replit.com',
  'q': 'https://aws.amazon.com/q',
  'codeium': 'https://codeium.com',

  // Audio & Music
  'suno': 'https://suno.ai',
  'udio': 'https://udio.com',
  'elevenlabs': 'https://elevenlabs.io',
  'murf': 'https://murf.ai',
  'stable-audio': 'https://stability.ai/stable-audio',
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  attachments?: string[];
}

export const DashboardChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[1]); // Default to Claude
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Chat history state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load last chat session on mount
  useEffect(() => {
    const sessions = chatStorage.getAllSessions();
    if (sessions.length > 0) {
      const lastSession = sessions[0]; // Most recent
      setCurrentChatId(lastSession.id);
      setMessages(lastSession.messages);
      setSelectedModel(AI_MODELS.find(m => m.id === lastSession.model) || AI_MODELS[1]);
    } else {
      // Create a new session if none exists
      const newSession = chatStorage.createSession("New Chat", AI_MODELS[1].id);
      chatStorage.saveSession(newSession);
      setCurrentChatId(newSession.id);
    }
  }, []);

  // Auto-save messages when they change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      const session = chatStorage.getSession(currentChatId);
      if (session) {
        // Auto-generate title from first user message if still using default
        let title = session.title;
        if (title === "New Chat" && messages.length > 0) {
          const firstUserMessage = messages.find(m => m.role === "user");
          if (firstUserMessage) {
            title = chatStorage.generateTitle(firstUserMessage.content);
          }
        }

        chatStorage.saveSession({
          ...session,
          title,
          messages,
          updatedAt: new Date(),
          model: selectedModel.id,
        });
      }
    }
  }, [messages, currentChatId, selectedModel.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Helper to scroll to top (for empty state)
  const scrollToTop = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }
  };

  // Chat history handlers
  const handleNewChat = () => {
    const newSession = chatStorage.createSession("New Chat", selectedModel.id);
    chatStorage.saveSession(newSession);
    setCurrentChatId(newSession.id);
    setMessages([]);
    // Reset scroll to top for empty state after DOM update
    setTimeout(() => scrollToTop(), 0);
    toast.success("Started new chat");
  };

  const handleSelectChat = (chatId: string) => {
    const session = chatStorage.getSession(chatId);
    if (session) {
      setCurrentChatId(session.id);
      setMessages(session.messages);
      setSelectedModel(AI_MODELS.find(m => m.id === session.model) || AI_MODELS[1]);
      toast.success(`Loaded: ${session.title}`);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    chatStorage.deleteSession(chatId);

    // If we deleted the current chat, load another or create new
    if (chatId === currentChatId) {
      const sessions = chatStorage.getAllSessions();
      if (sessions.length > 0) {
        handleSelectChat(sessions[0].id);
      } else {
        handleNewChat();
      }
    }

    toast.success("Chat deleted");
  };


  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? attachedFiles.map(f => f.name) : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);

    // Simulate AI response
    try {
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I'm analyzing your request using **${selectedModel.name}**.\n\nHere is a draft prompt based on "${userMessage.content}":\n\n\`\`\`\nAct as an expert in the field. Please explain ${userMessage.content} in detail, providing examples and counter-arguments.\n\`\`\`\n\nWould you like me to refine this further?`,
          timestamp: new Date(),
          model: selectedModel.id
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send message");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleImageAttach = () => {
    imageInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) attached`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} image(s) attached`);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    toast.info("Attachment removed");
  };

  const toggleRecording = () => {
    if (!isRecording) {
      // Start recording
      try {
        // Check if browser supports Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          toast.error("Voice recognition not supported in this browser");
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          toast.info("🎤 Listening... Speak now");
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? " " : "") + transcript);
          toast.success("Voice transcribed successfully");
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);

          if (event.error === 'no-speech') {
            toast.error("No speech detected. Please try again.");
          } else if (event.error === 'not-allowed') {
            toast.error("Microphone access denied. Please allow microphone access.");
          } else {
            toast.error(`Voice recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        toast.error("Failed to start voice recognition");
        setIsRecording(false);
      }
    } else {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
        toast.info("Voice recording stopped");
      }
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  const handleRegenerateMessage = (messageId: string) => {
    toast.info("Regenerating response...");
    // Implement regeneration logic
  };

  const handleUseInProvider = (content: string) => {
    const providerUrl = PROVIDER_URLS[selectedModel.id];

    if (providerUrl) {
      // Copy to clipboard
      navigator.clipboard.writeText(content)
        .then(() => {
          // Open provider in new tab
          window.open(providerUrl, '_blank');
          toast.success(`Copied! Paste into ${selectedModel.name} (Cmd/Ctrl+V)`);
        })
        .catch(() => {
          toast.error("Failed to copy to clipboard");
        });
    } else {
      toast.error("Provider URL not available");
    }
  };


  const speakText = (text: string) => {
    return new Promise<void>((resolve) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get available voices and prefer a natural-sounding one
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  };

  const startContinuousListening = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        toast.error("Voice recognition not supported in this browser");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;

        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: transcript,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsRecording(false);
        setIsLoading(true);

        // Simulate AI response
        setTimeout(async () => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `I heard you say: "${transcript}". Here's my response to that.`,
            timestamp: new Date(),
            model: selectedModel.id
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);

          // Speak the response
          await speakText(assistantMessage.content);

          // Resume listening if still in voice mode
          if (isVoiceMode && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started
            }
          }
        }, 1500);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);

        if (event.error === 'no-speech') {
          // Silently restart in voice mode
          if (isVoiceMode) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                // Already started
              }
            }, 500);
          }
        } else if (event.error === 'not-allowed') {
          toast.error("Microphone access denied");
          setIsVoiceMode(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        // Auto-restart if still in voice mode and not speaking
        if (isVoiceMode && !isSpeaking) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              // Already started
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Error starting continuous listening:', error);
      toast.error("Failed to start voice mode");
      setIsVoiceMode(false);
    }
  };

  const stopContinuousListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsRecording(false);
    setIsSpeaking(false);
  };

  const toggleVoiceMode = () => {
    if (!isVoiceMode) {
      // Enable voice mode
      setIsVoiceMode(true);
      toast.success("🎙️ Voice conversation mode enabled");
      startContinuousListening();
    } else {
      // Disable voice mode
      setIsVoiceMode(false);
      stopContinuousListening();
      toast.info("Voice conversation mode disabled");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground relative overflow-hidden">

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleImageChange}
        accept="image/*"
      />




      {/* Executive Header */}
      <Starfield speed={0.5} density={1.2} />
      <header className="flex-none px-8 py-5 border-b border-border bg-background/60 backdrop-blur-2xl z-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-6 gap-4 bg-background/50 border-input hover:bg-accent/50 hover:border-accent-foreground/20 transition-all duration-500 text-foreground min-w-[280px] justify-between shadow-sm group backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/20 border border-primary/10 group-hover:bg-primary/10 transition-all duration-300">
                    <selectedModel.icon className="w-4 h-4 text-foreground/80" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-bold text-sm tracking-tight text-foreground">{selectedModel.name}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{selectedModel.provider}</span>
                  </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[340px] bg-background/95 border-border backdrop-blur-2xl text-foreground max-h-[520px] overflow-y-auto shadow-lg p-2">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-3 py-2">Text & Reasoning</DropdownMenuLabel>
              {AI_MODELS.filter(m => m.category === 'text').map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    toast.success(`Switched to ${model.name}`);
                  }}
                  className="flex items-center gap-4 p-4 cursor-pointer focus:bg-accent hover:bg-accent rounded-xl mx-1 my-1 transition-all duration-300 group"
                >
                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                    <model.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-sm font-bold text-foreground tracking-tight">{model.name}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                  {selectedModel.id === model.id && (
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-border my-2" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-3 py-2">Image Generation</DropdownMenuLabel>
              {AI_MODELS.filter(m => m.category === 'image').map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    toast.success(`Switched to ${model.name}`);
                  }}
                  className="flex items-center gap-4 p-4 cursor-pointer focus:bg-accent hover:bg-accent rounded-xl mx-1 my-1 transition-all duration-300 group"
                >
                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                    <model.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-sm font-bold text-foreground tracking-tight">{model.name}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                  {selectedModel.id === model.id && (
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-border my-2" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-3 py-2">Video Generation</DropdownMenuLabel>
              {AI_MODELS.filter(m => m.category === 'video').map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    toast.success(`Switched to ${model.name}`);
                  }}
                  className="flex items-center gap-4 p-4 cursor-pointer focus:bg-accent hover:bg-accent rounded-xl mx-1 my-1 transition-all duration-300 group"
                >
                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                    <model.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-sm font-bold text-foreground tracking-tight">{model.name}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                  {selectedModel.id === model.id && (
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-border my-2" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-3 py-2">Code Generation</DropdownMenuLabel>
              {AI_MODELS.filter(m => m.category === 'code').map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    toast.success(`Switched to ${model.name}`);
                  }}
                  className="flex items-center gap-4 p-4 cursor-pointer focus:bg-accent hover:bg-accent rounded-xl mx-1 my-1 transition-all duration-300 group"
                >
                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                    <model.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-sm font-bold text-foreground tracking-tight">{model.name}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                  {selectedModel.id === model.id && (
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-border my-2" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-3 py-2">Audio & Music</DropdownMenuLabel>
              {AI_MODELS.filter(m => m.category === 'audio').map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    toast.success(`Switched to ${model.name}`);
                  }}
                  className="flex items-center gap-4 p-4 cursor-pointer focus:bg-accent hover:bg-accent rounded-xl mx-1 my-1 transition-all duration-300 group"
                >
                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                    <model.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-sm font-bold text-foreground tracking-tight">{model.name}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                  {selectedModel.id === model.id && (
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Mode Indicator */}
          {isVoiceMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-xl">
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-xs font-semibold text-foreground">
                {isSpeaking ? '🔊 AI Speaking' : isRecording ? '🎤 Listening' : '⏸️ Waiting'}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-300"
            onClick={() => setShowHistory(true)}
            title="Chat History"
          >
            <History className="w-4.5 h-4.5" strokeWidth={2} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-xl transition-all duration-300 ${isVoiceMode
              ? 'text-primary-foreground bg-primary hover:bg-primary/90 border border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            onClick={toggleVoiceMode}
            title={isVoiceMode ? "Disable voice conversation" : "Enable voice conversation"}
          >
            {isVoiceMode ? <PhoneOff className="w-4.5 h-4.5" strokeWidth={2} /> : <Phone className="w-4.5 h-4.5" strokeWidth={2} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-300"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4.5 h-4.5" strokeWidth={2} />
          </Button>
        </div>
      </header>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Chat Settings</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure your chatbot preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Temperature</label>
              <input type="range" min="0" max="100" className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Max Tokens</label>
              <input type="number" placeholder="2000" className="w-full bg-input border border-input rounded-lg px-3 py-2" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Chat Area */}
      <div className="flex-1 overflow-hidden relative z-0">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="max-w-5xl mx-auto py-12 px-8 flex flex-col gap-10 pb-40">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-10">

                <div className="space-y-8 text-center max-w-4xl relative z-10 px-4">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground drop-shadow-sm selection:bg-primary/20 leading-tight">
                    Craft your ideas into the <br />
                    <span className="text-foreground/80 animate-pulse-subtle">
                      perfectly engineered prompt.
                    </span>
                  </h1>

                  <p className="text-lg md:text-xl text-muted-foreground/70 font-medium leading-relaxed max-w-2xl mx-auto">
                    Select a model, upload context, or start with a template to accelerate your workflow.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full max-w-3xl opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-forwards mx-auto px-4">
                  {[
                    { icon: Code, label: "Debug Python script", desc: "Fix errors & optimize performance" },
                    { icon: MessageSquare, label: "Draft email", desc: "Professional follow-up template" },
                    { icon: Brain, label: "Explain concept", desc: "Simplify quantum computing" },
                    { icon: Target, label: "Strategic Plan", desc: "Q3 marketing roadmap" }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(item.label)}
                      className="flex items-center gap-4 p-5 text-left rounded-2xl bg-muted/30 hover:bg-muted border border-transparent hover:border-border transition-all duration-200 group w-full"
                    >
                      <div className="p-3 rounded-xl bg-background border border-border shadow-sm group-hover:border-primary/20 transition-colors flex-shrink-0">
                        <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground/90 text-sm group-hover:text-primary transition-colors truncate">{item.label}</div>
                        <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 truncate">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-5 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-11 h-11 border border-border shadow-sm mt-1 bg-transparent rounded-xl">
                    <AvatarImage src="/promptx-logo.png" className="object-contain rounded-xl" />
                    <AvatarFallback className="bg-transparent rounded-xl">
                      <img src="/promptx-logo.png" alt="PromptX" className="w-full h-full object-contain rounded-xl" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`flex flex-col gap-2.5 max-w-[72%] group`}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-3 ml-1.5 mb-0.5">
                      <span className="text-[11px] text-muted-foreground font-bold tracking-wide">
                        PromptX
                      </span>
                      <div className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-[10px] text-muted-foreground/60 font-semibold tabular-nums">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  <div
                    className={`
                      relative px-7 py-5 rounded-[20px] text-[15px] leading-[1.7] shadow-sm backdrop-blur-xl
                      ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm shadow-md'
                        : 'bg-muted/50 text-foreground border border-border rounded-bl-sm'}
                    `}
                  >
                    {/* Gradient overlay for user messages only if desired, or simpler implementation */}
                    {message.role === 'user' && (
                      <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    )}

                    <p className="whitespace-pre-wrap relative z-10 font-medium tracking-tight">{message.content}</p>

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.attachments.map((file, i) => (
                          <Badge key={i} variant="secondary" className="bg-background/20 text-inherit text-xs">
                            {file}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-1 ml-1.5 transition-all duration-500">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-300"
                        onClick={() => handleCopyMessage(message.content)}
                      >
                        <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-300"
                        onClick={() => handleRegenerateMessage(message.id)}
                      >
                        <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-8 px-3 text-xs font-semibold text-primary hover:text-primary-foreground hover:bg-primary rounded-xl transition-all duration-300 gap-1.5"
                        onClick={() => handleUseInProvider(message.content)}
                        title={`Copy and open ${selectedModel.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                        Use in {selectedModel.name}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-300">
                            <MoreVertical className="w-3.5 h-3.5" strokeWidth={2} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border-border text-foreground">
                          <DropdownMenuItem onClick={() => handleCopyMessage(message.content)}>
                            Copy message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRegenerateMessage(message.id)}>
                            Regenerate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <Avatar className="w-11 h-11 border-2 border-border shadow-md mt-1">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserIcon className="w-5 h-5" strokeWidth={2.5} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-5 justify-start animate-in fade-in slide-in-from-bottom-6 duration-700">
                <Avatar className="w-11 h-11 border border-border shadow-sm mt-1 bg-transparent rounded-xl">
                  <AvatarImage src="/promptx-logo.png" className="object-contain rounded-xl" />
                  <AvatarFallback className="bg-transparent rounded-xl">
                    <img src="/promptx-logo.png" alt="PromptX" className="w-full h-full object-contain rounded-xl" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center justify-center pl-4 py-2">
                  <ChatbotLoader size={45} text="PromptX" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Executive Input Area */}
      <div className="flex-none p-8 pt-6 bg-gradient-to-t from-background via-background to-transparent z-10">
        {/* Attached Files Display */}
        {attachedFiles.length > 0 && (
          <div className="max-w-5xl mx-auto mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <Badge key={index} variant="secondary" className="bg-white/[0.06] text-white px-3 py-1.5 flex items-center gap-2">
                {file.name}
                <button onClick={() => removeAttachment(index)} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="max-w-5xl mx-auto relative bg-card border border-border rounded-[24px] shadow-lg overflow-hidden backdrop-blur-2xl ring-1 ring-border focus-within:ring-primary focus-within:border-primary focus-within:bg-card/80 transition-all duration-500">

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <Textarea
            ref={textareaRef}
            placeholder={isVoiceMode ? "Voice mode active - speak to chat..." : "Describe the prompt you want to create..."}
            className="w-full bg-transparent border-0 focus-visible:ring-0 px-8 py-6 min-h-[100px] max-h-[240px] resize-none text-[15px] text-foreground placeholder:text-muted-foreground scrollbar-thin scrollbar-thumb-border font-medium tracking-tight leading-relaxed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isVoiceMode}
          />

          <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-zinc-600 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-300"
                onClick={handleFileAttach}
                title="Attach file"
              >
                <Paperclip className="w-4.5 h-4.5" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-zinc-600 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-300"
                onClick={handleImageAttach}
                title="Attach image"
              >
                <ImageIcon className="w-4.5 h-4.5" strokeWidth={2} />
              </Button>
              <div className="w-px h-6 bg-white/[0.08] mx-1.5" />
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-xl transition-all duration-300 ${isRecording ? 'text-white bg-white/[0.12] hover:bg-white/[0.16] animate-pulse' : 'text-zinc-600 hover:text-white hover:bg-white/[0.06]'}`}
                onClick={toggleRecording}
                title={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isRecording ? <MicOff className="w-4.5 h-4.5" strokeWidth={2} /> : <Mic className="w-4.5 h-4.5" strokeWidth={2} />}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.15em] tabular-nums hidden sm:block">
                {input.length} / 2000
              </span>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
                className={`rounded-[14px] px-6 h-11 font-bold transition-all duration-500 shadow-xl text-sm tracking-tight ${input.trim()
                  ? 'bg-gradient-to-r from-white via-zinc-50 to-white text-black hover:from-zinc-100 hover:via-zinc-50 hover:to-zinc-100 shadow-white/25 hover:shadow-white/35 hover:scale-[1.02]'
                  : 'bg-white/[0.04] text-zinc-700 cursor-not-allowed shadow-none border border-white/[0.04]'
                  }`}
              >
                <Send className="w-4 h-4 mr-2.5" strokeWidth={2.5} />
                Send Message
              </Button>
            </div>
          </div>
        </div>
        <div className="text-center mt-5">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-wide">
            AI-generated content may contain inaccuracies. Please verify critical information.
          </p>
        </div>
      </div>

    </div>
  );
};

export default DashboardChatbot;
