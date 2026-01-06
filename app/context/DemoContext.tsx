"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

type DemoContextType = {
    isDemoMode: boolean;
    hasUsedDemo: boolean;
    startDemo: () => void;
    endDemo: () => void;
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEY_DEMO_ACTIVE = "aph_demo_active";
const STORAGE_KEY_DEMO_USED = "aph_demo_used";

import { supabase } from "@/lib/supabaseClient";

// ... existing code ...

export function DemoProvider({ children }: { children: ReactNode }) {
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [hasUsedDemo, setHasUsedDemo] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // 1. Initial check from storage
        const active = sessionStorage.getItem(STORAGE_KEY_DEMO_ACTIVE) === "true";
        const used = localStorage.getItem(STORAGE_KEY_DEMO_USED) === "true";
        setIsDemoMode(active);
        setHasUsedDemo(used);

        // 2. Listen for auth changes - if user logs in, KILL demo mode
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                // User is logged in, ensure demo mode is OFF
                if (sessionStorage.getItem(STORAGE_KEY_DEMO_ACTIVE)) {
                    sessionStorage.removeItem(STORAGE_KEY_DEMO_ACTIVE);
                }
                setIsDemoMode(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const startDemo = () => {
        sessionStorage.setItem(STORAGE_KEY_DEMO_ACTIVE, "true");
        localStorage.setItem(STORAGE_KEY_DEMO_USED, "true");
        setIsDemoMode(true);
        setHasUsedDemo(true);
        router.refresh();
    };

    const endDemo = () => {
        sessionStorage.removeItem(STORAGE_KEY_DEMO_ACTIVE);
        setIsDemoMode(false);
        // If we are on a page that needs auth, let it redirect. 
        // If we are on home specificially, good.
        // We push to auth to encourage signup? Or just home?
        // User asked to exit, usually implies they want to sign up or leave.
        router.push("/auth?signup=true");
    };

    return (
        <DemoContext.Provider value={{ isDemoMode, hasUsedDemo, startDemo, endDemo }}>
            {children}
        </DemoContext.Provider>
    );
}

export function useDemo() {
    const context = useContext(DemoContext);
    if (!context) {
        throw new Error("useDemo must be used within a DemoProvider");
    }
    return context;
}
