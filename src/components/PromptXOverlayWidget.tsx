import { useState, useRef, useEffect, useCallback } from "react";
import {
    Sparkles,
    X,
    Copy,
    Check,
    Loader2,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Minimize2,
    Maximize2,
    RotateCcw,
} from "lucide-react";
import {
    OVERLAY_STYLES,
    loadOverlaySettings,
    saveOverlaySettings,
} from "@/lib/overlayStyles";

interface PromptXOverlayWidgetProps {
    onClose: () => void;
}

type OverlayWidgetState = "idle" | "enhancing" | "ready" | "error";

export function PromptXOverlayWidget({ onClose }: PromptXOverlayWidgetProps) {
    const [inputText, setInputText] = useState("");
    const [enhancedText, setEnhancedText] = useState("");
    const [state, setState] = useState<OverlayWidgetState>("idle");
    const [copied, setCopied] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeStyle, setActiveStyle] = useState(loadOverlaySettings().style);
    const [showStyles, setShowStyles] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Drag state
    const [position, setPosition] = useState({ x: -1, y: -1 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const widgetRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initialize position to bottom-right
    useEffect(() => {
        if (position.x === -1) {
            setPosition({
                x: window.innerWidth - 420,
                y: window.innerHeight - 520,
            });
        }
    }, []);

    // Auto-focus textarea on mount
    useEffect(() => {
        if (!isMinimized) {
            setTimeout(() => textareaRef.current?.focus(), 200);
        }
    }, [isMinimized]);

    // ─── Drag handlers ────────────────────────────────────────────────────

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest(".no-drag")) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        e.preventDefault();
    }, [position]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 390, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    // ─── Debounced enhancement ────────────────────────────────────────────

    const handleInputChange = (text: string) => {
        setInputText(text);
        setState("idle");
        setEnhancedText("");

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        if (text.trim().length >= 5) {
            const settings = loadOverlaySettings();
            debounceTimerRef.current = setTimeout(() => {
                enhancePrompt(text);
            }, settings.debounceMs);
        }
    };

    const enhancePrompt = async (prompt: string) => {
        setState("enhancing");
        setErrorMsg("");

        try {
            const settings = loadOverlaySettings();
            const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
            const response = await fetch(`${baseUrl}/api/overlay-enhance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    style: activeStyle,
                    privacyMode: settings.privacyMode,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Enhancement failed");
            }

            const data = await response.json();
            setEnhancedText(data.enhanced);
            setState("ready");
        } catch (err: any) {
            setState("error");
            setErrorMsg(err.message || "Enhancement failed");
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(enhancedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textarea = document.createElement("textarea");
            textarea.value = enhancedText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleReEnhance = () => {
        if (inputText.trim().length >= 5) {
            enhancePrompt(inputText);
        }
    };

    const currentStyleObj = OVERLAY_STYLES.find(s => s.id === activeStyle) || OVERLAY_STYLES[0];

    // ─── Minimized pill ────────────────────────────────────────────────────

    if (isMinimized) {
        return (
            <div
                ref={widgetRef}
                className="fixed z-[9999] select-none"
                style={{ left: position.x, top: position.y }}
            >
                <div
                    onMouseDown={handleMouseDown}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-full cursor-move shadow-2xl border transition-all duration-300 hover:shadow-primary/20 hover:scale-105"
                    style={{
                        background: "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(88,28,235,0.95))",
                        borderColor: "rgba(167,139,250,0.3)",
                        backdropFilter: "blur(20px)",
                    }}
                >
                    <Sparkles className="h-4 w-4 text-white animate-pulse" />
                    <span className="text-white text-sm font-semibold tracking-tight">PromptX</span>

                    {state === "enhancing" && (
                        <Loader2 className="h-3.5 w-3.5 text-white/80 animate-spin" />
                    )}
                    {state === "ready" && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}

                    <button
                        onClick={() => setIsMinimized(false)}
                        className="no-drag ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <Maximize2 className="h-3.5 w-3.5 text-white/80" />
                    </button>
                    <button
                        onClick={onClose}
                        className="no-drag p-0.5 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="h-3.5 w-3.5 text-white/80" />
                    </button>
                </div>
            </div>
        );
    }

    // ─── Full widget ───────────────────────────────────────────────────────

    return (
        <div
            ref={widgetRef}
            className="fixed z-[9999] select-none"
            style={{
                left: position.x,
                top: position.y,
                width: 380,
            }}
        >
            <div
                className="rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-xl animate-in zoom-in-95 fade-in duration-300"
                style={{
                    background: "linear-gradient(180deg, rgba(15,15,25,0.97) 0%, rgba(10,10,18,0.98) 100%)",
                    borderColor: "rgba(124,58,237,0.25)",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.1)",
                }}
            >
                {/* ─── Header ─── */}
                <div
                    onMouseDown={handleMouseDown}
                    className="flex items-center justify-between px-4 py-3 cursor-move border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                            <GripVertical className="h-3.5 w-3.5 text-white/20" />
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}
                            >
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                            </div>
                        </div>
                        <div>
                            <span className="text-white/90 text-sm font-semibold tracking-tight">PromptX Overlay</span>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${state === "enhancing" ? "bg-amber-400 animate-pulse" :
                                        state === "ready" ? "bg-emerald-400" :
                                            state === "error" ? "bg-red-400" :
                                                "bg-white/30"
                                    }`} />
                                <span className="text-[10px] text-white/40">
                                    {state === "enhancing" ? "Enhancing..." :
                                        state === "ready" ? "Enhanced — ready to copy" :
                                            state === "error" ? "Error" :
                                                "Type or paste a prompt"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 no-drag">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="Minimize"
                        >
                            <Minimize2 className="h-3.5 w-3.5 text-white/50" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Deactivate Overlay"
                        >
                            <X className="h-3.5 w-3.5 text-white/50 hover:text-red-400" />
                        </button>
                    </div>
                </div>

                {/* ─── Style Selector ─── */}
                <div className="px-4 py-2 border-b no-drag" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <button
                        onClick={() => setShowStyles(!showStyles)}
                        className="flex items-center justify-between w-full group"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{currentStyleObj.icon}</span>
                            <span className="text-xs font-medium text-white/70 group-hover:text-white/90 transition-colors">
                                {currentStyleObj.name}
                            </span>
                        </div>
                        {showStyles ? (
                            <ChevronUp className="h-3.5 w-3.5 text-white/30" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                        )}
                    </button>

                    {showStyles && (
                        <div className="mt-2 space-y-1 pb-1 animate-in slide-in-from-top-1 duration-200">
                            {OVERLAY_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => {
                                        setActiveStyle(style.id);
                                        saveOverlaySettings({ style: style.id });
                                        setShowStyles(false);
                                        // Re-enhance if we have text
                                        if (inputText.trim().length >= 5 && state === "ready") {
                                            setTimeout(() => enhancePrompt(inputText), 100);
                                        }
                                    }}
                                    className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg transition-all ${activeStyle === style.id
                                            ? "bg-primary/15 border border-primary/30"
                                            : "hover:bg-white/5 border border-transparent"
                                        }`}
                                >
                                    <span className="text-base">{style.icon}</span>
                                    <div className="text-left flex-1">
                                        <p className="text-xs font-medium text-white/80">{style.name}</p>
                                        <p className="text-[9px] text-white/30 line-clamp-1">{style.description}</p>
                                    </div>
                                    {activeStyle === style.id && <Check className="h-3 w-3 text-primary" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Input ─── */}
                <div className="px-4 pt-3 pb-2 no-drag">
                    <label className="text-[10px] uppercase tracking-wider text-white/25 font-semibold mb-1.5 block">
                        Your Prompt
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="Type or paste your prompt here..."
                        rows={3}
                        className="w-full bg-white/[0.04] border rounded-xl px-3.5 py-2.5 text-sm text-white/90 placeholder:text-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all"
                        style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-white/20">
                            {inputText.length > 0 ? `${inputText.length} chars` : "Min 5 characters to enhance"}
                        </span>
                        {state === "enhancing" && (
                            <div className="flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 text-primary animate-spin" />
                                <span className="text-[10px] text-primary/70">Enhancing with Grok...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Enhanced Output ─── */}
                {(state === "ready" || state === "error") && (
                    <div className="px-4 pb-3 no-drag animate-in slide-in-from-bottom-2 duration-300">
                        {state === "error" ? (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                                <p className="text-xs text-red-400">{errorMsg}</p>
                                <button
                                    onClick={handleReEnhance}
                                    className="mt-2 text-[10px] text-red-300 underline hover:text-red-200"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <>
                                <label className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-semibold mb-1.5 flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3" /> Enhanced Prompt
                                </label>
                                <div
                                    className="bg-emerald-500/[0.06] border rounded-xl px-3.5 py-2.5 max-h-40 overflow-y-auto"
                                    style={{ borderColor: "rgba(16,185,129,0.15)" }}
                                >
                                    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                                        {enhancedText}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 mt-2.5">
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                                        style={{
                                            background: copied
                                                ? "linear-gradient(135deg, #059669, #047857)"
                                                : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                                        }}
                                    >
                                        {copied ? (
                                            <><Check className="h-3.5 w-3.5" /> Copied!</>
                                        ) : (
                                            <><Copy className="h-3.5 w-3.5" /> Copy Enhanced</>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleReEnhance}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
                                        title="Re-enhance with current style"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" /> Re-do
                                    </button>
                                    <span className="ml-auto text-[10px] text-white/20">
                                        {enhancedText.length} chars
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ─── Footer ─── */}
                <div
                    className="px-4 py-2 flex items-center justify-between border-t"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                    <span className="text-[9px] text-white/15">Powered by Grok · PromptX</span>
                    <div className="flex items-center gap-1">
                        {loadOverlaySettings().privacyMode && (
                            <span className="text-[9px] text-emerald-400/50 flex items-center gap-1">
                                🔒 Privacy
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PromptXOverlayWidget;
