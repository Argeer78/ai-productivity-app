"use client";

import { useFocus } from "@/app/context/FocusContext";

export default function FloatingPlayer() {
    const {
        timeLeft,
        isPaused,
        pauseSession,
        resumeSession,
        stopSession,
        toggleMinimize
    } = useFocus();

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeString = `${mins}:${secs.toString().padStart(2, "0")}`;

    return (
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2 p-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-2xl animate-in slide-in-from-bottom-4 fade-in">

            {/* Expand */}
            <button
                onClick={toggleMinimize}
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-[var(--bg-card)] transition-colors text-[var(--accent)]"
                title="Expand"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            </button>

            {/* Time */}
            <div className="font-mono font-bold text-sm min-w-[3rem] text-center tabular-nums">
                {timeString}
            </div>

            {/* Play/Pause */}
            <button
                onClick={isPaused ? resumeSession : pauseSession}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] hover:scale-105 transition-transform"
            >
                {!isPaused ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                    <svg className="ml-0.5" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                )}
            </button>

            {/* Close/Stop */}
            <button
                onClick={() => {
                    if (confirm("Stop focus session?")) stopSession();
                }}
                className="h-8 w-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                title="Stop"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    );
}
