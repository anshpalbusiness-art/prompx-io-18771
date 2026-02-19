import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Shield,
    Zap,
    ChevronRight,
    Settings2,
    Eye,
    EyeOff,
    Timer,
    Send,
    Globe,
    Check,
    Sparkles,
    Keyboard,
    ArrowRight,
    Power,
    Copy,
} from "lucide-react";
import {
    OVERLAY_STYLES,
    SUPPORTED_APPS,
    loadOverlaySettings,
    saveOverlaySettings,
    type OverlaySettings,
} from "@/lib/overlayStyles";
import { useOverlay } from "@/contexts/OverlayContext";

// ─── Live Demo Component ─────────────────────────────────────────────────

function OverlayDemo({ activeStyle }: { activeStyle: string }) {
    const [step, setStep] = useState(0);
    const [typedText, setTypedText] = useState("");
    const originalPrompt = "tell me about quantum computing";
    const enhancedPrompts: Record<string, string> = {
        professional: "Provide a comprehensive overview of quantum computing covering: 1) Core principles (qubits, superposition, entanglement) 2) Current state of quantum hardware 3) Key algorithms and their advantages 4) Enterprise applications and timeline to practical quantum advantage.",
        maximum_detail: "Explain quantum computing with extreme depth: Start with the mathematical foundations (Hilbert spaces, quantum gates, Bloch sphere representation). Cover all major qubit types (superconducting, trapped ion, topological, photonic) with their error rates and coherence times...",
        aggressive: "You are a quantum physicist with 25 years of research experience. Give me the no-BS reality of quantum computing right now. Skip the hype. What actually works? What's vaporware? Which companies are closest to useful quantum advantage? Be brutally honest about timelines.",
        concise: "Explain quantum computing: core principles, current hardware limits, and 3 most promising near-term applications. Be precise, skip history.",
        creative: "Take me on a journey into the quantum realm — where particles dance between existence and possibility, where a single bit can whisper 'yes' and 'no' simultaneously. Paint the landscape of quantum computing from the bizarre physics to the world-changing applications emerging today.",
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setStep(s => (s + 1) % 4);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (step === 1) {
            let i = 0;
            const interval = setInterval(() => {
                setTypedText(originalPrompt.slice(0, i + 1));
                i++;
                if (i >= originalPrompt.length) clearInterval(interval);
            }, 60);
            return () => clearInterval(interval);
        }
    }, [step]);

    const enhanced = enhancedPrompts[activeStyle] || enhancedPrompts.professional;

    return (
        <div className="relative w-full max-w-sm mx-auto">
            {/* Phone frame */}
            <div className="relative bg-gradient-to-b from-muted/80 to-muted/40 rounded-[2.5rem] p-2 border border-border/50 shadow-2xl">
                <div className="bg-background rounded-[2rem] overflow-hidden" style={{ minHeight: 420 }}>
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 py-2 text-[10px] text-muted-foreground">
                        <span>9:41</span>
                        <div className="w-20 h-5 bg-foreground/90 rounded-full" />
                        <span>100%</span>
                    </div>

                    {/* Chat app header */}
                    <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                        <span className="text-sm font-semibold text-foreground">ChatGPT</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-auto">GPT-4</Badge>
                    </div>

                    {/* Chat messages */}
                    <div className="p-4 space-y-3" style={{ minHeight: 220 }}>
                        <div className="bg-muted/50 rounded-2xl rounded-tl-md p-3 max-w-[85%]">
                            <p className="text-xs text-foreground/80">Hello! How can I help you today?</p>
                        </div>

                        {step >= 1 && (
                            <div className="bg-primary/10 rounded-2xl rounded-tr-md p-3 max-w-[85%] ml-auto animate-in slide-in-from-right-2 duration-300">
                                <p className="text-xs text-foreground">{typedText}<span className="animate-pulse">|</span></p>
                            </div>
                        )}
                    </div>

                    {/* Input area */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                        {/* PromptX overlay pill */}
                        {step >= 2 && (
                            <div className="mb-2 animate-in slide-in-from-bottom-2 fade-in duration-500">
                                <div className="bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 rounded-xl p-2.5 backdrop-blur-xl">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-[10px] font-semibold text-primary">Enhanced prompt ready</span>
                                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/30 text-primary ml-auto">
                                            {OVERLAY_STYLES.find(s => s.id === activeStyle)?.name}
                                        </Badge>
                                    </div>
                                    <p className="text-[9px] text-foreground/70 line-clamp-2 mb-2">{enhanced}</p>
                                    <div className="flex gap-1.5">
                                        <Button size="sm" className="h-6 text-[9px] px-3 rounded-lg bg-primary hover:bg-primary/90">
                                            <Check className="h-2.5 w-2.5 mr-1" />Use Enhanced
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 rounded-lg text-muted-foreground">
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step >= 3 && (
                            <div className="mb-2 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1.5 justify-center">
                                    <Check className="h-3 w-3 text-emerald-500" />
                                    <span className="text-[9px] text-emerald-500 font-medium">Prompt enhanced & pasted</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-muted/60 border border-border/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground flex-1">
                                {step >= 3 ? enhanced.slice(0, 50) + '...' : step >= 1 ? typedText : 'Message'}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <ArrowRight className="h-3 w-3 text-primary" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-2 mt-4">
                {['Type prompt', '3s debounce', 'Review', 'Pasted!'].map((label, i) => (
                    <div key={i} className={`flex items-center gap-1 transition-all duration-300 ${step === i ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${step === i ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        <span className="text-[9px] text-muted-foreground">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function MobileOverlay() {
    const [settings, setSettings] = useState<OverlaySettings>(loadOverlaySettings());
    const [activeStyle, setActiveStyle] = useState(settings.style);
    const { isActive, activate, deactivate, toggle } = useOverlay();

    const updateSetting = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
        const updated = { ...settings, [key]: value };
        setSettings(updated);
        saveOverlaySettings({ [key]: value });
    };

    return (
        <div className="space-y-8">
            {/* ─── Hero Section ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-primary/10">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                <div className="relative grid lg:grid-cols-2 gap-8 p-6 sm:p-10">
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                                    <Zap className="h-3 w-3 mr-1" /> Prompt Overlay Tool
                                </Badge>
                                {isActive && (
                                    <Badge className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
                                        ● Active
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                                Enhance every AI prompt,
                                <br />
                                <span className="text-primary">on every app.</span>
                            </h2>
                            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg">
                                A Grammarly-style floating overlay built right into PromptX.
                                Activate it, type or paste any prompt, and get an AI-enhanced version
                                in seconds — powered by Grok for 5–10× better responses.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {['Real-time enhancement', '3s smart debounce', 'One-click copy', 'Privacy mode'].map(f => (
                                <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/30">
                                    <Check className="h-3 w-3 text-primary" />
                                    {f}
                                </div>
                            ))}
                        </div>

                        {/* ─── Big Activate / Deactivate Button ─── */}
                        <div className="flex gap-3">
                            {!isActive ? (
                                <Button
                                    onClick={activate}
                                    size="lg"
                                    className="gap-2.5 px-8 py-6 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-primary to-primary/80"
                                >
                                    <Power className="h-5 w-5" />
                                    Activate Overlay
                                </Button>
                            ) : (
                                <Button
                                    onClick={deactivate}
                                    size="lg"
                                    variant="outline"
                                    className="gap-2.5 px-8 py-6 text-base font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Power className="h-5 w-5" />
                                    Deactivate Overlay
                                </Button>
                            )}
                        </div>

                        {isActive && (
                            <div className="animate-in slide-in-from-left-2 duration-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                <p className="text-xs text-emerald-400 font-medium flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Overlay is active! Look for the floating PromptX widget on screen. Type or paste a prompt to enhance it instantly.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Live demo phone */}
                    <div className="hidden lg:flex items-center justify-center">
                        <OverlayDemo activeStyle={activeStyle} />
                    </div>
                </div>
            </div>

            {/* ─── Supported Apps ─── */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Works with every major AI app
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SUPPORTED_APPS.map(app => (
                        <Card key={app.name} className="border-border/30 bg-muted/20 hover:bg-muted/40 transition-all duration-300 group cursor-default">
                            <CardContent className="flex items-center gap-3 p-4">
                                <span className="text-2xl">{app.icon}</span>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{app.name}</p>
                                    <p className="text-[10px] text-muted-foreground">Copy & enhance</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* ─── Enhancement Styles ─── */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Enhancement Styles
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {OVERLAY_STYLES.map(style => (
                        <Card
                            key={style.id}
                            className={`border-border/30 cursor-pointer transition-all duration-300 hover:shadow-lg group ${activeStyle === style.id
                                ? 'ring-2 ring-primary/50 border-primary/30 bg-primary/5'
                                : 'bg-muted/10 hover:bg-muted/30'
                                }`}
                            onClick={() => {
                                setActiveStyle(style.id);
                                updateSetting('style', style.id);
                            }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center text-lg`}>
                                            {style.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{style.name}</p>
                                            {style.badge && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mt-0.5">{style.badge}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    {activeStyle === style.id && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="h-3 w-3 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{style.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* ─── Settings ─── */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    Overlay Settings
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="border-border/30 bg-muted/10">
                        <CardContent className="p-5 space-y-5">
                            {/* Global toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500/20' : 'bg-primary/10'}`}>
                                        <Power className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-primary'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Overlay Active</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {isActive ? 'Widget is floating on screen' : 'Click to activate the overlay'}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={toggle}
                                />
                            </div>

                            {/* Privacy mode */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        {settings.privacyMode ? <EyeOff className="h-4 w-4 text-emerald-500" /> : <Eye className="h-4 w-4 text-emerald-500" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Privacy Mode</p>
                                        <p className="text-[11px] text-muted-foreground">No cloud logging of prompts</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.privacyMode}
                                    onCheckedChange={(v) => updateSetting('privacyMode', v)}
                                />
                            </div>

                            {/* Debounce timer */}
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Timer className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-foreground">Debounce Timer</p>
                                            <Badge variant="outline" className="text-xs font-mono">{(settings.debounceMs / 1000).toFixed(1)}s</Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">Wait time before auto-enhancing</p>
                                    </div>
                                </div>
                                <Slider
                                    value={[settings.debounceMs]}
                                    min={1000}
                                    max={8000}
                                    step={500}
                                    onValueChange={([v]) => updateSetting('debounceMs', v)}
                                    className="w-full"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Start Guide */}
                    <Card className="border-border/30 bg-muted/10">
                        <CardContent className="p-5">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                                <Zap className="h-4 w-4 text-primary" /> Quick Start
                            </h4>
                            <div className="space-y-3">
                                {[
                                    { step: '1', text: 'Click "Activate Overlay" above or toggle the switch on', icon: <Power className="h-3.5 w-3.5" /> },
                                    { step: '2', text: 'A floating PromptX widget appears on your screen', icon: <Sparkles className="h-3.5 w-3.5" /> },
                                    { step: '3', text: 'Type or paste any prompt into the widget', icon: <Keyboard className="h-3.5 w-3.5" /> },
                                    { step: '4', text: 'Wait 3 seconds — Grok enhances it automatically', icon: <Timer className="h-3.5 w-3.5" /> },
                                    { step: '5', text: 'Click "Copy Enhanced" to use in any AI app', icon: <Copy className="h-3.5 w-3.5" /> },
                                ].map(item => (
                                    <div key={item.step} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0 mt-0.5">
                                            {item.step}
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-primary/60">{item.icon}</span>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!isActive && (
                                <Button
                                    onClick={activate}
                                    className="w-full mt-4 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                                    size="sm"
                                >
                                    <Power className="h-4 w-4" /> Activate Now
                                </Button>
                            )}
                            {isActive && (
                                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
                                    <p className="text-[11px] text-emerald-400 font-medium">✓ Overlay is active and ready to use</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ─── How It Works ─── */}
            <Card className="border-border/30 bg-muted/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" /> How It Works
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-4 gap-4">
                        {[
                            { icon: <Power className="h-6 w-6" />, title: 'Activate', desc: 'Turn on the overlay from the settings or the big activate button' },
                            { icon: <Keyboard className="h-6 w-6" />, title: 'Paste or Type', desc: 'Enter any prompt into the floating widget' },
                            { icon: <Sparkles className="h-6 w-6" />, title: 'Enhance', desc: '3-second pause triggers AI enhancement via Grok' },
                            { icon: <Copy className="h-6 w-6" />, title: 'Copy & Use', desc: 'One click to copy the enhanced prompt to clipboard' },
                        ].map((step, i) => (
                            <div key={i} className="text-center space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                    {step.icon}
                                </div>
                                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                                <p className="text-xs text-muted-foreground">{step.desc}</p>
                                {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-auto hidden sm:block" />}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ─── Privacy & Security ─── */}
            <Card className="border-border/30 bg-muted/10">
                <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Shield className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">Privacy & Security</h4>
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                                {[
                                    'Prompts processed in real-time, never stored',
                                    'All enhancements via encrypted API',
                                    'No data shared with third parties',
                                    'Privacy mode disables all logging',
                                    'Widget runs entirely in your browser',
                                    'Open-source overlay component',
                                ].map((point, i) => (
                                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Check className="h-3 w-3 text-emerald-500 shrink-0" /> {point}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default MobileOverlay;
