"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSound } from "@/lib/sound";

type AmbientType = "none" | "white_noise" | "rain" | "river";

interface FocusContextType {
    isActive: boolean;
    isPaused: boolean;
    timeLeft: number;
    ambient: AmbientType;
    isMinimized: boolean;

    startSession: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    stopSession: () => void;
    toggleMinimize: () => void;
    setAmbientSound: (type: AmbientType) => void;

    // For direct timer manipulation if needed
    setTimeLeft: (seconds: number) => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: React.ReactNode }) {
    const sound = useSound();

    const [isActive, setIsActive] = useState(false); // Session is "open" (running or paused)
    const [isPaused, setIsPaused] = useState(false); // Timer is actively halted
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [ambient, setAmbient] = useState<AmbientType>("none");
    const [isMinimized, setIsMinimized] = useState(false);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        // Finished
                        handleComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive, isPaused]); // Removed timeLeft dependency

    // Audio Sync
    useEffect(() => {
        if (!isActive || ambient === "none") {
            sound.stopAmbient();
        } else {
            // @ts-ignore
            sound.playAmbient(ambient);
        }
    }, [isActive, ambient]);

    const handleComplete = () => {
        setIsActive(false);
        setIsPaused(false);
        setAmbient("none");
        sound.play("success");
    };

    const startSession = useCallback(() => {
        setIsActive(true);
        setIsPaused(false);
        if (timeLeft === 0) setTimeLeft(25 * 60);
        setIsMinimized(false);
        sound.play("click");
    }, [timeLeft]);

    const pauseSession = useCallback(() => {
        setIsPaused(true);
        sound.play("click");
    }, []);

    const resumeSession = useCallback(() => {
        setIsPaused(false);
        sound.play("click");
    }, []);

    const stopSession = useCallback(() => {
        setIsActive(false);
        setIsPaused(false);
        setAmbient("none");
        setTimeLeft(25 * 60);
        setIsMinimized(false);
    }, []);

    const toggleMinimize = useCallback(() => {
        setIsMinimized(prev => !prev);
    }, []);

    const setAmbientSound = useCallback((type: AmbientType) => {
        setAmbient(type);
    }, []);

    return (
        <FocusContext.Provider
            value={{
                isActive,
                isPaused,
                timeLeft,
                ambient,
                isMinimized,
                startSession,
                pauseSession,
                resumeSession,
                stopSession,
                toggleMinimize,
                setAmbientSound,
                setTimeLeft
            }}
        >
            {children}
        </FocusContext.Provider>
    );
}

export function useFocus() {
    const context = useContext(FocusContext);
    if (context === undefined) {
        throw new Error("useFocus must be used within a FocusProvider");
    }
    return context;
}
