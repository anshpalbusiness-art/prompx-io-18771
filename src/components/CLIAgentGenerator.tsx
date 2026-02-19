import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Terminal, Sparkles, Send, Bot, User, Loader2, Paperclip,
    ChevronRight, ChevronDown, Circle, Code, Zap, RotateCcw,
    Copy, Check, Play, FileText, Folder, FolderOpen,
    Eye, ExternalLink, X, ArrowUp, BrainCircuit, Cpu, Trash2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    type ChatMessage,
    type TerminalLine,
    type CLIBuildPlan,
    type CLILanguage,
    type FileEntry,
    type ChatResponse,
    LANGUAGE_OPTIONS,
    EXAMPLE_PROMPTS,
    uid,
    sendChatMessage,
    executeBuildFromPlan,
    loadProjectTree,
    readFile,
    revealInFinder,
    getRuntimeMode,
} from "@/lib/cliGenerator";
import { PromptInputBox } from "./PromptInputBox";
import { useCLIGenerator, type SessionData } from "@/contexts/CLIGeneratorContext";

// ─── File icon helper ───
function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        js: '🟨', ts: '🔷', py: '🐍', go: '🔵', rs: '🦀',
        json: '📋', yaml: '⚙️', yml: '⚙️', md: '📝', txt: '📄',
        css: '🎨', html: '🌐', sh: '🐚', toml: '📦', lock: '🔒',
    };
    return map[ext || ''] || '📄';
}

// ─── Terminal Line Component ───
function TermLine({ line }: { line: TerminalLine }) {
    const colorClass = {
        command: 'text-cyan-500 font-semibold',
        stdout: 'text-muted-foreground',
        stderr: 'text-amber-500',
        info: 'text-muted-foreground/60',
        success: 'text-emerald-600',
        error: 'text-destructive',
    }[line.type];

    return (
        <div className={cn("font-mono text-[12px] leading-[1.6] whitespace-pre-wrap break-all", colorClass)}>
            {line.content}
        </div>
    );
}

