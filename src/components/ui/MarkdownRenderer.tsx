import React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './button';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Split by code blocks first
    const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);

    return (
        <div className="flex flex-col gap-4 w-full text-[16px] leading-relaxed tracking-[0.01em] text-zinc-800 dark:text-zinc-200">
            {parts.map((part, index) => {
                if (part.startsWith('```')) {
                    // This is a code block
                    const match = part.match(/```([\w]*)\n([\s\S]*?)```/);
                    if (match) {
                        const [, lang, code] = match;
                        return (
                            <div key={index} className="relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 my-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] group">
                                {/* Code Block Header */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-200/50 dark:bg-[#141414] border-b border-zinc-300/80 dark:border-zinc-800/80">
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 font-mono lowercase tracking-wide">
                                        {lang || 'text'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#ececec] hover:bg-zinc-300/50 dark:hover:bg-white/10 rounded-md transition-colors"
                                            onClick={() => handleCopy(code.trim())}
                                            title="Copy code"
                                        >
                                            {copiedCode === code.trim() ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                {/* Code Content */}
                                <div className="p-4 overflow-x-auto custom-scrollbar">
                                    <pre className="text-[14.5px] leading-[1.65] font-mono text-zinc-800 dark:text-[#D4D4D4]">
                                        <code>{code.trim()}</code>
                                    </pre>
                                </div>
                            </div>
                        );
                    }
                }

                // Handle inline markdown for non-code parts
                const renderInline = (text: string) => {
                    // A very basic parser for bold, inline code, and lists
                    const lines = text.split('\n');
                    return lines.map((line, i) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) {
                            return <div key={i} className="h-3" />;
                        }

                        let isList = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s/.test(trimmedLine);

                        // Handle lists styling
                        let parsedLine = trimmedLine;
                        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                            parsedLine = trimmedLine.substring(2);
                        } else if (/^\d+\.\s/.test(trimmedLine)) {
                            parsedLine = trimmedLine.replace(/^\d+\.\s/, '');
                        }

                        // Bold, inline code, and links
                        const segments = parsedLine.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);

                        const lineContent = segments.map((seg, j) => {
                            if (seg.startsWith('**') && seg.endsWith('**')) {
                                return <strong key={j} className="font-semibold text-zinc-900 dark:text-white tracking-tight">{seg.slice(2, -2)}</strong>;
                            }
                            if (seg.startsWith('`') && seg.endsWith('`')) {
                                return <code key={j} className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-200/50 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 text-[14px] font-mono">{seg.slice(1, -1)}</code>;
                            }
                            if (seg.startsWith('[') && seg.includes('](') && seg.endsWith(')')) {
                                const match = seg.match(/\[(.*?)\]\((.*?)\)/);
                                if (match) {
                                    const [, text, url] = match;
                                    return (
                                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 decoration-blue-500/30 hover:decoration-blue-400 transition-colors">
                                            {text}
                                        </a>
                                    );
                                }
                            }
                            return seg;
                        });

                        if (trimmedLine.startsWith('### ')) {
                            return <h3 key={i} className="text-xl font-semibold text-zinc-900 dark:text-white mt-5 mb-2">{trimmedLine.replace('###', '').trim()}</h3>;
                        }
                        if (trimmedLine.startsWith('## ')) {
                            return <h2 key={i} className="text-2xl font-bold text-zinc-900 dark:text-white mt-6 mb-3 tracking-tight">{trimmedLine.replace('##', '').trim()}</h2>;
                        }
                        if (trimmedLine.startsWith('# ')) {
                            return <h1 key={i} className="text-3xl font-bold text-zinc-900 dark:text-white mt-8 mb-4 tracking-tight">{trimmedLine.replace('#', '').trim()}</h1>;
                        }

                        return (
                            <div key={i} className={`mb-2.5 flex ${isList ? 'pl-2' : ''} leading-[1.7]`}>
                                {isList && (
                                    <span className="shrink-0 flex items-center justify-center w-5 mr-2 pt-[0.45rem]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                                    </span>
                                )}
                                <p className={`text-zinc-800 dark:text-[#ECECEC] ${isList ? 'flex-1' : ''}`}>
                                    {lineContent}
                                </p>
                            </div>
                        );
                    });
                };

                return (
                    <div key={index} className="text-zinc-800 dark:text-[#ECECEC]">
                        {renderInline(part)}
                    </div>
                );
            })}
        </div>
    );
};
