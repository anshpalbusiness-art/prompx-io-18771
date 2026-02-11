import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Loader2, ExternalLink, Wand2, ArrowRight, Code } from 'lucide-react';
import { isValidUrl, normalizeUrl } from '@/utils/websiteAnalyzer';
import { toast } from 'sonner';

interface WebsiteAnalyzerProps {
    isOpen: boolean;
    onClose: () => void;
    onAnalyze: (url: string, mode: 'prompt' | 'code') => Promise<void>;
}

export const WebsiteAnalyzer: React.FC<WebsiteAnalyzerProps> = ({
    isOpen,
    onClose,
    onAnalyze
}) => {
    const [url, setUrl] = useState('');
    const [loadingMode, setLoadingMode] = useState<'prompt' | 'code' | null>(null);
    const [urlError, setUrlError] = useState('');

    const validateUrl = (input: string): boolean => {
        const normalized = normalizeUrl(input);
        if (!isValidUrl(normalized)) {
            setUrlError('Please enter a valid website URL');
            return false;
        }
        setUrlError('');
        return true;
    };

    const handleAnalyze = async (mode: 'prompt' | 'code') => {
        if (!url.trim()) {
            toast.error('Please enter a website URL');
            return;
        }

        if (!validateUrl(url)) {
            return;
        }

        setLoadingMode(mode);
        try {
            const normalized = normalizeUrl(url);
            await onAnalyze(normalized, mode);
            setUrl('');
            onClose();
            toast.success(`${mode === 'prompt' ? 'Prompt' : 'Code'} generated successfully!`);
        } catch (error) {
            toast.error('Failed to analyze website');
        } finally {
            setLoadingMode(null);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
        if (urlError) {
            setUrlError('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] bg-background/95 dark:bg-background/80 backdrop-blur-2xl border-border/60 shadow-2xl p-0 gap-0 overflow-hidden">

                <DialogHeader className="p-8 pb-4 space-y-4 relative z-10 text-center">
                    <div className="mx-auto p-4 rounded-2xl bg-gradient-to-b from-foreground/5 to-transparent border border-foreground/10 shadow-lg mb-2">
                        <Globe className="w-8 h-8 text-foreground" strokeWidth={1.5} />
                    </div>
                    <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">
                        Website Analyzer
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground/90 max-w-md mx-auto">
                        Extract design systems and convert any website into actionable AI prompts or code
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 pt-4 space-y-8 relative z-10">
                    {/* URL Input */}
                    <div className="space-y-4">
                        <div className="relative group transition-all duration-300">
                            <Input
                                id="website-url"
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={handleUrlChange}
                                disabled={loadingMode !== null}
                                className={`
                  h-14 px-5 text-lg font-medium tracking-wide
                  bg-background/60 backdrop-blur-md
                  border-2 rounded-xl transition-all duration-300
                  placeholder:text-muted-foreground/40
                  hover:bg-background/80
                  focus:bg-background focus:ring-0 focus:scale-[1.01]
                  shadow-sm group-hover:shadow-md
                  ${urlError
                                        ? 'border-destructive/50 focus:border-destructive'
                                        : 'border-foreground/10 focus:border-foreground/30'
                                    }
                `}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground/5 text-xs font-semibold text-muted-foreground border border-foreground/5">
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Paste URL</span>
                                </div>
                            </div>
                        </div>
                        {urlError && (
                            <p className="text-sm text-destructive font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive"></span>
                                {urlError}
                            </p>
                        )}
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Generate Prompt Card */}
                        <button
                            onClick={() => handleAnalyze('prompt')}
                            disabled={loadingMode !== null || !url.trim()}
                            className="group relative flex flex-col items-start gap-4 p-6 rounded-2xl text-left transition-all duration-300
                        bg-gradient-to-b from-foreground/5 to-transparent
                        border border-foreground/10 hover:border-foreground/25
                        hover:bg-foreground/[0.07] hover:shadow-xl hover:shadow-black/5
                        disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="p-3 rounded-xl bg-background border border-foreground/10 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {loadingMode === 'prompt' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6 text-foreground" strokeWidth={1.5} />}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    Generate Prompt
                                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                </h3>
                                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                                    Analyze design patterns to create detailed AI engineering specifications.
                                </p>
                            </div>
                        </button>

                        {/* Generate Code Card */}
                        <button
                            onClick={() => handleAnalyze('code')}
                            disabled={loadingMode !== null || !url.trim()}
                            className="group relative flex flex-col items-start gap-4 p-6 rounded-2xl text-left transition-all duration-300
                        bg-gradient-to-b from-foreground/5 to-transparent
                        border border-foreground/10 hover:border-foreground/25
                        hover:bg-foreground/[0.07] hover:shadow-xl hover:shadow-black/5
                        disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="p-3 rounded-xl bg-background border border-foreground/10 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {loadingMode === 'code' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Code className="w-6 h-6 text-foreground" strokeWidth={1.5} />}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    Generate Code
                                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                </h3>
                                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                                    Extract colors and layout to build a production-ready HTML/CSS starter kit.
                                </p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Minimal Footer (Removed Powered By Text) */}
                <div className="p-6 border-t border-border/40 bg-foreground/[0.02]">
                    <div className="flex items-center justify-end text-xs text-muted-foreground">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="hover:bg-foreground/5 hover:text-foreground transition-colors"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
