"use client";

export default function MagicLoader({
    className,
    lines = 3,
}: {
    className?: string;
    lines?: number;
}) {
    return (
        <div className={`space-y-3 ${className || ""}`}>
            {/* Shimmer effect container */}
            <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">

                {/* Shimmer overlay animation */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-[var(--text-muted)]/10 to-transparent" />

                {/* Skeleton lines */}
                <div className="space-y-2.5">
                    <div className="h-4 w-3/4 rounded-md bg-[var(--text-muted)]/10" />
                    {Array.from({ length: Math.max(1, lines - 1) }).map((_, i) => (
                        <div
                            key={i}
                            className="h-3 rounded-md bg-[var(--text-muted)]/10"
                            style={{ width: `${85 - i * 10}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
