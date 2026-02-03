import * as React from "react";

interface ChatbotLoaderProps {
    size?: number;
    text?: string;
}

export const ChatbotLoader: React.FC<ChatbotLoaderProps> = ({
    size = 60,
    text = "PromptX"
}) => {
    return (
        <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
            {/* Outer Ring */}
            <div
                className="absolute inset-0 rounded-full border-2 border-t-slate-900 border-r-transparent border-b-slate-900/30 border-l-transparent dark:border-t-white dark:border-b-white/30 animate-loader-spin"
            ></div>

            {/* Inner Ring */}
            <div
                className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-slate-500 border-b-transparent border-l-slate-500/50 dark:border-r-slate-400 dark:border-l-slate-400/50 animate-loader-reverse-spin"
            ></div>

            {/* Center Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-900/5 dark:bg-white/10 blur-xl"></div>
            </div>

            {/* Text */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs font-medium tracking-widest text-slate-900 dark:text-white/90 animate-loader-text bg-gradient-to-r from-slate-900 via-slate-500 to-slate-900 dark:from-white dark:via-slate-400 dark:to-white bg-clip-text text-transparent">
                    {text}
                </span>
            </div>
        </div>
    );
};
