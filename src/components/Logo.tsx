import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    className?: string;
    onClick?: () => void;
}

export const Logo = ({ size = 'md', showText = true, className = '', onClick }: LogoProps) => {
    const sizeClasses = {
        sm: 'h-7 sm:h-8',
        md: 'h-9 lg:h-10',
        lg: 'h-12 sm:h-14'
    };

    const textSizes = {
        sm: 'text-base sm:text-lg',
        md: 'text-lg lg:text-xl',
        lg: 'text-2xl sm:text-3xl'
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 group ${className}`}
        >
            {/* Logo Image with Subtle Glow Effect */}
            <div className="relative">
                {/* Subtle Outer Glow - Reduced opacity */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-blue-500/30 rounded-xl opacity-0 group-hover:opacity-60 blur-sm transition-opacity duration-500" />

                {/* Logo Image */}
                <img
                    src="/promptx-logo.png"
                    alt="PromptX"
                    className={`${sizeClasses[size]} w-auto object-contain relative rounded-xl group-hover:scale-105 transition-transform duration-300`}
                />
            </div>

            {/* Text Logo (optional) */}
            {showText && (
                <span className={`${textSizes[size]} font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-300`}>
                    PromptX
                </span>
            )}
        </button>
    );
};

// Simple icon-only logo for collapsed sidebar - just uses the image
export const LogoIcon = ({ size = 'md', className = '', onClick }: Omit<LogoProps, 'showText'>) => {
    const sizeClasses = {
        sm: 'h-7',
        md: 'h-9',
        lg: 'h-11'
    };

    return (
        <button
            onClick={onClick}
            className={`relative group ${className}`}
        >
            {/* Subtle glow on hover only */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-xl opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-300" />

            {/* Logo Image */}
            <img
                src="/promptx-logo.png"
                alt="PromptX"
                className={`${sizeClasses[size]} w-auto object-contain relative rounded-xl group-hover:scale-105 transition-transform duration-300`}
            />
        </button>
    );
};

// Text-only logo for minimal spaces
export const LogoText = ({ size = 'md', className = '', onClick }: Omit<LogoProps, 'showText'>) => {
    const textSizes = {
        sm: 'text-base sm:text-lg',
        md: 'text-lg lg:text-xl',
        lg: 'text-2xl sm:text-3xl'
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 group ${className}`}
        >
            <span className={`${textSizes[size]} font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-300`}>
                PromptX
            </span>
        </button>
    );
};

export default Logo;
