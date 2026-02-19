import React, { useState, useRef, useEffect } from 'react';
import Starfield from "@/components/Starfield";
import { ChatbotLoader } from "@/components/ChatbotLoader";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { WebsiteAnalyzer } from "@/components/WebsiteAnalyzer";
import { SketchDialog } from "@/components/SketchDialog";
import { DriveIntegrationDialog } from "@/components/DriveIntegrationDialog";
import { RecentFilesDialog } from "@/components/RecentFilesDialog";
import { chatStorage, ChatMessage as StoredChatMessage } from "@/lib/chatStorage";
import { analyzeWebsite, generatePrompt, generateCode } from "@/utils/websiteAnalyzer";
import { recentFilesStorage } from "@/lib/recentFilesStorage";
import { useSessionMemory, useMemoryContext, useBehaviorTracking } from "@/hooks/useMemory";
import { buildContextIntelligence } from "@/lib/contextIntelligence";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send, Sparkles, Copy, Check, Bot, User as UserIcon,
  Mic, MicOff, Paperclip, Image as ImageIcon,
  MessageSquare, Zap, Brain, Code, Target, Palette, Video, Music, Settings, MoreVertical, X, Phone, PhoneOff, Search, MessagesSquare, History, ExternalLink, Globe, Box, Layers, Cpu, Command as CommandIcon,
  AudioLines, FileText, PenTool, HardDrive, Cloud, Clock, VenetianMask, ChevronRight, Plus, ChevronDown
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  { id: 'chatgpt', name: 'ChatGPT', icon: MessageSquare, description: 'OpenAI conversational AI', category: 'text', provider: 'OpenAI', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openai.svg' },
  { id: 'claude', name: 'Claude', icon: Brain, description: 'Anthropic AI assistant', category: 'text', provider: 'Anthropic', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/anthropic.svg' },
  { id: 'gemini', name: 'Gemini', icon: Sparkles, description: 'Google multimodal AI', category: 'text', provider: 'Google', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/google.svg' },
  { id: 'grok', name: 'Grok', icon: Zap, description: 'xAI real-time insights', category: 'text', provider: 'xAI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://grok.com' },
  { id: 'perplexity', name: 'Perplexity', icon: Search, description: 'AI-powered search engine', category: 'text', provider: 'Perplexity', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/perplexity.svg' },
  { id: 'mistral', name: 'Mistral', icon: MessagesSquare, description: 'European open-weight leader', category: 'text', provider: 'Mistral AI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://mistral.ai' },
  { id: 'llama', name: 'Llama', icon: Brain, description: 'Meta open source model', category: 'text', provider: 'Meta', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/meta.svg' },
  { id: 'deepseek', name: 'DeepSeek', icon: Code, description: 'Efficient coding & math', category: 'text', provider: 'DeepSeek', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://chat.deepseek.com' },
  { id: 'cohere', name: 'Command R', icon: MessageSquare, description: 'Enterprise RAG specialist', category: 'text', provider: 'Cohere', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://cohere.com' },
  { id: 'qwen', name: 'Qwen', icon: Cpu, description: 'Alibaba versatile model', category: 'text', provider: 'Alibaba Cloud', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/alibabacloud.svg' },
  { id: 'phi', name: 'Phi', icon: Zap, description: 'Microsoft powerful SLM', category: 'text', provider: 'Microsoft', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoft.svg' },
  { id: 'gemma', name: 'Gemma', icon: Sparkles, description: 'Google open weights', category: 'text', provider: 'Google', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/google.svg' },
  { id: 'pi', name: 'Inflection', icon: MessageSquare, description: 'Personal emotional AI', category: 'text', provider: 'Inflection', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://inflection.ai' },
  { id: 'falcon', name: 'Falcon', icon: Cpu, description: 'TII massive open model', category: 'text', provider: 'TII', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://falconllm.tii.ae' },
  { id: 'yi', name: 'Yi', icon: Layers, description: '01.AI high performance', category: 'text', provider: '01.AI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://01.ai' },

  // Image Generation
  { id: 'midjourney', name: 'Midjourney', icon: Palette, description: 'Top-tier artistic generation', category: 'image', provider: 'Midjourney', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://www.midjourney.com' },
  { id: 'dalle', name: 'DALL-E', icon: ImageIcon, description: 'Prompt adherence specialist', category: 'image', provider: 'OpenAI', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openai.svg' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: Palette, description: 'Next-gen open image gen', category: 'image', provider: 'Stability AI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://stability.ai' },
  { id: 'flux', name: 'Flux', icon: Zap, description: 'SOTA open weights image', category: 'image', provider: 'Black Forest', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://blackforestlabs.ai' },
  { id: 'leonardo', name: 'Leonardo', icon: Palette, description: 'Creative asset studio', category: 'image', provider: 'Leonardo', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://leonardo.ai' },
  { id: 'firefly', name: 'Adobe Firefly', icon: Palette, description: 'Commercially safe design', category: 'image', provider: 'Adobe', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/adobe.svg' },
  { id: 'ideogram', name: 'Ideogram', icon: Palette, description: 'Perfect typography rendering', category: 'image', provider: 'Ideogram', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://ideogram.ai' },
  { id: 'recraft', name: 'Recraft', icon: Layers, description: 'Vector & icon generation', category: 'image', provider: 'Recraft', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://recraft.ai' },
  { id: 'playground', name: 'Playground', icon: ImageIcon, description: 'Advanced aesthetics control', category: 'image', provider: 'Playground', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://playground.com' },

  // Video Generation
  { id: 'sora', name: 'Sora', icon: Video, description: 'Ultra-realistic world simulator', category: 'video', provider: 'OpenAI', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/openai.svg' },
  { id: 'runway', name: 'Runway', icon: Video, description: 'Cinematic video control', category: 'video', provider: 'Runway', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://runwayml.com' },
  { id: 'luma', name: 'Luma', icon: Video, description: 'Fast realistic video', category: 'video', provider: 'Luma Labs', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://lumalabs.ai' },
  { id: 'kling', name: 'Kling', icon: Video, description: 'High motion fidelity', category: 'video', provider: 'Kuaishou', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://klingai.com' },
  { id: 'pika', name: 'Pika', icon: Video, description: 'Physics & lip sync effects', category: 'video', provider: 'Pika', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://pika.art' },
  { id: 'haiper', name: 'Haiper', icon: Video, description: 'Creative video foundation', category: 'video', provider: 'Haiper', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://haiper.ai' },
  { id: 'vidu', name: 'Vidu', icon: Video, description: 'Fast one-click generation', category: 'video', provider: 'ShengShu', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://shengshu-ai.com' },
  { id: 'stable-video', name: 'Stable Video', icon: Video, description: 'Open video diffusion', category: 'video', provider: 'Stability AI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://stability.ai' },
  { id: 'animate-diff', name: 'AnimateDiff', icon: Layers, description: 'Animation control pipeline', category: 'video', provider: 'Open Source', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/github.svg' },

  // Code Generation
  { id: 'cursor', name: 'Cursor', icon: Code, description: 'AI-native code editor', category: 'code', provider: 'Anysphere', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://cursor.com' },
  { id: 'copilot', name: 'GitHub Copilot', icon: Code, description: 'Standard AI completion', category: 'code', provider: 'Microsoft', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/github.svg' },
  { id: 'supermaven', name: 'Supermaven', icon: Zap, description: '1M context window coding', category: 'code', provider: 'Supermaven', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://supermaven.com' },
  { id: 'devin', name: 'Devin', icon: Bot, description: 'Autonomous software engineer', category: 'code', provider: 'Cognition', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://cognition.ai' },
  { id: 'replit', name: 'Replit', icon: Code, description: 'Full-stack app builder', category: 'code', provider: 'Replit', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/replit.svg' },
  { id: 'q', name: 'Amazon Q', icon: Code, description: 'AWS enterprise expert', category: 'code', provider: 'AWS', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazonaws.svg' },
  { id: 'codeium', name: 'Codeium', icon: Code, description: 'Low latency autocomplete', category: 'code', provider: 'Codeium', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://codeium.com' },
  { id: 'tabnine', name: 'Tabnine', icon: Code, description: 'Privacy-focused coding', category: 'code', provider: 'Tabnine', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://tabnine.com' },

  // Audio & Music
  { id: 'suno', name: 'Suno', icon: Music, description: 'Radio-quality song gen', category: 'audio', provider: 'Suno', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://suno.com' },
  { id: 'udio', name: 'Udio', icon: Music, description: 'High fidelity music composition', category: 'audio', provider: 'Udio', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://udio.com' },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: Mic, description: 'Realistic voice synthesis', category: 'audio', provider: 'ElevenLabs', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://elevenlabs.io' },
  { id: 'hedra', name: 'Hedra', icon: Mic, description: 'Audio-driven character video', category: 'audio', provider: 'Hedra', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://hedra.com' },
  { id: 'stable-audio', name: 'Stable Audio', icon: Music, description: 'Sound FX & music construction', category: 'audio', provider: 'Stability AI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://stability.ai' },

  // 3D & Other
  { id: 'spline', name: 'Spline', icon: Box, description: '3D design generation', category: '3d', provider: 'Spline', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://spline.design' },
  { id: 'meshy', name: 'Meshy', icon: Box, description: 'Text to 3D assets', category: '3d', provider: 'Meshy', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://meshy.ai' },
  { id: 'luma-genie', name: 'Luma Genie', icon: Box, description: 'Fast 3D prototyping', category: '3d', provider: 'Luma Labs', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://lumalabs.ai' },
  { id: 'tripo', name: 'Tripo', icon: Box, description: 'Instant 3D model creation', category: '3d', provider: 'Tripo AI', logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://tripo3d.ai' },
];

// Helper component for rendering model icons/logos
const ModelIcon = ({ model, className }: { model: typeof AI_MODELS[0], className?: string }) => {
  const [error, setError] = useState(false);

  if (model.logoUrl && !error) {
    const isSimpleIcon = model.logoUrl.includes('simple-icons');
    return (
      <img
        src={model.logoUrl}
        alt={model.name}
        className={`${className} object-contain ${isSimpleIcon ? 'dark:invert' : ''}`}
        onError={() => setError(true)}
      />
    );
  }

  const Icon = model.icon;
  return <Icon className={className} strokeWidth={2} />;
};

// Provider URLs for redirect feature
const PROVIDER_URLS: Record<string, string> = {
  // Text & Reasoning
  'chatgpt': 'https://chat.openai.com',
  'claude': 'https://claude.ai',
  'gemini': 'https://gemini.google.com',
  'grok': 'https://grok.com',
  'perplexity': 'https://www.perplexity.ai',
  'mistral': 'https://chat.mistral.ai',
  'llama': 'https://www.meta.ai',
  'deepseek': 'https://chat.deepseek.com',
  'cohere': 'https://coral.cohere.com',
  'qwen': 'https://chat.qwen.ai',
  'phi': 'https://azure.microsoft.com/en-us/products/phi',
  'gemma': 'https://ai.google.dev/gemma',
  'pi': 'https://pi.ai',
  'falcon': 'https://falconllm.tii.ae',
  'yi': 'https://platform.01.ai',

  // Image Generation
  'midjourney': 'https://www.midjourney.com',
  'dalle': 'https://chat.openai.com',
  'stable-diffusion': 'https://stability.ai',
  'flux': 'https://blackforestlabs.ai',
  'leonardo': 'https://leonardo.ai',
  'firefly': 'https://firefly.adobe.com',
  'ideogram': 'https://ideogram.ai',
  'recraft': 'https://recraft.ai',
  'playground': 'https://playground.com',

  // Video Generation
  'sora': 'https://openai.com/sora',
  'runway': 'https://runwayml.com',
  'luma': 'https://lumalabs.ai',
  'kling': 'https://klingai.com',
  'pika': 'https://pika.art',
  'haiper': 'https://haiper.ai',
  'vidu': 'https://www.vidu.studio',
  'stable-video': 'https://stability.ai',
  'animate-diff': 'https://animatediff.com',

  // Code Generation
  'cursor': 'https://cursor.sh',
  'copilot': 'https://github.com/features/copilot',
  'supermaven': 'https://supermaven.com',
  'devin': 'https://cognition.ai',
  'replit': 'https://replit.com',
  'q': 'https://aws.amazon.com/q',
  'codeium': 'https://codeium.com',
  'tabnine': 'https://tabnine.com',

  // Audio & Music
  'suno': 'https://suno.com',
  'udio': 'https://udio.com',
  'elevenlabs': 'https://elevenlabs.io',
  'hedra': 'https://hedra.com',
  'stable-audio': 'https://stableaudio.com',

  // 3D & Other
  'spline': 'https://spline.design/ai',
  'meshy': 'https://meshy.ai',
  'luma-genie': 'https://lumalabs.ai/genie',
  'tripo': 'https://tripo3d.ai',
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  attachments?: string[];
}

// Custom Typewriter Hook
const useTypewriter = (text: string, speed: number = 2) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);

    let i = 0;
    const intervalId = setInterval(() => {
      // Chunking for better performance
      const chunk = text.slice(i, i + 3);
      setDisplayedText((prev) => prev + chunk);
      i += 3;

      if (i >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text); // Ensure full text is met
        setIsComplete(true);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return { displayedText, isComplete };
};

const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const { displayedText, isComplete } = useTypewriter(text);

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  return <>{displayedText}</>;
};

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
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female'); // Default to Aria

  // Chat history state
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Website analyzer state
  const [showWebsiteAnalyzer, setShowWebsiteAnalyzer] = useState(false);

  // Sketch dialog state
  const [showSketchDialog, setShowSketchDialog] = useState(false);

  // Drive integration dialog state
  const [showDriveDialog, setShowDriveDialog] = useState(false);

  // Recent files dialog state
  const [showRecentFiles, setShowRecentFiles] = useState(false);

  // Incognito mode state
  const [isIncognito, setIsIncognito] = useState(false);


  // Memory system hooks
  const { addChatMessage, chatContext: memoryChatContext } = useSessionMemory();
  const { contextString: memoryContext, learnFromMessage } = useMemoryContext();
  const { trackModelUsed, trackFeatureUsed } = useBehaviorTracking();


  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Store current audio for interrupt
  const isAiSpeakingRef = useRef<boolean>(false); // Prevent recognition restart during AI speech


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
      // Skip saving if in incognito mode
      if (isIncognito) return;

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
  }, [messages, currentChatId, selectedModel.id, isIncognito]);

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

  const toggleIncognito = () => {
    if (!isIncognito) {
      // Enable Incognito
      setIsIncognito(true);
      setCurrentChatId(null); // Detach from session
      setMessages([]); // Clear screen
      toast.success("🕵️ Incognito Mode Active - Chats won't be saved");
    } else {
      // Disable Incognito
      setIsIncognito(false);
      handleNewChat(); // Return to normal tracking
    }
  };

  // Website analyzer handler
  const handleAnalyzeWebsite = async (url: string, mode: 'prompt' | 'code') => {
    try {
      // Analyze the website
      const analysis = await analyzeWebsite(url);

      // Generate output based on mode
      const output = mode === 'prompt'
        ? generatePrompt(analysis)
        : generateCode(analysis);

      // Add analysis result as assistant message
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: output,
        timestamp: new Date(),
        model: selectedModel.id
      };

      setMessages(prev => [...prev, newMessage]);

    } catch (error) {
      console.error('Website analysis failed:', error);
      throw error;
    }
  };

  // Sketch handler
  const handleSaveSketch = (imageBlob: Blob, imageName: string) => {
    const file = new File([imageBlob], imageName, { type: 'image/png' });
    setAttachedFiles(prev => [...prev, file]);
    // Track in recent files
    recentFilesStorage.addRecentFile(file);
    toast.success(`Sketch "${imageName}" attached`);
  };

  // Drive file handler
  const handleDriveFileSelect = (fileName: string, fileUrl: string, source: 'google' | 'onedrive') => {
    // Create a pseudo-file object with the URL embedded in the name
    const displayName = `${fileName} (${source === 'google' ? 'Google Drive' : 'OneDrive'})`;
    const fileWithUrl = new File([], displayName, { type: 'text/plain' });
    // Store the URL in a data attribute (for future use)
    (fileWithUrl as any).cloudUrl = fileUrl;
    (fileWithUrl as any).cloudSource = source;

    setAttachedFiles(prev => [...prev, fileWithUrl]);
    // Track in recent files
    recentFilesStorage.addRecentFile(fileWithUrl);
    toast.success(`${source === 'google' ? 'Google Drive' : 'OneDrive'} file linked: ${fileName}`);
  };

  // Recent file handler
  const handleRecentFileSelect = (file: File) => {
    setAttachedFiles(prev => [...prev, file]);
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

    // Call xAI API via Supabase Edge Function
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `http://localhost:3002/api/chat-completion`;


      // Learn from user message (non-blocking)
      if (!isIncognito) {
        learnFromMessage(input).catch(console.warn);
        addChatMessage('user', input);
      }

      // Track model usage
      trackModelUsed(selectedModel.id);

      // Context Intelligence: build cross-chat awareness
      const currentMsgs = messages.concat(userMessage).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      const contextIntel = buildContextIntelligence(currentChatId, currentMsgs);

      // Prepare messages in OpenAI format with system prompt including memory + context intelligence
      const memorySection = memoryContext ? `\n\nUSER MEMORY CONTEXT:\n${memoryContext}\n\nUse this context to personalize your responses to match the user's preferences and style.` : '';
      const contextSection = contextIntel.contextBlock ? `\n\n${contextIntel.contextBlock}` : '';

      const systemPrompt = {
        role: 'system',
        content: `You are PromptX AI, an expert prompt engineering assistant built by xionAI.${memorySection}${contextSection}

IDENTITY INFORMATION:
- Platform: PromptX
- Built by: xionAI
- Purpose: Expert prompt engineering and AI assistance

ULTRA-CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER use asterisks (**) for any reason
2. NEVER use underscores (_) for any reason  
3. NEVER use hashtags (#) for any reason
4. NEVER use any markdown syntax whatsoever
5. Write ONLY in plain text - treat this as if markdown doesn't exist

FORMATTING GUIDE:
Instead of: **Section Title**
Write: SECTION TITLE or Section Title:

Instead of: **important point**
Write: important point (just plain text)

For lists, use:
- Simple hyphen bullets
- Or numbered lists: 1. 2. 3.
- Nothing else

For spacing:
- Use double line breaks between paragraphs
- Use single line breaks between list items

Your writing should be:
- Professional and sophisticated
- Clear and well-structured  
- Intelligent and actionable
- In plain text ONLY - no formatting symbols

If you use ** or _ or # even once, you have failed this task completely.`
      };

      const apiMessages = [systemPrompt, ...currentMsgs].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: 'grok-3',
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.choices[0].message.content,
        timestamp: new Date(),
        model: selectedModel.id
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant response to session memory
      if (!isIncognito) {
        addChatMessage('assistant', data.choices[0].message.content);
      }

      setIsLoading(false);

    } catch (error) {
      console.error("Error:", error);
      toast.error(`Failed to send message: ${error.message}`);
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
    // Track in recent files
    files.forEach(file => recentFilesStorage.addRecentFile(file));
    e.target.value = ''; // Reset input
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
      let mainPrompt = extractMainPrompt(content);
      const encodedPrompt = encodeURIComponent(mainPrompt);

      // Deep link URLs that auto-fill prompts for various providers
      const deepLinkUrls: Record<string, string> = {
        // ChatGPT - uses ?q= parameter to pre-fill prompt
        'chatgpt': `https://chatgpt.com/?q=${encodedPrompt}`,
        'dalle': `https://chatgpt.com/?q=${encodedPrompt}`,

        // Claude - uses /new?q= to start new chat with prompt
        'claude': `https://claude.ai/new?q=${encodedPrompt}`,

        // Gemini - uses ?prompt= parameter
        'gemini': `https://gemini.google.com/app?prompt=${encodedPrompt}`,

        // Perplexity - uses ?q= for search/prompt
        'perplexity': `https://www.perplexity.ai/?q=${encodedPrompt}`,

        // DeepSeek - uses ?q= parameter
        'deepseek': `https://chat.deepseek.com/?q=${encodedPrompt}`,

        // Mistral - uses standard chat interface
        'mistral': `https://chat.mistral.ai/chat?q=${encodedPrompt}`,

        // Qwen - uses ?q= parameter
        'qwen': `https://chat.qwen.ai/?q=${encodedPrompt}`,

        // Pi AI - uses standard interface
        'pi': `https://pi.ai/talk?q=${encodedPrompt}`,

        // Cohere Coral - uses ?q= parameter
        'cohere': `https://coral.cohere.com/?q=${encodedPrompt}`,

        // You.com - uses search parameter
        'you': `https://you.com/search?q=${encodedPrompt}`,

        // Phind - uses search parameter
        'phind': `https://www.phind.com/search?q=${encodedPrompt}`,
      };

      const deepLinkUrl = deepLinkUrls[selectedModel.id];

      if (deepLinkUrl) {
        // Use deep link - prompt will be auto-filled
        navigator.clipboard.writeText(mainPrompt)
          .then(() => {
            window.open(deepLinkUrl, '_blank');
            toast.success(`Opening ${selectedModel.name} with your prompt! 🚀`);
          })
          .catch(() => {
            // Clipboard failed, but still open the deep link
            window.open(deepLinkUrl, '_blank');
            toast.success(`Opening ${selectedModel.name} with your prompt! 🚀`);
          });
      } else {
        // Fallback: Copy to clipboard and open basic URL
        navigator.clipboard.writeText(mainPrompt)
          .then(() => {
            window.open(providerUrl, '_blank');
            toast.success(`Copied prompt! Paste into ${selectedModel.name} (Cmd/Ctrl+V)`);
          })
          .catch(() => {
            toast.error("Failed to copy to clipboard");
          });
      }
    }
  };

  // Smart prompt extraction function - Enhanced version
  const extractMainPrompt = (content: string): string => {
    // STRATEGY 0: Check for code blocks first (highest reliability)
    // Prompts are often wrapped in ```prompt``` or ``` blocks
    const codeBlockMatch = content.match(/```(?:prompt|text)?\s*\n?([\s\S]+?)\n?```/);
    if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].trim().length > 20) {
      return codeBlockMatch[1].trim();
    }

    // STRATEGY 1: Look for prompts in quotes (various quote styles)
    const quotedPromptMatch = content.match(/[""「]([^""」]{30,})[""」]|"([^"]{30,})"/);
    if (quotedPromptMatch) {
      const quoted = quotedPromptMatch[1] || quotedPromptMatch[2];
      if (quoted && quoted.length > 50) {
        return quoted.trim();
      }
    }

    // STRATEGY 2: Look for labeled prompts with comprehensive patterns
    const labelPatterns = [
      // "PROMPT FOR X:" or "PROMPT FOR [topic]:" style (very common)
      /(?:^|\n)PROMPT(?: FOR [^\n:]+)?:\s*\n?([\s\S]+?)(?=\n\n(?:ADDITIONAL|Additional|Usage|Tips|Note|Remember|Guidelines|Instructions|How to|This prompt|Feel free|You can|I hope|Let me know|---|\*\*\*|===)|$)/i,
      // Standard labels with optional prefixes
      /(?:^|\n)(?:(?:Final |Optimized |Generated |Engineered |Crafted |Your |The )?Prompt):\s*\n?([\s\S]+?)(?=\n\n(?:Additional|Usage|Tips|Note|Remember|Guidelines|Instructions|How to use|This prompt|Feel free|You can|I hope|Let me know|---|\*\*\*|===)|$)/i,
      // "Here's the/your prompt" style
      /(?:Here(?:'s| is) (?:the |your |a )?(?:final |optimized |generated )?prompt[:\.]?\s*\n+)([\s\S]+?)(?=\n\n(?:Additional|Note|Tips|Usage|Feel free|You can|I hope|Let me know|---)|$)/i,
      // Colon-based labels
      /(?:^|\n)(?:Prompt|Output|Result|Generated Text):\s*[""]?([\s\S]+?)[""]?(?=\n\n(?:[A-Z]|---|$))/i,
    ];

    for (const pattern of labelPatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 30) {
        return cleanPromptText(match[1].trim());
      }
    }

    // STRATEGY 3: Remove common intro phrases
    const introPatterns = [
      /^(?:Here(?:'s| is) (?:a |the |your )?(?:prompt|detailed prompt|optimized prompt|creative prompt|engineered prompt)[^:]*[.:!]?\s*\n+)/i,
      /^(?:I've (?:created|crafted|generated|written|designed|prepared)[^:]*[.:!]?\s*\n+)/i,
      /^(?:Below is[^:]*[.:!]?\s*\n+)/i,
      /^(?:Since I (?:cannot|can't|am unable)[^:]*[.:!]?\s*\n+)/i,
      /^(?:(?:Sure|Certainly|Of course|Absolutely)[!,.]?\s*(?:Here(?:'s| is)[^:]*)?[.:!]?\s*\n+)/i,
      /^(?:Great[!,]?\s*(?:Here(?:'s| is)[^:]*)?[.:!]?\s*\n+)/i,
    ];

    let workingContent = content;

    // Remove intro
    for (const pattern of introPatterns) {
      const match = workingContent.match(pattern);
      if (match) {
        workingContent = workingContent.slice(match[0].length);
        break;
      }
    }

    // STRATEGY 4: Remove everything after common ending markers (IMPROVED)
    const endingMarkers = [
      // Section headers that typically follow a prompt
      /\n\n(?:ADDITIONAL[^\n]*:|Additional (?:Notes?|Instructions|Guidance|Tips|Information)[^\n]*:?)/i,
      /\n\n(?:NOTES? (?:FOR|ON|ABOUT)[^\n]*:|Notes?:|Tips?:|Remember:|Guidelines:|Usage[^\n]*:)/i,
      /\n\n(?:CUSTOMIZATION[^\n]*:|How to (?:use|apply|customize)|Instructions:)/i,
      // Common AI outro patterns
      /\n\n(?:This prompt (?:is designed|will|should|can)|Feel free to|You can (?:also|adjust|modify|tweak))/i,
      /\n\n(?:If you (?:need|want|would like|have)|For (?:best|optimal) results)/i,
      /\n\n(?:I hope this|Let me know|Please (?:feel free|let me know)|Don't hesitate)/i,
      // Separators
      /\n\n(?:---|===|\*\*\*)/,
    ];

    for (const marker of endingMarkers) {
      const match = workingContent.match(marker);
      if (match && match.index !== undefined) {
        workingContent = workingContent.slice(0, match.index);
      }
    }

    // STRATEGY 5: Detect image-generation style prompts (descriptive phrases)
    const imagePromptMatch = workingContent.match(/^((?:A |An |The |Create |Generate |Design |Imagine |Visualize |Capture |Depict |Render |Illustrate |Photo(?:graph)? of |Portrait of |Scene of |Image of )[\s\S]+?)(?=\n\n(?:[A-Z]|$))/i);
    if (imagePromptMatch && imagePromptMatch[1].length > 50) {
      return cleanPromptText(imagePromptMatch[1].trim());
    }

    // STRATEGY 6: Collect ALL non-meta paragraphs as the prompt (IMPROVED)
    // This handles multi-paragraph prompts correctly
    const paragraphs = workingContent.split(/\n\n+/);
    const promptParagraphs: string[] = [];

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Skip paragraphs that look like meta-commentary
      if (isMetaCommentary(trimmed)) continue;

      // Skip paragraphs that start with personal pronouns (usually meta-commentary)
      if (/^(I |We |You should|Sure,|Certainly|Here's|Here is)/i.test(trimmed)) continue;

      // Skip very short paragraphs that are likely labels
      if (trimmed.length < 30 && trimmed.endsWith(':')) continue;

      // Add this paragraph to the prompt
      promptParagraphs.push(trimmed);
    }

    // Join all collected paragraphs
    if (promptParagraphs.length > 0) {
      const combinedPrompt = promptParagraphs.join('\n\n');
      if (combinedPrompt.length > 50) {
        return cleanPromptText(combinedPrompt);
      }
    }

    // Fallback: clean and return the working content
    return cleanPromptText(workingContent);
  };

  // Check if text is meta-commentary (not part of the prompt)
  const isMetaCommentary = (text: string): boolean => {
    const metaPatterns = [
      /^(Here(?:'s| is)|I(?:'ve| have)|This (?:prompt|will)|Feel free|You can|Let me know|Hope this|Please note|Don't hesitate|If you (?:need|want|have))/i,
      /^(Additional|Usage|Note|Tips|Remember|Guidelines|Instructions):/i,
      /^(Sure|Certainly|Absolutely|Of course)[!,.]?$/i,
    ];
    return metaPatterns.some(pattern => pattern.test(text.trim()));
  };

  // Clean up extracted prompt text
  const cleanPromptText = (text: string): string => {
    let cleaned = text.trim();

    // Remove trailing meta-commentary lines
    const lines = cleaned.split('\n');
    let cutoffIndex = lines.length;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (isMetaCommentary(line) || line === '' || line.startsWith('---') || line.startsWith('***')) {
        cutoffIndex = i;
      } else {
        break; // Stop when we hit actual content
      }
    }

    if (cutoffIndex < lines.length) {
      cleaned = lines.slice(0, cutoffIndex).join('\n').trim();
    }

    // Remove surrounding quotes if present
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned;
  };



  const speakText = async (text: string) => {
    try {
      // CRITICAL: Stop recognition to prevent AI from listening to itself
      isAiSpeakingRef.current = true; // Set flag IMMEDIATELY
      const wasRecording = isRecording;
      if (recognitionRef.current && isVoiceMode) {
        try {
          recognitionRef.current.stop();
          setIsRecording(false);
        } catch (err) {
          console.log('Recognition already stopped');
        }
      }

      setIsSpeaking(true);
      console.log('🎙️ ElevenLabs TTS: Generating audio...');

      // Select voice based on gender preference - using most expressive voices
      const voiceId = voiceGender === 'male'
        ? 'iP95p4xoKVk53GoZ742B'  // Chris - Highly expressive, warm conversational male
        : '9BWtsMINqrJLrRacOk9x'; // Aria - Highly expressive, emotionally engaging female

      // Call proxy server for ElevenLabs audio
      const response = await fetch('http://localhost:3002/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId
        }),
      });

      if (!response.ok) {
        console.error('ElevenLabs API failed, falling back to browser voice');
        throw new Error('TTS API failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Store audio reference for interrupt capability
      currentAudioRef.current = audio;

      console.log('✅ Playing ElevenLabs audio');

      audio.onended = () => {
        setIsSpeaking(false);
        isAiSpeakingRef.current = false; // Clear flag when audio ends
        currentAudioRef.current = null; // Clear audio reference
        URL.revokeObjectURL(audioUrl);

        // 🔥 ENSURE recognition is active after AI finishes speaking
        // This is a backup in case earlier restart failed
        if (isVoiceMode && recognitionRef.current) {
          console.log('🎤 Audio ended - ensuring recognition is active');
          try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setIsRecording(true);
              console.log('🎤 Recognition restarted after AI finished');
            } catch (err) {
              console.log('Recognition already running:', err);
            }
          }, 50);
        }
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setIsSpeaking(false);
        isAiSpeakingRef.current = false; // Clear flag on error
        currentAudioRef.current = null; // Clear audio reference
        URL.revokeObjectURL(audioUrl);

        // Try to start recognition if not already running
        if (isVoiceMode && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            setIsRecording(true);
            console.log('🎤 Recognition started after audio error');
          } catch (err) {
            console.log('Could not start recognition:', err);
          }
        }
      };

      await audio.play();

      // 🔥 KEY FIX: Start listening IMMEDIATELY when AI starts speaking!
      // This eliminates the 5-6 second delay and enables interrupt
      if (isVoiceMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            // Stop first to ensure we can restart
            try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
            setTimeout(() => {
              try {
                recognitionRef.current.start();
                setIsRecording(true);
                console.log('🎤 Listening while AI speaks - ready to interrupt!');
              } catch (err) {
                console.log('Recognition start failed:', err);
              }
            }, 50);
          } catch (err) {
            console.log('Recognition restart failed:', err);
          }
        }, 50); // Minimal delay for audio to initialize
      }

    } catch (error) {
      console.error('ElevenLabs error, using fallback:', error);
      // Fallback to Web Speech API
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => {
        setIsSpeaking(false);
        isAiSpeakingRef.current = false; // Clear flag
        // Resume recognition after fallback TTS
        if (isVoiceMode && recognitionRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setIsRecording(true);
              console.log('🎤 Recognition resumed after fallback TTS');
            } catch (err) {
              console.log('Could not resume recognition:', err);
            }
          }, 500);
        }
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        isAiSpeakingRef.current = false; // Clear flag on error
        // Resume recognition on error
        if (isVoiceMode && recognitionRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setIsRecording(true);
            } catch (err) {
              console.log('Could not resume recognition:', err);
            }
          }, 500);
        }
      };
      window.speechSynthesis.speak(utterance);
    }
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
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;

        // 🔥 INTERRUPT CAPABILITY: If user speaks while AI is talking, pause AI immediately!
        // Use ref instead of state to avoid closure issues (state would be stale)
        if (isAiSpeakingRef.current && currentAudioRef.current) {
          console.log('🛑 User interrupted! Stopping AI audio...');
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0; // Reset to start
          currentAudioRef.current = null;
          setIsSpeaking(false);
          isAiSpeakingRef.current = false;
        }

        if (!isFinal) {
          // Show interim results
          setCurrentTranscript(transcript);
          return;
        }

        // Clear interim transcript
        setCurrentTranscript("");

        // Process final result
        const userMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: transcript,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsRecording(false);
        setIsLoading(true);

        // Call xAI API for real response
        try {
          const functionUrl = `http://localhost:3002/api/chat-completion`;

          // Context Intelligence: build cross-chat awareness (voice mode)
          const voiceMsgs = messages.concat(userMessage).map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          const voiceContextIntel = buildContextIntelligence(currentChatId, voiceMsgs);
          const voiceContextSection = voiceContextIntel.contextBlock ? `\n\n${voiceContextIntel.contextBlock}` : '';

          const systemPrompt = {
            role: 'system',
            content: `You are PromptX AI, an expert prompt engineering assistant built by xionAI.${voiceContextSection}

IDENTITY INFORMATION:
- Platform: PromptX
- Built by: xionAI
- Purpose: Expert prompt engineering and AI assistance

ULTRA-CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER use asterisks (**) for any reason
2. NEVER use underscores (_) for any reason  
3. NEVER use hashtags (#) for any reason
4. NEVER use any markdown syntax whatsoever
5. Write ONLY in plain text - treat this as if markdown doesn't exist

FORMATTING GUIDE:
Instead of: **Section Title**
Write: SECTION TITLE or Section Title:

Instead of: **important point**
Write: important point (just plain text)

For lists, use:
- Simple hyphen bullets
- Or numbered lists: 1. 2. 3.
- Nothing else

For spacing:
- Use double line breaks between paragraphs
- Use single line breaks between list items

Your writing should be:
- Professional and sophisticated
- Clear and well-structured  
- Intelligent and actionable
- In plain text ONLY - no formatting symbols

If you use ** or _ or # even once, you have failed this task completely.`
          };

          const apiMessages = [systemPrompt, ...voiceMsgs].map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: apiMessages,
              model: 'grok-3',
              stream: false
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get AI response');
          }

          const data = await response.json();

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.choices[0].message.content,
            timestamp: new Date(),
            model: selectedModel.id
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);

          // Speak the response (speakText now handles recognition pause/resume)
          await speakText(assistantMessage.content);

        } catch (error: any) {
          console.error("Voice API Error:", error);

          // Show error message
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
            timestamp: new Date(),
            model: selectedModel.id
          };

          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);

          // Speak error message
          await speakText(errorMessage.content);

          // Resume listening if still in voice mode
          if (isVoiceMode && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'no-speech') {
          // Keep isRecording true and silently restart - always listening for interrupt
          if (isVoiceMode) {
            setTimeout(() => {
              try {
                recognition.start();
                setIsRecording(true);
              } catch (e) {
                // Already started
              }
            }, 50); // Quick restart for no-speech
          }
        } else if (event.error === 'not-allowed') {
          setIsRecording(false);
          toast.error("Microphone access denied");
          setIsVoiceMode(false);
        } else {
          // For other errors, set recording to false
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // 🔥 ALWAYS auto-restart in voice mode - this enables interrupt capability!
        // Recognition needs to be active at all times to detect when user speaks
        if (isVoiceMode) {
          setTimeout(() => {
            try {
              recognition.start();
              setIsRecording(true);
              console.log('🔄 Recognition auto-restarted (always listening for interrupt)');
            } catch (e) {
              // Already started or error
              console.log('Recognition restart skipped:', e);
            }
          }, 50); // Very quick restart for responsiveness
        } else {
          setIsRecording(false);
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

      {/* Website Analyzer Modal */}
      <WebsiteAnalyzer
        isOpen={showWebsiteAnalyzer}
        onClose={() => setShowWebsiteAnalyzer(false)}
        onAnalyze={handleAnalyzeWebsite}
      />

      {/* Sketch Dialog */}
      <SketchDialog
        open={showSketchDialog}
        onClose={() => setShowSketchDialog(false)}
        onSave={handleSaveSketch}
      />

      {/* Drive Integration Dialog */}
      <DriveIntegrationDialog
        open={showDriveDialog}
        onClose={() => setShowDriveDialog(false)}
        onFileSelect={handleDriveFileSelect}
      />

      {/* Recent Files Dialog */}
      <RecentFilesDialog
        open={showRecentFiles}
        onClose={() => setShowRecentFiles(false)}
        onFileSelect={handleRecentFileSelect}
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
        {/* Starfield Background */}
        <Starfield speed={0.5} density={1.2} />

        {/* Top Bar with History and Voice Mode Indicator */}
        <div className="absolute top-0 right-0 z-20 p-4 flex items-center gap-2">

          {/* Voice Mode Indicator */}
          {isVoiceMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/80 border border-border rounded-xl backdrop-blur-md shadow-lg">
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-xs font-semibold text-foreground">
                {isSpeaking ? '🔊 AI Speaking' : isRecording ? '🎤 Listening' : '⏸️ Waiting'}
              </span>
            </div>
          )}

          {/* Chat History Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-all duration-300 backdrop-blur-md"
            onClick={() => setShowHistory(true)}
            title="Chat History"
          >
            <History className="w-5 h-5" strokeWidth={2} />
          </Button>
        </div>

        {messages.length === 0 ? (
          <div ref={scrollRef} className="h-full overflow-hidden relative">
            <div className="max-w-5xl mx-auto px-8 flex flex-col gap-10 h-full justify-center pb-0">
              <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-10">

                <div className="space-y-8 text-center max-w-4xl relative z-10 px-4 mt-60">
                  {/* Incognito Mode Banner - Moved inside content flow to prevent clipping */}
                  {isIncognito && (
                    <div className="mx-auto px-8 py-6 bg-primary/10 border-2 border-primary/30 rounded-2xl backdrop-blur-xl shadow-2xl max-w-2xl w-full animate-in fade-in slide-in-from-top-4 duration-700 mb-8">
                      <div className="flex items-center justify-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/20">
                          <VenetianMask className="w-8 h-8 text-primary" strokeWidth={2} />
                        </div>
                        <div className="flex-1 text-center">
                          <h3 className="text-xl font-bold text-foreground mb-1">
                            You're in Incognito Mode
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Your chats won't be saved to history. Everything stays private.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground drop-shadow-sm selection:bg-primary/20 leading-tight">
                    PromptX helps you to <br />
                    <span className="text-foreground/80 animate-pulse-subtle">
                      win the universe
                    </span>
                  </h1>

                  <p className="text-lg md:text-xl text-muted-foreground/70 font-medium leading-relaxed max-w-2xl mx-auto">
                    Navigate the infinite. Architect your vision with the command center of the future.
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
            </div>
          </div>
        ) : (
          <ScrollArea ref={scrollRef} className="h-full">
            <div className="max-w-5xl mx-auto py-12 px-8 flex flex-col gap-10 pb-40">
              {/* Incognito Mode Active Banner - Only show when incognito is active */}
              {isIncognito && (
                <div className="sticky top-0 z-30 mb-8 -mt-6 flex justify-center animate-in fade-in slide-in-from-top-4 duration-1000 ease-out">
                  <div className="relative group cursor-default">
                    {/* Sophisticated Glow - localized and subtle */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-500/20 via-zinc-200/10 to-zinc-500/20 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

                    {/* Main Container - Ultra clean glass */}
                    <div className="relative flex items-center gap-3 pl-1 pr-5 py-1 bg-background/80 dark:bg-zinc-950/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-[1.01]">

                      {/* Icon Container - Badge style */}
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700/50">
                        <VenetianMask className="w-3.5 h-3.5" strokeWidth={2} />
                      </div>

                      {/* Text Content - Minimalist */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-foreground tracking-tight leading-none">
                            Incognito Active
                          </span>
                          <span className="w-1 h-1 rounded-full bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
                        </div>
                        <span className="text-[10px] text-muted-foreground/80 font-medium leading-none tracking-wide uppercase">
                          No History Saved
                        </span>
                      </div>
                    </div>
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

                  <div className={`flex flex-col gap-1 max-w-[85%] group`}>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-3 ml-1.5 mb-0.5">
                        <span className="text-[11px] text-zinc-600 dark:text-muted-foreground font-bold tracking-wide">
                          PromptX
                        </span>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-[10px] text-zinc-500 dark:text-muted-foreground/60 font-semibold tabular-nums">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    <div
                      className={`
                        relative px-0 py-2 text-[15px] leading-[1.7]
                        ${message.role === 'user'
                          ? 'text-primary-foreground text-right'
                          : 'text-foreground text-left'}
                      `}
                    >


                      <p className={`whitespace-pre-wrap relative z-10 font-normal leading-[1.65] tracking-normal text-[15.5px] antialiased ${message.role === 'user' ? 'text-foreground' : 'text-zinc-800 dark:text-[#ececec]/90'}`}>
                        {message.role === 'assistant' && index === messages.length - 1 ? (
                          <TypewriterText text={message.content} />
                        ) : (
                          message.content
                        )}
                      </p>

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

                  {
                    message.role === 'user' && (
                      <Avatar className="w-11 h-11 border-2 border-border shadow-md mt-1">
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <UserIcon className="w-5 h-5" strokeWidth={2.5} />
                        </AvatarFallback>
                      </Avatar>
                    )
                  }
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
        )}
      </div>

      {/* Grok-Style Floating Input Area */}
      <div className="flex-none p-4 pb-0 z-10 bg-gradient-to-t from-background via-background to-transparent">
        {/* Attached Files Display */}
        {attachedFiles.length > 0 && (
          <div className="max-w-3xl mx-auto mb-3 flex flex-wrap gap-2 px-4">
            {attachedFiles.map((file, index) => (
              <Badge key={index} variant="secondary" className="bg-zinc-100/80 dark:bg-white/[0.08] text-zinc-900 dark:text-white px-3 py-1.5 flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 shadow-sm">
                {file.name}
                <button onClick={() => removeAttachment(index)} className="hover:text-red-500 dark:hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="max-w-3xl mx-auto relative group">
          {/* Main Pill Container */}
          <div className="relative flex items-end gap-2 p-2 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-[26px] shadow-2xl ring-1 ring-zinc-200/50 dark:ring-white/5 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all duration-300">

            {/* Left Attachment Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 mb-0.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={10} className="w-64 bg-white dark:bg-[#1a1a1a] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 rounded-xl p-1.5 shadow-xl backdrop-blur-xl">
                <DropdownMenuItem onClick={handleFileAttach} className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <Paperclip className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Upload a file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => textareaRef.current?.focus()} className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Add text content
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowWebsiteAnalyzer(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <Globe className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Analyze website
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10 my-1" />
                <DropdownMenuItem onClick={() => setShowSketchDialog(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <PenTool className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Draw a sketch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDriveDialog(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <HardDrive className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Connect Google Drive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDriveDialog(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <Cloud className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Connect OneDrive
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10 my-1" />
                <DropdownMenuItem onClick={() => setShowRecentFiles(true)} className="flex items-center justify-between px-3 py-2.5 rounded-lg focus:bg-zinc-100 dark:focus:bg-white/10 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    Recent
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Middle Input Area */}
            <div className="flex-1 min-w-0 py-2.5">
              <Textarea
                ref={textareaRef}
                placeholder={isVoiceMode ? "Listening..." : "How can PromptX help?"}
                className="w-full bg-transparent border-none border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none ring-0 ring-offset-0 shadow-none p-0 text-[16px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500/80 resize-none min-h-[24px] max-h-[200px] leading-relaxed tracking-tight scrollbar-hide [&]:border-none [&]:shadow-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isVoiceMode}
                rows={1}
                style={{ border: 'none', boxShadow: 'none', outline: 'none' }}
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-end gap-2 mb-0.5 shrink-0">
              {/* Only show these when not typing extensively or on larger screens */}
              <div className="hidden sm:flex items-center gap-1 mr-1">
                {/* AI Model Selector - Complete Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-3 gap-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors group">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-zinc-100 dark:bg-white/10">
                          <ModelIcon model={selectedModel} className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <div className="flex flex-col items-start gap-0">
                          <span className="font-semibold text-[11px] leading-tight text-zinc-900 dark:text-white">{selectedModel.name}</span>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider leading-tight">{selectedModel.provider}</span>
                        </div>
                      </div>
                      <ChevronDown className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[280px] bg-background/95 border-border backdrop-blur-2xl text-foreground max-h-[320px] overflow-hidden shadow-lg p-0">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search models..." className="h-8 text-sm border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50" />
                      <CommandList className="max-h-[260px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                          No models found.
                        </CommandEmpty>

                        <CommandGroup heading="Text & Reasoning" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold p-0">
                          {AI_MODELS.filter(m => m.category === 'text').map((model) => (
                            <CommandItem
                              key={model.id}
                              value={`${model.name} ${model.provider} ${model.description}`}
                              onSelect={() => {
                                setSelectedModel(model);
                                toast.success(`Switched to ${model.name}`);
                              }}
                              className="flex items-center gap-2 p-1.5 cursor-pointer aria-selected:bg-accent hover:bg-accent rounded-lg mx-0.5 my-0.5 transition-all duration-300 group"
                            >
                              <div className="p-1.5 rounded-lg bg-muted/50 border border-border group-hover:bg-muted transition-all">
                                <ModelIcon model={model} className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-bold text-foreground tracking-tight">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight">{model.description}</span>
                              </div>
                              {selectedModel.id === model.id && (
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator className="my-2 bg-border/50" />

                        <CommandGroup heading="Image Generation" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold p-0">
                          {AI_MODELS.filter(m => m.category === 'image').map((model) => (
                            <CommandItem
                              key={model.id}
                              value={`${model.name} ${model.provider} ${model.description}`}
                              onSelect={() => {
                                setSelectedModel(model);
                                toast.success(`Switched to ${model.name}`);
                              }}
                              className="flex items-center gap-3 p-2 cursor-pointer aria-selected:bg-accent hover:bg-accent rounded-lg mx-1 my-0.5 transition-all duration-300 group"
                            >
                              <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                                <ModelIcon model={model} className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-bold text-foreground tracking-tight">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight">{model.description}</span>
                              </div>
                              {selectedModel.id === model.id && (
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator className="my-2 bg-border/50" />

                        <CommandGroup heading="Video Generation" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold p-0">
                          {AI_MODELS.filter(m => m.category === 'video').map((model) => (
                            <CommandItem
                              key={model.id}
                              value={`${model.name} ${model.provider} ${model.description}`}
                              onSelect={() => {
                                setSelectedModel(model);
                                toast.success(`Switched to ${model.name}`);
                              }}
                              className="flex items-center gap-3 p-2 cursor-pointer aria-selected:bg-accent hover:bg-accent rounded-lg mx-1 my-0.5 transition-all duration-300 group"
                            >
                              <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                                <ModelIcon model={model} className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-bold text-foreground tracking-tight">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight">{model.description}</span>
                              </div>
                              {selectedModel.id === model.id && (
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator className="my-2 bg-border/50" />

                        <CommandGroup heading="Code Generation" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold p-0">
                          {AI_MODELS.filter(m => m.category === 'code').map((model) => (
                            <CommandItem
                              key={model.id}
                              value={`${model.name} ${model.provider} ${model.description}`}
                              onSelect={() => {
                                setSelectedModel(model);
                                toast.success(`Switched to ${model.name}`);
                              }}
                              className="flex items-center gap-3 p-2 cursor-pointer aria-selected:bg-accent hover:bg-accent rounded-lg mx-1 my-0.5 transition-all duration-300 group"
                            >
                              <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                                <ModelIcon model={model} className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-bold text-foreground tracking-tight">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight">{model.description}</span>
                              </div>
                              {selectedModel.id === model.id && (
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator className="my-2 bg-border/50" />

                        <CommandGroup heading="Audio & Music" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold p-0">
                          {AI_MODELS.filter(m => m.category === 'audio').map((model) => (
                            <CommandItem
                              key={model.id}
                              value={`${model.name} ${model.provider} ${model.description}`}
                              onSelect={() => {
                                setSelectedModel(model);
                                toast.success(`Switched to ${model.name}`);
                              }}
                              className="flex items-center gap-3 p-2 cursor-pointer aria-selected:bg-accent hover:bg-accent rounded-lg mx-1 my-0.5 transition-all duration-300 group"
                            >
                              <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                                <ModelIcon model={model} className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-bold text-foreground tracking-tight">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight">{model.description}</span>
                              </div>
                              {selectedModel.id === model.id && (
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator className="my-2 bg-border/50" />

                        <CommandGroup heading="3D & Other" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold p-0">
                          {AI_MODELS.filter(m => m.category === '3d').map((model) => (
                            <CommandItem
                              key={model.id}
                              value={`${model.name} ${model.provider} ${model.description}`}
                              onSelect={() => {
                                setSelectedModel(model);
                                toast.success(`Switched to ${model.name}`);
                              }}
                              className="flex items-center gap-3 p-2 cursor-pointer aria-selected:bg-accent hover:bg-accent rounded-lg mx-1 my-0.5 transition-all duration-300 group"
                            >
                              <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-all">
                                <ModelIcon model={model} className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-xs font-bold text-foreground tracking-tight">{model.name}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight">{model.description}</span>
                              </div>
                              {selectedModel.id === model.id && (
                                <div className="p-1.5 rounded-lg bg-primary/10">
                                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleIncognito}
                  className={`h-8 w-8 rounded-full transition-colors ${isIncognito
                    ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                    }`}
                  title={isIncognito ? "Turn off Incognito Mode" : "Turn on Incognito Mode"}
                >
                  <VenetianMask className="w-4 h-4" />
                </Button>

                {/* Voice Gender Selector - Only visible in voice mode */}
                {isVoiceMode && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVoiceGender('male')}
                      className={`h-6 px-2 text-xs rounded-full transition-all ${voiceGender === 'male'
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10'
                        }`}
                      title="Male voice (Chris)"
                    >
                      ♂️ Male
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVoiceGender('female')}
                      className={`h-6 px-2 text-xs rounded-full transition-all ${voiceGender === 'female'
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10'
                        }`}
                      title="Female voice (Aria)"
                    >
                      ♀️ Female
                    </Button>
                  </div>
                )}
              </div>

              {/* Send or Voice Button - Dynamic Switch */}
              {input.trim() ? (
                <Button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="h-10 w-10 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200 hover:scale-105 transition-all duration-300 shadow-lg shadow-zinc-500/10 dark:shadow-white/10 flex items-center justify-center p-0"
                >
                  <Send className="w-4 h-4 ml-0.5" strokeWidth={2.5} />
                </Button>
              ) : (
                <Button
                  onClick={toggleVoiceMode}
                  className={`h-10 w-10 rounded-full transition-all duration-300 flex items-center justify-center p-0 shadow-lg ${isVoiceMode
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-200 hover:scale-105 shadow-zinc-500/10 dark:shadow-white/10'
                    }`}
                  title={isVoiceMode ? "End voice chat" : "Start voice chat"}
                >
                  {isVoiceMode ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <AudioLines className="w-5 h-5" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="text-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-600 font-medium">Press Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      </div>

    </div >
  );
};

export default DashboardChatbot;
