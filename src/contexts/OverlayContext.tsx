import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { loadOverlaySettings, saveOverlaySettings } from "@/lib/overlayStyles";
import PromptXOverlayWidget from "@/components/PromptXOverlayWidget";

interface OverlayContextType {
    isActive: boolean;
    activate: () => void;
    deactivate: () => void;
    toggle: () => void;
}

const OverlayContext = createContext<OverlayContextType>({
    isActive: false,
    activate: () => { },
    deactivate: () => { },
    toggle: () => { },
});

export function useOverlay() {
    return useContext(OverlayContext);
}

export function OverlayProvider({ children }: { children: ReactNode }) {
    const [isActive, setIsActive] = useState(() => {
        return loadOverlaySettings().enabled;
    });

    const activate = useCallback(() => {
        setIsActive(true);
        saveOverlaySettings({ enabled: true });
    }, []);

    const deactivate = useCallback(() => {
        setIsActive(false);
        saveOverlaySettings({ enabled: false });
    }, []);

    const toggle = useCallback(() => {
        setIsActive(prev => {
            const next = !prev;
            saveOverlaySettings({ enabled: next });
            return next;
        });
    }, []);

    return (
        <OverlayContext.Provider value={{ isActive, activate, deactivate, toggle }}>
            {children}
            {isActive && <PromptXOverlayWidget onClose={deactivate} />}
        </OverlayContext.Provider>
    );
}
