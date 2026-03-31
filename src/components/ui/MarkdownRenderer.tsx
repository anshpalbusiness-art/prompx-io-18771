import React from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { Button } from './button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../theme-provider';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
    const { theme } = useTheme();

    // Determine if the *actual* active theme is dark
    const isDark = React.useMemo(() => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        // Fallback to system preference if theme is 'system'
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return true; // Default server-side assumption
    }, [theme]);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Split by code blocks first
    const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);

    return (
        <div className="flex flex-col gap-4 w-full text-[16px] leading-[1.65] tracking-[0.01em] text-zinc-800 dark:text-zinc-200">
            {parts.map((part, index) => {
                if (part.startsWith('```')) {
                    // This is a code block
                    const match = part.match(/```([\w]*)\n([\s\S]*?)```/);
                    if (match) {
                        const [, lang, code] = match;
                        return (
                            <div key={index} className="relative rounded-xl overflow-hidden bg-zinc-50 dark:bg-[#000000] border border-zinc-200 dark:border-zinc-800/80 my-4 shadow-sm group">
                                {/* Code Block Header */}
                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-[#0A0A0A] border-b border-zinc-200 dark:border-zinc-800/50">
                                    <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 font-mono tracking-wide capitalize">
                                        {lang || 'text'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#ececec] hover:bg-zinc-300/50 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-mono"
                                            onClick={() => handleCopy(code.trim())}
                                            title="Run code"
                                        >
                                            <Play className="h-3 w-3 mr-1.5" /> Run
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#ececec] hover:bg-zinc-300/50 dark:hover:bg-white/10 rounded-md transition-colors text-xs font-mono"
                                            onClick={() => handleCopy(code.trim())}
                                            title="Copy code"
                                        >
                                            {copiedCode === code.trim() ? (
                                                <><Check className="h-3 w-3 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Copied</>
                                            ) : (
                                                <><Copy className="h-3 w-3 mr-1.5" /> Copy</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                {/* Code Content */}
                                <div className="text-[14px]">
                                    <SyntaxHighlighter
                                        language={lang || 'typescript'}
                                        style={isDark ? vscDarkPlus : coy}
                                        customStyle={{
                                            margin: 0,
                                            padding: '1rem',
                                            background: 'transparent',
                                            lineHeight: '1.5',
                                            fontSize: '13px',
                                        }}
                                        codeTagProps={{
                                            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }
                                        }}
                                    >
                                        {code.trim()}
                                    </SyntaxHighlighter>
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

                        let parsedLine = trimmedLine;
                        let isList = false;
                        let isOrderedList = false;
                        let orderedIndex = '';
                        let isHeading1 = false;
                        let isHeading2 = false;
                        let isHeading3 = false;

                        if (trimmedLine.startsWith('### ')) {
                            parsedLine = trimmedLine.substring(4);
                            isHeading3 = true;
                        } else if (trimmedLine.startsWith('## ')) {
                            parsedLine = trimmedLine.substring(3);
                            isHeading2 = true;
                        } else if (trimmedLine.startsWith('# ')) {
                            parsedLine = trimmedLine.substring(2);
                            isHeading1 = true;
                        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                            parsedLine = trimmedLine.substring(2);
                            isList = true;
                        } else if (/^\d+\.\s/.test(trimmedLine)) {
                            const match = trimmedLine.match(/^(\d+\.\s)/);
                            if (match) {
                                // Keep the number but mark it as a list to get indentation
                                parsedLine = trimmedLine.substring(match[1].length);
                                isList = true;
                                isOrderedList = true;
                                orderedIndex = match[1].trim();
                            }
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

                        if (isHeading3) {
                            return <h3 key={i} className="text-[1.1rem] font-bold text-zinc-900 dark:text-white mt-6 mb-2 tracking-tight">{lineContent}</h3>;
                        }
                        if (isHeading2) {
                            return <h2 key={i} className="text-[1.25rem] font-bold text-zinc-900 dark:text-white mt-8 mb-3 tracking-tight">{lineContent}</h2>;
                        }
                        if (isHeading1) {
                            return <h1 key={i} className="text-[1.5rem] font-bold text-zinc-900 dark:text-white mt-8 mb-4 tracking-tight">{lineContent}</h1>;
                        }

                        // Determine indentation based on original line whitespace
                        const indentLevel = Math.max(0, Math.floor((line.length - line.trimStart().length) / 2));
                        const plClass = isList ? (indentLevel === 0 ? 'pl-2' : indentLevel === 1 ? 'pl-8' : 'pl-12') : '';

                        return (
                            <div key={i} className={`mb-3 flex ${plClass} leading-[1.7]`}>
                                {isList && (
                                    <span className="shrink-0 flex items-start justify-center w-6 mr-2 pt-[0.2rem]">
                                        {isOrderedList ? (
                                            <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">{orderedIndex}</span>
                                        ) : indentLevel > 0 ? (
                                            <span className="w-1.5 h-1.5 rounded-full border border-zinc-400 dark:border-zinc-500 bg-transparent mt-[0.4rem]" />
                                        ) : (
                                            <span className="w-[5px] h-[5px] rounded-full bg-zinc-800 dark:bg-zinc-200 mt-[0.45rem]" />
                                        )}
                                    </span>
                                )}
                                <p className={`text-[16px] text-zinc-800 dark:text-[#ECECEC] ${isList ? 'flex-1' : ''}`}>
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
