import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Download, Apple, Monitor, Shield, Zap, Copy, Check,
    Clipboard, Keyboard, Eye, CheckCircle2, ArrowRight,
    Terminal, AlertTriangle, Globe, Code, MessageSquare
} from "lucide-react";

const DOWNLOAD_URL = "https://github.com/anshpalbusiness-art/prompx-io-18771/releases/download/v1.0.0/PromptX-1.0.0-arm64.dmg";

const features = [
    {
        icon: Keyboard,
        title: "Auto-Detect Typing",
        description: "Type a prompt in any supported app — PromptX detects it after 3 seconds and enhances automatically"
    },
    {
        icon: Clipboard,
        title: "Clipboard Monitoring",
        description: "Copy any text and get instant AI-powered prompt improvements"
    },
    {
        icon: Zap,
        title: "One-Click Paste",
        description: "Click 'Use' and the enhanced prompt pastes directly into your app"
    },
    {
        icon: Eye,
        title: "Context-Aware",
        description: "Detects which app you're in — coding prompts for Cursor, AI prompts for ChatGPT, and more"
    },
];

const installSteps = [
    {
        text: "Download the DMG file using the button above",
        command: null,
    },
    {
        text: "Open Terminal and run this command to remove the download quarantine:",
        command: "xattr -cr ~/Downloads/PromptX-1.0.0-arm64.dmg",
    },
    {
        text: "Double-click the DMG and drag PromptX to your Applications folder",
        command: null,
    },
    {
        text: "Before launching for the first time, run this in Terminal:",
        command: "xattr -cr /Applications/PromptX.app",
    },
    {
        text: "Open PromptX from Applications — it will appear in your menu bar",
        command: null,
    },
    {
        text: "Grant Accessibility permission when prompted (System Settings → Privacy & Security → Accessibility → Enable PromptX)",
        command: null,
    },
    {
        text: "Start typing prompts in Cursor, Windsurf, or any supported app — PromptX handles the rest!",
        command: null,
    },
];

const supportedApps = [
    { category: "AI Coding IDEs", icon: Code, apps: ["Cursor", "VS Code", "Windsurf", "Zed", "Trae"] },
    { category: "Browsers", icon: Globe, apps: ["Chrome", "Safari", "Firefox", "Arc", "Brave", "Edge", "Opera", "Vivaldi"] },
    { category: "AI Chat Apps", icon: MessageSquare, apps: ["ChatGPT", "Claude", "Gemini", "Copilot", "Perplexity", "DeepSeek", "Poe"] },
    { category: "Writing & Notes", icon: Clipboard, apps: ["Notes", "TextEdit", "Notion", "Obsidian", "Pages"] },
    { category: "Communication", icon: MessageSquare, apps: ["Slack", "Discord", "Telegram", "WhatsApp"] },
];

const CopyCommand = ({ command }: { command: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-2 flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm">
            <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <code className="text-emerald-300 flex-1 overflow-x-auto">{command}</code>
            <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
                title="Copy command"
            >
                {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                    <Copy className="h-3.5 w-3.5 text-white/50 hover:text-white/80" />
                )}
            </button>
        </div>
    );
};

