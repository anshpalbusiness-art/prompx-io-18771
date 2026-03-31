import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIApplicationSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    promptContent: string;
}

const AI_APPS = [
    {
        name: "ChatGPT",
        icon: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
        url: "https://chatgpt.com/?q=",
        supportsQuery: true,
        description: "OpenAI's conversational AI model"
    },
    {
        name: "Claude",
        icon: "https://mintlify.s3-us-west-1.amazonaws.com/anthropic/logo/dark.svg", // Fallback text icon if this fails
        url: "https://claude.ai/new",
        supportsQuery: false,
        description: "Anthropic's helpful, harmless, and honest AI"
    },
    {
        name: "Grok",
        icon: "https://upload.wikimedia.org/wikipedia/commons/e/e6/X_AI_logo.svg",
        url: "https://grok.com/",
        supportsQuery: false,
        description: "xAI's frontier model"
    },
    {
        name: "Perplexity",
        icon: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Perplexity_AI_logo.svg",
        url: "https://www.perplexity.ai/?q=",
        supportsQuery: true,
        description: "AI-powered search engine"
    },
    {
        name: "Gemini",
        icon: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg",
        url: "https://gemini.google.com/app",
        supportsQuery: false,
        description: "Google's most capable AI model"
    },
    {
        name: "DeepSeek",
        icon: "https://upload.wikimedia.org/wikipedia/commons/8/87/DeepSeek_logo.svg",
        url: "https://chat.deepseek.com/",
        supportsQuery: false,
        description: "Advanced AI by DeepSeek"
    },
    {
        name: "Copilot",
        icon: "https://upload.wikimedia.org/wikipedia/commons/2/22/Microsoft_Copilot_icon.svg",
        url: "https://copilot.microsoft.com/",
        supportsQuery: false,
        description: "Microsoft's everyday AI companion"
    },
    {
        name: "Meta AI",
        icon: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Meta_AI_logo.svg",
        url: "https://www.meta.ai/",
        supportsQuery: false,
        description: "Meta's intelligent assistant"
    },
    {
        name: "HuggingChat",
        icon: "https://huggingface.co/front/assets/huggingface_logo-noborder.svg",
        url: "https://huggingface.co/chat/",
        supportsQuery: false,
        description: "Open source models by Hugging Face"
    },
    {
        name: "Poe",
        icon: "https://fake-url.com/poe.svg", // Triggers fallback text icon
        url: "https://poe.com/",
        supportsQuery: false,
        description: "Multiple AI bots in one place"
    },
    {
        name: "Le Chat (Mistral)",
        icon: "https://upload.wikimedia.org/wikipedia/commons/0/03/Mistral_AI_logo.svg",
        url: "https://chat.mistral.ai/",
        supportsQuery: false,
        description: "Frontier AI by Mistral"
    },
    {
        name: "You.com",
        icon: "https://upload.wikimedia.org/wikipedia/commons/8/84/You.com_logo.svg",
        url: "https://you.com/",
        supportsQuery: false,
        description: "AI Search Engine"
    }
];

export const AIApplicationSelector: React.FC<AIApplicationSelectorProps> = ({ open, onOpenChange, promptContent }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    const filteredApps = AI_APPS.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectApp = async (app: typeof AI_APPS[0]) => {
        try {
            await navigator.clipboard.writeText(promptContent);
            toast({
                title: "Prompt Copied!",
                description: `Your prompt has been copied to the clipboard. Paste it into ${app.name}!`,
            });

            let finalUrl = app.url;
            if (app.supportsQuery) {
                finalUrl += encodeURIComponent(promptContent);
            }

            // Open in new tab after a tiny delay so the toast is visible
            setTimeout(() => {
                window.open(finalUrl, '_blank', 'noopener,noreferrer');
                onOpenChange(false);
            }, 500);

        } catch (err) {
            toast({
                title: "Copy Failed",
                description: "Could not copy prompt to clipboard. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-background/95 backdrop-blur-3xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Use Prompt</DialogTitle>
                    <DialogDescription>
                        Select an AI platform to use your prompt with. We'll automatically copy it to your clipboard and redirect you.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search AI platforms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pb-2 pr-1">
                        {filteredApps.map((app) => (
                            <button
                                key={app.name}
                                onClick={() => handleSelectApp(app)}
                                className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all text-left group"
                            >
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors overflow-hidden p-2">
                                    <img src={app.icon} alt={app.name} className="w-full h-full object-contain" onError={(e) => {
                                        // Fallback text if icon fails to load
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) parent.innerHTML = `<span class="font-bold text-lg">${app.name.charAt(0)}</span>`;
                                    }} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{app.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{app.description}</p>
                                </div>
                            </button>
                        ))}

                        {filteredApps.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-muted-foreground">
                                No AI platforms found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
