"use client";

import { useSound } from "@/lib/sound";
import { useT } from "@/lib/useT";
import { useFocus } from "@/app/context/FocusContext";

import BreathingCircle from "@/app/components/BreathingCircle";

export default function FocusOverlay() {
    const { t } = useT();
    const sound = useSound();

    // Consume Global Context
    const {
        isActive,
        isPaused,
        timeLeft,
        ambient,
        setAmbientSound,
        pauseSession,
        resumeSession,
        stopSession,
        toggleMinimize
    } = useFocus();

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeString = `${mins}:${secs.toString().padStart(2, "0")}`;

    // Note: Timer and Audio logic are now handled in FocusContext

    return (
        <div className="fixed inset-0 z-[99999] bg-[var(--bg-body)] flex flex-col items-center justify-center animate-in fade-in duration-300">

            {/* Background Zen Visual */}
            <BreathingCircle isPaused={isPaused} />

            {/* Main Timer */}
            <div className="relative z-10 text-center">
                <div className="text-[12rem] font-bold tabular-nums tracking-tighter leading-none select-none text-[var(--text-main)]">
                    {timeString}
                </div>

                <div className="mt-8 flex gap-4 justify-center">
                    {/* Play/Pause */}
                    <button
                        onClick={() => {
                            if (isPaused) resumeSession();
                            else pauseSession();
                        }}
                        className="h-16 w-16 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-[var(--accent)]/30"
                    >
                        {!isPaused ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="2" /><rect x="14" y="4" width="4" height="16" rx="2" /></svg>
                        ) : (
                            <svg className="ml-1" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    {/* Minimize (Floating Mode) */}
                    <button
                        onClick={toggleMinimize}
                        className="h-16 w-16 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] flex items-center justify-center hover:scale-105 transition-all"
                        title="Minimize"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
                    </button>

                    {/* Exit/Stop */}
                    <button
                        onClick={() => {
                            if (confirm("Stop focus session?")) stopSession();
                        }}
                        className="h-16 w-16 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400 flex items-center justify-center hover:scale-105 transition-all"
                        title="Exit Focus Mode"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            {/* Sound Controls */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2">
                {(["none", "river", "rain"] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setAmbientSound(type)}
                        className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${ambient === type
                            ? "bg-[var(--text-main)] text-[var(--bg-body)] border-[var(--text-main)]"
                            : "bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--text-main)]"
                            }`}
                    >
                        {type === "none" ? "Silent" : type === "river" ? "River" : "Rain"}
                    </button>
                ))}
            </div>

        </div>
    );
}
