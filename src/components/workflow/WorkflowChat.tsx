import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, MessageSquare, Mic, MicOff, ImagePlus, X } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface WorkflowChatProps {
    onCreateWorkflow: (goal: string, image?: string) => Promise<void>;
    isPlanning: boolean;
    error: string | null;
    hasActiveWorkflow: boolean;
}

export const WorkflowChat: React.FC<WorkflowChatProps> = ({
    onCreateWorkflow,
    isPlanning,
    error,
    hasActiveWorkflow,
}) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'system'; content: string }>>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();

    // Sync voice transcript to input
    useEffect(() => {
        if (transcript) setInput(transcript);
    }, [transcript]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isPlanning) return;

        const goal = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: goal }]);
        setMessages(prev => [...prev, { role: 'system', content: '🧠 Analyzing your goal and designing a workflow...' }]);

        try {
            await onCreateWorkflow(goal, imagePreview || undefined);
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'system', content: '✅ Workflow created! Click "Run" to execute it.' },
            ]);
            setImagePreview(null);
        } catch (err: any) {
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'system', content: `❌ ${err.message || 'Failed to create workflow'}` },
            ]);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const suggestions = [
        "Help me manage my e-commerce business",
        "Handle my emails efficiently",
        "Plan and manage my YouTube channel",
        "Track and manage freelance projects",
        "Automate my social media content",
        "Organize my daily productivity workflow",
    ];

    return (
        <div className="border-t border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl">
            {/* Messages */}
            <AnimatePresence>
                {messages.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="max-h-48 overflow-y-auto px-4 py-3 space-y-2"
                    >
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`text-xs ${msg.role === 'user' ? 'text-zinc-300' : 'text-zinc-500'}`}
                            >
                                <span className="font-medium mr-1.5">
                                    {msg.role === 'user' ? '→' : '⚡'}
                                </span>
                                {msg.content}
                            </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Suggestions (when no workflow) */}
            {!hasActiveWorkflow && messages.length === 0 && (
                <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 font-medium">Try a workflow</p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(s)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-700/40 transition-all duration-200"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Image Preview */}
            <AnimatePresence>
                {imagePreview && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pt-2"
                    >
                        <div className="relative inline-block">
                            <img src={imagePreview} alt="Upload" className="h-16 rounded-lg border border-zinc-700/50" />
                            <button
                                onClick={() => setImagePreview(null)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 px-4">
                {/* Image Upload */}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPlanning}
                    className="flex-shrink-0 w-9 h-9 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 flex items-center justify-center transition-all disabled:opacity-50"
                    title="Attach image"
                >
                    <ImagePlus className="w-4 h-4" />
                </button>

                {/* Voice */}
                {isSupported && (
                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        disabled={isPlanning}
                        className={`flex-shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${isListening
                                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                                : 'bg-zinc-900/60 border-zinc-800/50 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30'
                            }`}
                        title={isListening ? 'Stop recording' : 'Voice input'}
                    >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                )}

                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening
                            ? '🎙️ Listening...'
                            : hasActiveWorkflow
                                ? "Describe a new workflow goal..."
                                : "What do you want to accomplish? (e.g., 'Help me manage my business')"
                        }
                        disabled={isPlanning}
                        className="w-full bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all disabled:opacity-50"
                    />
                    {isPlanning && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={!input.trim() || isPlanning}
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed"
                >
                    {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
            </form>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-3"
                    >
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
