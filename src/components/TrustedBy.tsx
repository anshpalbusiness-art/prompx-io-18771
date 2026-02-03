import { memo } from "react";
import { Building2, Globe, Cpu, Network, Zap, Shield, Database, Cloud } from "lucide-react";

const companies = [
    { name: "Acme Corp", icon: Building2 },
    { name: "GlobalTech", icon: Globe },
    { name: "Nebula AI", icon: Cpu },
    { name: "NetScale", icon: Network },
    { name: "FastTrack", icon: Zap },
    { name: "SecureNet", icon: Shield },
    { name: "DataFlow", icon: Database },
    { name: "CloudSync", icon: Cloud },
];

const TrustedBy = memo(() => {
    return (
        <div className="w-full py-12 border-y border-border/40 bg-muted/20 backdrop-blur-sm overflow-hidden relative z-10">
            <div className="container mx-auto px-4 mb-8 text-center">
                <p className="text-sm md:text-base font-semibold text-muted-foreground uppercase tracking-wider">
                    Trusted by innovative teams at
                </p>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee hover:[animation-play-state:paused] flex gap-12 sm:gap-24 items-center whitespace-nowrap py-4">
                    {[...companies, ...companies, ...companies].map((company, index) => (
                        <div key={index} className="flex items-center gap-3 text-muted-foreground/60 hover:text-foreground transition-colors duration-300">
                            <company.icon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                            <span className="text-lg sm:text-xl font-bold">{company.name}</span>
                        </div>
                    ))}
                </div>

                {/* Gradient masks for smooth fade */}
                <div className="absolute top-0 left-0 w-20 md:w-32 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-20 md:w-32 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            </div>
        </div>
    );
});

export default TrustedBy;
