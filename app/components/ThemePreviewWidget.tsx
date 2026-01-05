"use client";

import { useTheme } from "@/app/components/ThemeProvider";
import Link from "next/link";
import { Check } from "lucide-react";

export default function ThemePreviewWidget() {
    const { theme, setTheme } = useTheme();

    const PREVIEWS = [
        { id: "rainbow", label: "Rainbow", icon: "🌈", color: "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" },
        { id: "gold", label: "Luxury Gold", icon: "🏆", color: "bg-gradient-to-r from-yellow-400 to-amber-600 text-white" },
        { id: "light", label: "Light", icon: "☀️", color: "bg-white border border-slate-200 text-slate-900" },
    ] as const;

    return (
        <div className="inline-flex flex-col md:flex-row items-center gap-3 p-2 pr-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-sm mb-8 backdrop-blur animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 px-2">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Try Themes</span>
            </div>

            <div className="flex items-center gap-2">
                {PREVIEWS.map((p) => {
                    const isActive = theme === p.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => setTheme(p.id)}
                            className={`
                group relative px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${isActive ? 'ring-2 ring-[var(--accent)] scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'}
                ${p.color}
              `}
                        >
                            <span className="mr-1.5">{p.icon}</span>
                            {p.label}
                            {isActive && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm">
                                    <Check className="h-2 w-2" strokeWidth={4} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="h-4 w-px bg-[var(--border-subtle)] hidden md:block" />

            <Link
                href="/settings"
                className="text-[10px] sm:text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:underline decoration-[var(--accent)] underline-offset-2 transition-colors whitespace-nowrap"
            >
                View more in settings →
            </Link>
        </div>
    );
}
