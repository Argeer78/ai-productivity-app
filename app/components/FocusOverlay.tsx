"use client";

import { useState, useEffect, useRef } from "react";
import { useSound } from "@/lib/sound";
import { useT } from "@/lib/useT";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function FocusOverlay({ isOpen, onClose }: Props) {
    const { t } = useT();
    const sound = useSound();
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
    const [isActive, setIsActive] = useState(false);
    const [ambient, setAmbient] = useState<"none" | "white_noise" | "rain">("none");
    const [showControls, setShowControls] = useState(true);

    // Sync ambient sound
    useEffect(() => {
        if (!isOpen) {
            sound.stopAmbient();
            setAmbient("none");
            setIsActive(false);
            return;
        }
    }, [isOpen]);

    useEffect(() => {
        if (ambient === "none") {
            sound.stopAmbient();
        } else {
            // @ts-ignore - added via dynamic update
            sound.playAmbient(ambient);
        }
    }, [ambient]);

    // Timer
    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((t) => t - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            sound.play("success"); // Done!
            setAmbient("none"); // Quiet down
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // Hide mouse/controls on inactivity
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const handleMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };

        if (isOpen && isActive) {
            window.addEventListener("mousemove", handleMove);
            timeout = setTimeout(() => setShowControls(false), 3000);
        } else {
            setShowControls(true);
        }

        return () => {
            window.removeEventListener("mousemove", handleMove);
            clearTimeout(timeout);
        };
    }, [isOpen, isActive]);

    if (!isOpen) return null;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeString = `${mins}:${secs.toString().padStart(2, "0")}`;

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-body)] flex flex-col items-center justify-center transition-all duration-500">

            {/* Background Ambience Visual (Optional: Subtle gradient shift) */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isActive ? "opacity-30" : "opacity-0"}`}>
                <div className="absolute inset-0 bg-gradient-radial from-[var(--accent)] to-transparent opacity-20 transform scale-150 animate-pulse-slow" />
            </div>

            {/* Main Timer */}
            <div className="relative z-10 text-center">
                <div className="text-[12rem] font-bold tabular-nums tracking-tighter leading-none select-none text-[var(--text-main)] transition-all duration-300 transform scale-100">
                    {timeString}
                </div>

                <div className={`mt-8 flex gap-4 justify-center transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
                    <button
                        onClick={() => {
                            setIsActive(!isActive);
                            if (!isActive) sound.play("click");
                        }}
                        className="h-16 w-16 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-[var(--accent)]/30"
                    >
                        {isActive ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="2" /><rect x="14" y="4" width="4" height="16" rx="2" /></svg>
                        ) : (
                            <svg ml-1 width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            setIsActive(false);
                            setTimeLeft(25 * 60);
                            setAmbient("none");
                            onClose();
                        }}
                        className="h-16 w-16 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400 flex items-center justify-center hover:scale-105 transition-all"
                        title="Exit Focus Mode"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            {/* Sound Controls */}
            <div className={`absolute bottom-12 left-0 right-0 flex justify-center gap-2 transition-opacity duration-500 ${showControls ? "opacity-100" : "opacity-0"}`}>
                {(["none", "white_noise", "rain"] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setAmbient(type)}
                        className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${ambient === type
                                ? "bg-[var(--text-main)] text-[var(--bg-body)] border-[var(--text-main)]"
                                : "bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--text-main)]"
                            }`}
                    >
                        {type === "none" ? "Silent" : type === "white_noise" ? "White Noise" : "Rain"}
                    </button>
                ))}
            </div>

        </div>
    );
}