// ─── Chat Bubble ───
// ─── Chat Bubble (Refined) ───
// ─── Chat Bubble (Refined & Sophisticated) ───
function ChatBubble({ message }: { message: ChatMessage }) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderContent = (text: string) => {
        // Split by code blocks (```...```), bold (**...**), and inline code (`...`)
        const parts = text.split(/(`{3}[\s\S]*?`{3}|\*{2}.*?\*{2}|`[^`]+`)/g);

        return parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const lines = part.slice(3, -3);
                const firstNewline = lines.indexOf('\n');
                const code = firstNewline > -1 ? lines.slice(firstNewline + 1) : lines;
                return (
                    <div key={i} className="my-4 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                            <span className="text-[10px] font-mono text-muted-foreground">Code</span>
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-400/20"></span>
                                <span className="w-2 h-2 rounded-full bg-yellow-400/20"></span>
                                <span className="w-2 h-2 rounded-full bg-green-400/20"></span>
                            </div>
                        </div>
                        <div className="bg-zinc-50 dark:bg-[#0d1117] p-3 overflow-x-auto">
                            <pre className="text-[12px] font-mono text-zinc-700 dark:text-zinc-300">
                                <code>{code}</code>
                            </pre>
                        </div>
                    </div>
                );
            }
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="px-1.5 py-0.5 rounded bg-muted/50 text-foreground text-[12px] font-mono border border-border/40">{part.slice(1, -1)}</code>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const renderAttachments = (attachments?: { name: string; type: string; url: string }[]) => {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att, i) => (
                    <div key={i} className="relative group overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <img
                            src={att.url}
                            alt={att.name}
                            className="max-w-[200px] max-h-[200px] object-cover block"
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={cn(
            "flex gap-4 w-full max-w-3xl mx-auto px-6 py-6 group transition-all",
            isUser ? "flex-row-reverse" : "" // User on right, Agent on left (optional, but requested layout is usually linear for docs. Let's try distinct styling first)
        )}>
            {/* 
                DECISION: Keep linear layout (avatar left) for both to maintain "Log" feel, 
                but style them very differently to distinguish.
                User: Minimal, almost transparent.
                Agent: Richer.
             */}

            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all relative",
                isUser
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    : "bg-transparent"
            )}>
                {isUser ? (
                    <User className="h-4 w-4" />
                ) : (
                    <div className="relative flex items-center justify-center w-full h-full">
                        {/* Processing Effect: Subtle pulse/glow background when thinking */}
                        {message.status === 'thinking' && (
                            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-75" />
                        )}
                        <img
                            src="/promptx-logo.png"
                            alt="PromptX"
                            className={cn(
                                "h-6 w-6 object-contain relative z-10",
                                message.status === 'thinking' && "animate-pulse duration-1000"
                            )}
                        />
                    </div>
                )}
            </div>

            <div className={cn("flex-1 space-y-1.5 min-w-0 pr-4", isUser ? "pt-1" : "")}>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[11px] font-semibold tracking-wider transition-all duration-300",
                        isUser
                            ? "text-muted-foreground uppercase"
                            : cn(
                                "bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700 dark:from-zinc-400 dark:via-white dark:to-zinc-400 bg-clip-text text-transparent font-bold !uppercase-false",
                                message.status === 'thinking' && "animate-text-shimmer bg-[size:200%_auto]"
                            )
                    )}>
                        {isUser ? 'YOU' : 'PromptX'}
                    </span>

                    {message.status && message.status !== 'done' && (
                        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                            {/* 'Thinking...' text removed as per request. Animation is now on the name. */}
                            {message.status === 'building' && (
                                <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                                    <Zap className="h-3 w-3 fill-current animate-pulse" /> Building
                                </span>
                            )}
                            {message.status === 'error' && (
                                <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                                    <Circle className="h-2.5 w-2.5 fill-current" /> Error
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className={cn(
                    "text-[14px] leading-relaxed",
                    isUser
                        ? "text-zinc-600 dark:text-zinc-400 font-normal"
                        : "text-foreground font-light text-[15px]"
                )}>
                    {renderContent(message.content)}
                    {renderAttachments(message.attachments)}
                </div>

                {!isUser && (
                    <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleCopy} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── File Tree Node ───
function FileTreeNode({ entry, depth = 0, selectedFile, onFileSelect }: {
    entry: FileEntry;
    depth?: number;
    selectedFile: string | null;
    onFileSelect: (path: string, name: string) => void;
}) {
    const [expanded, setExpanded] = useState(depth < 2);

    if (entry.isDirectory) {
        return (
            <div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center gap-1.5 py-1 px-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
                >
                    {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                    {expanded ? <FolderOpen className="h-3.5 w-3.5 text-orange-400 shrink-0" /> : <Folder className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                    <span className="truncate">{entry.name}</span>
                </button>
                {expanded && entry.children?.map(child => (
                    <FileTreeNode
                        key={child.path}
                        entry={child}
                        depth={depth + 1}
                        selectedFile={selectedFile}
                        onFileSelect={onFileSelect}
                    />
                ))}
            </div>
        );
    }

    return (
        <button
            onClick={() => onFileSelect(entry.path, entry.name)}
            className={cn(
                "w-full flex items-center gap-1.5 py-1 px-2 text-[12px] rounded transition-colors",
                selectedFile === entry.path
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            style={{ paddingLeft: `${20 + depth * 14}px` }}
        >
            <span className="text-[11px] shrink-0">{getFileIcon(entry.name)}</span>
            <span className="truncate">{entry.name}</span>
            {entry.size > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
                    {entry.size > 1024 ? `${(entry.size / 1024).toFixed(1)}K` : `${entry.size}B`}
                </span>
            )}
        </button>
    );
}

// ─── Simple Syntax Highlighter ───
function highlightCode(code: string, filename: string): JSX.Element[] {
    const ext = filename.split('.').pop()?.toLowerCase();
    const isJS = ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx';
    const isPython = ext === 'py';
    const isJSON = ext === 'json';

    return code.split('\n').map((line, i) => {
        let highlighted = line;
        // Basic keyword highlighting
        if (isJS || isPython) {
            highlighted = highlighted
                .replace(/(\/\/.*$)/gm, '<span class="text-muted-foreground">$1</span>')
                .replace(/(#.*$)/gm, '<span class="text-muted-foreground">$1</span>')
                .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|require|async|await|class|def|try|catch|throw|new)\b/g,
                    '<span class="text-purple-500">$1</span>')
                .replace(/\b(true|false|null|undefined|None|True|False)\b/g,
                    '<span class="text-amber-500">$1</span>')
                .replace(/(["'`])(?:(?!\1).)*\1/g,
                    '<span class="text-emerald-500">$&</span>');
        }
        if (isJSON) {
            highlighted = highlighted
                .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-blue-500">"$1"</span>')
                .replace(/:\s*(["'])(?:(?!\1).)*\1/g, (m) => `: <span class="text-emerald-500">${m.substring(2)}</span>`)
                .replace(/:\s*(\d+)/g, ': <span class="text-amber-500">$1</span>')
                .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-500">$1</span>');
        }

        return (
            <div key={i} className="flex hover:bg-muted/30 group/line">
                <span className="w-10 shrink-0 text-right pr-3 text-muted-foreground/50 select-none text-[11px] group-hover/line:text-muted-foreground">
                    {i + 1}
                </span>
                <span
                    className="flex-1 whitespace-pre text-foreground"
                    dangerouslySetInnerHTML={{ __html: highlighted || ' ' }}
                />
            </div>
        );
    });
}


