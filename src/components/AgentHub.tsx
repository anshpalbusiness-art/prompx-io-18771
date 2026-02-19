import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Monitor, Smartphone, Terminal
} from "lucide-react";
import { DesktopAppDownload } from "./DesktopAppDownload";
import { MobileOverlay } from "./MobileOverlay";
import CLIAgentGenerator from "./CLIAgentGenerator";

interface AgentHubProps {
    userId: string;
    planAccess?: {
        planType: string;
        isLoading: boolean;
    };
}

export const AgentHub = ({ userId, planAccess }: AgentHubProps) => {
    const [activeTab, setActiveTab] = useState("cli-generator");

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col items-center mb-2">
                    <TabsList className="bg-muted/30 p-1 h-auto rounded-xl inline-flex w-auto justify-center border border-border/40">
                        <TabsTrigger
                            value="cli-generator"
                            className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all duration-200"
                        >
                            <Terminal className="h-4 w-4" />
                            <span className="font-medium">CLI Generator</span>
                            <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 h-4 flex items-center bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none">New</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="desktop"
                            className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all duration-200"
                        >
                            <Monitor className="h-4 w-4" />
                            <span className="font-medium">Desktop App</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="mobile-overlay"
                            className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 transition-all duration-200"
                        >
                            <Smartphone className="h-4 w-4" />
                            <span className="font-medium">Mobile Overlay</span>
                            <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 h-4 flex items-center bg-primary/10 text-primary border-primary/20 shadow-none">New</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* CLI Generator Tab */}
                <TabsContent value="cli-generator" className="mt-0">
                    <CLIAgentGenerator />
                </TabsContent>

                {/* Desktop App Tab */}
                <TabsContent value="desktop" className="mt-0">
                    <DesktopAppDownload />
                </TabsContent>

                {/* Mobile Overlay Tab */}
                <TabsContent value="mobile-overlay" className="mt-0">
                    <MobileOverlay />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AgentHub;