export const DesktopAppDownload = () => {
    return (
        <div className="space-y-8">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-[#0a0e27] via-[#0d1440] to-[#0a0e27]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_50%)]" />

                {/* Stars effect */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-[2px] h-[2px] bg-white/40 rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${2 + Math.random() * 3}s`,
                            }}
                        />
                    ))}
                </div>

                <div className="relative p-8 sm:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-6 text-center lg:text-left">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 justify-center lg:justify-start">
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1">
                                    <Monitor className="h-3 w-3 mr-1.5" />
                                    Desktop App
                                </Badge>
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 px-3 py-1">
                                    v1.0.0
                                </Badge>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                PromptX Desktop
                            </h2>
                            <p className="text-lg text-blue-100/70 max-w-xl">
                                AI-powered prompt enhancement that works everywhere.
                                Type in any app, get instant improvements — no copy-paste needed.
                            </p>
                        </div>

                        {/* Download Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                            <Button
                                size="lg"
                                className="gap-3 bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-6 text-base shadow-xl hover:shadow-2xl transition-all duration-300"
                                onClick={async () => {
                                    try {
                                        const response = await fetch(DOWNLOAD_URL);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'PromptX-1.0.0-arm64.dmg';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);
                                    } catch {
                                        window.open(DOWNLOAD_URL, '_blank');
                                    }
                                }}
                            >
                                <Apple className="h-5 w-5" />
                                Download for macOS
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="gap-3 border-white/20 text-white hover:bg-white/10 font-medium px-6 py-6 text-base"
                                disabled
                            >
                                <Monitor className="h-5 w-5" />
                                Windows (Coming Soon)
                            </Button>
                        </div>

                        {/* System requirements */}
                        <div className="flex items-center gap-4 text-sm text-blue-200/50 justify-center lg:justify-start flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <Apple className="h-3.5 w-3.5" />
                                Apple Silicon (M1–M4)
                            </span>
                            <span>•</span>
                            <span>macOS 12+</span>
                            <span>•</span>
                            <span>~100 MB</span>
                        </div>
                    </div>

                    {/* Right: App Preview */}
                    <div className="relative flex-shrink-0">
                        <div className="relative w-72 sm:w-80 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/10">
                            <div className="bg-[#111827] p-4 space-y-3">
                                {/* Mini overlay preview */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-[8px] text-white font-bold">PX</div>
                                        <span className="text-white text-sm font-semibold">PromptX</span>
                                    </div>
                                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-2 py-0.5">
                                        ENHANCING
                                    </Badge>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <p className="text-xs text-blue-100/60 leading-relaxed">
                                        ✨ Your prompt enhanced with context, constraints, and output format specifications...
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-md py-1.5 text-center text-[10px] text-purple-300 font-medium">
                                        ⚡ Use
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-md py-1.5 text-center text-[10px] text-white/50 font-medium">
                                        📋 Copy
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute -inset-4 bg-blue-500/5 blur-3xl rounded-full -z-10" />
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                {features.map((feature) => (
                    <Card key={feature.title} className="border-border/50 bg-muted/20 hover:bg-muted/30 transition-all duration-300">
                        <CardContent className="p-5 flex items-start gap-4">
                            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                                <feature.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Installation Guide */}
            <Card className="border-border/50 bg-muted/10">
                <CardContent className="p-6 sm:p-8">
                    <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Installation Guide
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Follow these steps to install PromptX on your Mac. The Terminal commands are only needed once.
                    </p>

                    <div className="space-y-5">
                        {installSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border border-primary/20 shrink-0 text-sm font-semibold text-primary mt-0.5">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                                    {step.command && <CopyCommand command={step.command} />}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Why xattr note */}
                    <div className="mt-6 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-sm text-amber-400/80 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span><strong>Why the Terminal commands?</strong> PromptX is not code-signed with an Apple Developer certificate yet. The <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">xattr -cr</code> command removes macOS's download quarantine flag. This is standard for open-source Mac apps and only needs to be done once.</span>
                        </p>
                    </div>

                    <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-sm text-emerald-400/80 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>After initial setup, PromptX opens normally from Applications. You can also set it to launch at login from the menu bar icon.</span>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Supported Apps */}
            <Card className="border-border/50 bg-muted/10">
                <CardContent className="p-6 sm:p-8">
                    <h3 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Supported Apps
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {supportedApps.map((group) => (
                            <div key={group.category} className="p-4 rounded-xl bg-background/50 border border-border/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <group.icon className="h-4 w-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-foreground">{group.category}</h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.apps.map((appName) => (
                                        <Badge key={appName} variant="secondary" className="text-xs font-medium px-2.5 py-1">
                                            {appName}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                        PromptX works in any app that accepts text input. The apps above have context-aware prompt enhancements.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default DesktopAppDownload;