// ═══════════════════════ MAIN COMPONENT ═══════════════════════

export default function CLIAgentGenerator() {
    const {
        activeSession,
        createSession,
        switchSession,
        deleteSession,
        updateActiveSession,
        recentChats
    } = useCLIGenerator();

    // ─── Component State (UI only) ───
    const [language, setLanguage] = useState<CLILanguage>("nodejs");

    // File tree + code viewer state (UI only, derived from context data where possible or kept local if transient)
    // Actually, fileTree should be persistent if we want it to survive navigation.
    // In Context: fileTree, projectPath

    // UI-only state:
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>("");
    const [fileContent, setFileContent] = useState<string>("");
    const [loadingFile, setLoadingFile] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [sidebarTab, setSidebarTab] = useState<'history' | 'files'>('history');
    const [terminalHeight, setTerminalHeight] = useState(240);
    const [isWaitingAI, setIsWaitingAI] = useState(false); // Kept local for now, could be in context if needed

    const chatScrollRef = useRef<HTMLDivElement>(null);
    const termScrollRef = useRef<HTMLDivElement>(null);

    // ─── Initialize Session if None ───
    useEffect(() => {
        if (!activeSession) {
            createSession();
        }
    }, [activeSession, createSession]);

    // ─── Derived State from Context ───
    const messages = activeSession?.messages || [];
    const terminalLines = activeSession?.terminalLines || [];
    const plan = activeSession?.plan || null;
    const projectPath = activeSession?.projectPath || null;
    const buildPhase = activeSession?.buildPhase || 'idle';
    const conversationHistory = activeSession?.conversationHistory || [];
    const fileTree = activeSession?.fileTree || [];

    // ─── Sync Local UI State ───
    // If language was stored in context, we'd sync it here. For now it's local default 'nodejs', 
    // but honestly user might want that persisted too. Let's assume it's fine for now or add to context later.

    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) {
            const el = chatScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (el) el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    // Auto-scroll terminal
    useEffect(() => {
        if (termScrollRef.current) {
            const el = termScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (el) el.scrollTop = el.scrollHeight;
        }
    }, [terminalLines]);

    // Load project files after build (or if projectPath exists and tree is empty)
    useEffect(() => {
        if (projectPath && fileTree.length === 0) {
            // Reload tree if missing
            loadProjectTree(projectPath).then(tree => {
                updateActiveSession({ fileTree: tree });
                setShowSidebar(true);
                setSidebarTab('files');
            }).catch(() => { });
        }
    }, [projectPath, fileTree.length, updateActiveSession]);

    // If we have a project path, ensure sidebar shows files
    useEffect(() => {
        if (projectPath && buildPhase === 'done') {
            // Only auto-switch if we just finished? 
            // Logic: if we have files, user probably wants to see them.
            // But don't force it every render.
        }
    }, [projectPath, buildPhase]);


    const addChatMessage = useCallback((msg: ChatMessage) => {
        updateActiveSession({ messages: [...messages, msg] });
    }, [messages, updateActiveSession]);

    const addTerminalLine = useCallback((line: TerminalLine) => {
        updateActiveSession({ terminalLines: [...terminalLines, line] });
    }, [terminalLines, updateActiveSession]);

    // Open file in code viewer
    const handleFileSelect = useCallback(async (filePath: string, fileName: string) => {
        setSelectedFile(filePath);
        setSelectedFileName(fileName);
        setLoadingFile(true);
        try {
            const result = await readFile(filePath);
            setFileContent(result.content);
        } catch (err: any) {
            setFileContent(`// Error reading file: ${err.message}`);
        }
        setLoadingFile(false);
    }, []);

    // ═══ Trigger build from plan (called when AI says action=build) ═══
    const triggerBuild = useCallback(async (buildPlan: CLIBuildPlan) => {
        updateActiveSession({
            buildPhase: 'building',
            plan: buildPlan,
            terminalLines: [...terminalLines, { id: uid(), type: 'info', content: `🔨 Building: ${buildPlan.displayName} (${buildPlan.files.length} files)`, timestamp: Date.now() }]
        });

        await executeBuildFromPlan(buildPlan, language, {
            onTerminal: (line) => {
                // We need to use functional updates carefully or just read latest from context? 
                // Context updates might be slow if we call them per line.
                // For now, let's just call update.
                // OPTIMIZATION: buffer these?
                updateActiveSession({ terminalLines: (prev) => [...(prev?.terminalLines || []), line] } as any);
            },
            onChat: (msg) => {
                updateActiveSession({ messages: (prev) => [...(prev?.messages || []), msg] } as any);
            },
            onComplete: (path) => {
                updateActiveSession({ projectPath: path, buildPhase: 'done' });
                loadProjectTree(path).then(tree => {
                    updateActiveSession({ fileTree: tree } as any);
                    setShowSidebar(true);
                    setSidebarTab('files');
                });
            },
            onError: () => updateActiveSession({ buildPhase: 'done' }),
        });
    }, [language, messages, terminalLines, updateActiveSession]);

    // ═══ Multi-Turn Conversational Send ═══
    const handleSend = useCallback(async (text: string, files?: File[]) => {
        if ((!text && (!files || files.length === 0)) || isWaitingAI) return;

        // Process files
        const attachments: { name: string; type: string; url: string }[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const dataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                    });
                    attachments.push({ name: file.name, type: file.type, url: dataUrl });
                }
            }
        }

        // Add user message to chat UI
        const userMsg: ChatMessage = {
            id: uid(),
            role: 'user',
            content: text,
            timestamp: Date.now(),
            attachments
        };

        const validMessages = Array.isArray(messages) ? messages : [];
        const updatedMessages = [...validMessages, userMsg];

        // For history sent to AI, we attach images if supported by backend, 
        // or just send text. For now, assume backend accepts the extra field or ignores it.
        // We cast to any to pass attachments in history
        const historyMsg: any = { role: 'user', content: text };
        if (attachments.length > 0) historyMsg.attachments = attachments;

        const validHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
        const updatedHistory = [...validHistory, historyMsg];

        // Update Context immediately
        updateActiveSession({
            messages: updatedMessages,
            conversationHistory: updatedHistory,
            // If first message, set gathering
            buildPhase: buildPhase === 'idle' ? 'gathering' : buildPhase
        });

        // Show thinking indicator (local UI state only, or transient message?)
        // Let's add transient message to context
        setIsWaitingAI(true);
        const thinkingMsg: ChatMessage = { id: uid(), role: 'assistant', content: 'Thinking...', timestamp: Date.now(), status: 'thinking' };
        updateActiveSession({ messages: [...updatedMessages, thinkingMsg] });

        try {
            // Send full conversation history to AI
            // We need the session ID for the AI service if it tracks it, 
            // but standard sendChatMessage usually takes history.
            // sessionId in original was just for unique ID.
            const response: ChatResponse = await sendChatMessage(updatedHistory, language, activeSession?.id || 'default');

            // Remove thinking message and add real response
            // Need to filter out thinking msg from the LATEST messages in context 
            // (user might have typed again? unlikely if disabled).

            // We can't easily "remove" from context without reading it back.
            // Helper:
            const nextMessages = (current: ChatMessage[]) => current.filter(m => m.id !== thinkingMsg.id);

            // Prepare AI message
            let aiMsg: ChatMessage;
            let actionUpdates: Partial<SessionData> = {};

            if (response.action === 'ask') {
                aiMsg = {
                    id: uid(),
                    role: 'assistant',
                    content: response.message,
                    timestamp: Date.now(),
                    status: 'done',
                };
                setIsWaitingAI(false);
            } else if (response.action === 'build' && response.plan) {
                aiMsg = {
                    id: uid(),
                    role: 'assistant',
                    content: response.message,
                    timestamp: Date.now(),
                    status: 'building',
                };
                setIsWaitingAI(false);
                // We'll trigger build after update
                // actionUpdates.plan = response.plan; // actually triggerBuild sets this
            } else {
                aiMsg = {
                    id: uid(),
                    role: 'assistant',
                    content: response.message || 'Something went wrong.',
                    timestamp: Date.now(),
                    status: 'done' // Default to done if unknown action
                };
                setIsWaitingAI(false);
            }

            // Commit updates
            updateActiveSession({
                messages: [...nextMessages([...updatedMessages, thinkingMsg]), aiMsg], // Simplify: just append to known state + filter
                conversationHistory: [...updatedHistory, { role: 'assistant', content: response.message }]
            });

            if (response.action === 'build' && response.plan) {
                await triggerBuild(response.plan);
            }

        } catch (err: any) {
            const errMsg: ChatMessage = {
                id: uid(),
                role: 'assistant',
                content: `❌ Error: ${err.message}`,
                timestamp: Date.now(),
                status: 'error',
            };
            // Remove thinking, add error
            updateActiveSession({
                messages: (prev) => [...(prev?.messages || []).filter(m => m.id !== thinkingMsg.id), errMsg]
            } as any);
            setIsWaitingAI(false);
        }
    }, [isWaitingAI, language, activeSession, messages, conversationHistory, buildPhase, triggerBuild, updateActiveSession]);


    const handleReset = () => {
        // Create NEW session instead of clearing current one?
        // User asked for "Reset" usually means "Clear this chat". 
        // But with persistence, maybe they want "New Chat"?
        // Original behavior: clear state.
        // Let's create a new session to preserve the old one in history (optional) 
        // OR just clear the current one.
        // "Reset" icon usually means "Restart".
        // Let's just create a new session, it's safer.
        createSession();
    };

    // For sidebar click
    const handleHistoryClick = (id: string) => {
        switchSession(id);
        // If switching sessions, we might want to reset local UI state like "selectedFile"
        setSelectedFile(null);
        setFileContent("");
        // showSidebar is global preference, keep it
    };

    const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        deleteSession(chatId);
    };

    const isBuilding = buildPhase === 'building';
    const isEmpty = messages.length === 0;

    const mode = getRuntimeMode();
    // Input is disabled only when waiting for AI response or during build
    const inputDisabled = isWaitingAI || buildPhase === 'building';

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-background rounded-xl border border-zinc-200 dark:border-border/40 shadow-sm overflow-hidden relative">

            {/* ═══ TOP BAR (Minimalist) ═══ */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/[0.05] bg-background/80 backdrop-blur-md sticky top-0 z-20 h-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-2 rounded-md hover:bg-muted/50"
                        title="Toggle Sidebar"
                    >
                        <span className="sr-only">Toggle Sidebar</span>
                        <Folder className={cn("h-4 w-4", !showSidebar && "opacity-50")} />
                    </button>
                    <span className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5" />
                        CLI Box
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {projectPath && (
                        <button
                            onClick={() => revealInFinder(projectPath)}
                            className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                        >
                            <FolderOpen className="h-3 w-3" />
                            {projectPath.split('/').pop()}
                        </button>
                    )}
                    {messages.length > 0 && (
                        <button onClick={handleReset} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors p-1">
                            <RotateCcw className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ MAIN WORKSPACE (3-Column Layout) ═══ */}
            <div className="flex-1 flex overflow-hidden relative bg-muted/20 dark:bg-[#09090b]/20">

                {/* ─── COLUMN 1: LEFT SIDEBAR (History & Explorer) ─── */}
                <div className={cn(
                    "w-[260px] border-r border-zinc-200 dark:border-border/40 bg-zinc-50/50 dark:bg-background/50 backdrop-blur-sm flex flex-col shrink-0 transition-all duration-300 ease-in-out",
                    !showSidebar && "w-0 border-r-0 overflow-hidden opacity-0"
                )}>
                    {showSidebar && (
                        <div className="flex flex-col h-full">
                            {/* Sidebar Tabs (Segmented Control) */}
                            <div className="px-2 pt-2 pb-1">
                                <div className="flex p-1 bg-zinc-100 dark:bg-muted/30 rounded-lg border border-zinc-200 dark:border-border/40">
                                    <button
                                        onClick={() => setSidebarTab('history')}
                                        className={cn(
                                            "flex-1 text-[11px] font-medium py-1 px-2 rounded-md transition-all text-center",
                                            sidebarTab === 'history'
                                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        History
                                    </button>
                                    <button
                                        onClick={() => setSidebarTab('files')}
                                        className={cn(
                                            "flex-1 text-[11px] font-medium py-1 px-2 rounded-md transition-all text-center",
                                            sidebarTab === 'files'
                                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        Explorer
                                    </button>
                                </div>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-1" />

                            <ScrollArea className="flex-1">
                                {sidebarTab === 'history' ? (
                                    <div className="p-2 space-y-1 w-full max-w-full overflow-x-hidden">
                                        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                                            Recent
                                        </div>
                                        {recentChats.map(chat => (
                                            <div
                                                key={chat.id}
                                                onClick={() => handleHistoryClick(chat.id)}
                                                className={cn(
                                                    "w-full text-left p-2 rounded-lg text-sm transition-all group flex items-center justify-between cursor-pointer relative",
                                                    activeSession?.id === chat.id
                                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <div className="overflow-hidden flex-1 min-w-0 pr-8">
                                                    <div className="font-medium truncate text-[12px]">{chat.title}</div>
                                                    <div className="text-[10px] opacity-70 truncate mt-0.5 font-normal">
                                                        {chat.preview}
                                                    </div>
                                                    <div className="text-[9px] opacity-50 mt-1.5 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400/50"></span>
                                                        {chat.date}
                                                    </div>
                                                </div>
                                                <div
                                                    role="button"
                                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-1 px-1">
                                        <div className="px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                            <span>Files</span>
                                            {fileTree.length > 0 && <span className="text-[9px] bg-muted px-1.5 rounded text-foreground">{fileTree.length}</span>}
                                        </div>

                                        {fileTree.length > 0 ? (
                                            fileTree.map(entry => (
                                                <FileTreeNode
                                                    key={entry.path}
                                                    entry={entry}
                                                    selectedFile={selectedFile}
                                                    onFileSelect={handleFileSelect}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-12 flex flex-col items-center opacity-40">
                                                <Folder className="h-8 w-8 text-muted-foreground mb-2" />
                                                <span className="text-[11px] text-muted-foreground">No files generated yet</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                {/* ─── COLUMN 2: CENTER PANEL (Editor + Terminal) ─── */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-background border-r border-zinc-200 dark:border-border/40 min-w-[300px]">

                    {/* Toggle Files Button (only if hidden) */}


                    {/* TOP HALF: Code Editor (Only visible if file is selected) */}
                    {selectedFile && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-[#0d1117]">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-white dark:bg-[#161b22] shrink-0">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-zinc-400">
                                    <span>{getFileIcon(selectedFileName)}</span>
                                    <span>{selectedFileName}</span>
                                </div>
                                <button onClick={() => { setSelectedFile(null); setFileContent(''); }} className="text-zinc-500 hover:text-zinc-300">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 font-mono text-[13px] leading-[1.6]">
                                    {loadingFile ? (
                                        <div className="flex items-center gap-2 text-zinc-500">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Reading...
                                        </div>
                                    ) : (
                                        highlightCode(fileContent, selectedFileName)
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* BOTTOM HALF: Terminal (Resizable or Full Height) */}
                    <div
                        className={cn(
                            "bg-zinc-100 dark:bg-[#09090b] flex flex-col shrink-0",
                            selectedFile ? "border-t border-border/40" : "flex-1 h-full"
                        )}
                        style={selectedFile ? { height: `${terminalHeight}px` } : undefined}
                    >
                        {/* Resizer & Header */}
                        <div
                            className={cn(
                                "flex items-center justify-between px-4 py-1.5 bg-zinc-100 dark:bg-[#121214] border-b border-border/40 dark:border-white/[0.05] shrink-0 transition-colors",
                                selectedFile ? "cursor-ns-resize hover:bg-zinc-200 dark:hover:bg-[#18181b]" : ""
                            )}
                            onMouseDown={(e) => {
                                if (!selectedFile) return; // Disable resize if full screen
                                const startY = e.clientY;
                                const startHeight = terminalHeight;
                                const onMove = (ev: MouseEvent) => {
                                    const newH = Math.max(100, Math.min(800, startHeight - (ev.clientY - startY)));
                                    setTerminalHeight(newH);
                                };
                                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                                window.addEventListener('mousemove', onMove);
                                window.addEventListener('mouseup', onUp);
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Terminal className="h-3 w-3 text-zinc-500" />
                                <span className="text-[11px] font-mono text-muted-foreground dark:text-zinc-400">Terminal</span>
                            </div>
                        </div>

                        <ScrollArea ref={termScrollRef} className="flex-1">
                            <div className="p-3 font-mono text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                                {terminalLines.map((line) => (
                                    <TermLine key={line.id} line={line} />
                                ))}
                                {isBuilding && (
                                    <div className="flex items-center gap-1.5 text-zinc-500 mt-2">
                                        <span className="animate-pulse">_</span>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                </div>

                {/* ─── COLUMN 3: RIGHT PANEL (Chat Interface) ─── */}
                {/* Right Panel - Chat Interface & Header */}
                <div className="w-[400px] flex flex-col border-l border-zinc-200 dark:border-border/40 bg-zinc-50 dark:bg-background shrink-0 h-full">
                    {/* Right Panel Header */}
                    <div className="h-10 border-b border-zinc-200 dark:border-white/[0.05] flex items-center justify-between px-4 bg-zinc-50 dark:bg-[#121214] shrink-0">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-medium text-foreground dark:text-zinc-200">Agent Builder</span>
                        </div>
                        {/* Language selector removed as per user request */}
                    </div>

                    {/* Chat Area - Scrollable */}
                    <div ref={chatScrollRef} className="flex-1 w-full overflow-y-auto min-h-0">
                        <div className="flex flex-col w-full pb-4">
                            {/* Empty State */}
                            {messages.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mt-20 opacity-0 animate-in fade-in slide-in-from-bottom-5 duration-700 fill-mode-forwards delay-100">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6 shadow-sm border border-indigo-500/10">
                                        <Bot className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-sm font-medium text-foreground mb-2">How can I help you build?</h3>
                                    <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                                        Describe the CLI tool you want to create, and I'll generate the code for you.
                                    </p>
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex flex-col w-full">
                                {Array.isArray(messages) && messages.map((msg) => (
                                    <ChatBubble key={msg.id} message={msg} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Input Area - Uplifted & Compact */}
                    <div className="px-3 pb-36 bg-zinc-50 dark:bg-background shrink-0 z-20">
                        <div className="shadow-lg rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                            <PromptInputBox
                                onSend={handleSend}
                                isLoading={isWaitingAI || isBuilding}
                                placeholder="Describe a CLI tool..."
                                className="border-none bg-white dark:bg-[#1F2023] shadow-none rounded-none min-h-[36px]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
