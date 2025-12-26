"use client";

import { useMemo } from "react";

function splitLines(text: string) {
    return (text || "")
        .split("\n")
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
}

function looksLikeHeading(line: string) {
    // simple heuristics: "TOP 3 PRIORITIES:", "SCHEDULE:", "FOCUS TIPS:" etc.
    if (/^[A-Z0-9\s\-]{6,}:$/.test(line)) return true;
    if (/^(top|schedule|focus|summary|next|highlights)\b/i.test(line) && line.endsWith(":")) return true;
    return false;
}

function stripBullet(line: string) {
    return line.replace(/^[-•\u2022]\s+/, "").trim();
}

export default function AiResultCard({
    title,
    text,
    loading,
    error,
    onUseWithAssistant,
    assistantHint,
    className,
}: {
    title?: string;
    text?: string | null;
    loading?: boolean;
    error?: string | null;
    onUseWithAssistant?: () => void;
    assistantHint?: string;
    className?: string;
}) {
    const blocks = useMemo(() => {
        const lines = splitLines(text || "");

        // Group into sections based on headings
        const sections: { heading?: string; items: string[] }[] = [];
        let current: { heading?: string; items: string[] } = { items: [] };

        for (const line of lines) {
            if (looksLikeHeading(line)) {
                if (current.heading || current.items.length) sections.push(current);
                current = { heading: line.replace(/:$/, "").trim(), items: [] };
                continue;
            }

            // bullet-ish
            if (/^[-•\u2022]\s+/.test(line)) {
                current.items.push(stripBullet(line));
            } else {
                current.items.push(line);
            }
        }

        if (current.heading || current.items.length) sections.push(current);

        return sections;
    }, [text]);

    return (
        <div
            className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm ${className || ""}`}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                    {title && <h3 className="text-sm font-semibold text-[var(--text-main)]">{title}</h3>}
                    <p className="text-[11px] text-[var(--text-muted)]">
                        Clean AI output (read-only). You can send it to the assistant for more ideas.
                    </p>
                </div>

                {onUseWithAssistant && (
                    <button
                        type="button"
                        onClick={onUseWithAssistant}
                        className="shrink-0 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[11px]"
                        title={assistantHint || "Open in assistant"}
                    >
                        Use with Assistant
                    </button>
                )}
            </div>

            {loading && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-[11px] text-[var(--text-muted)]">
                    Generating…
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-200">
                    {error}
                </div>
            )}

            {!loading && !error && (!!text ? (
                <div className="mt-2 space-y-4">
                    {blocks.map((sec, idx) => (
                        <div key={idx} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                            {sec.heading && (
                                <p className="text-[11px] font-semibold text-[var(--text-main)] mb-2">
                                    {sec.heading}
                                </p>
                            )}

                            <div className="space-y-1.5 text-[12px] text-[var(--text-main)] leading-relaxed">
                                {sec.items.map((it, i) => {
                                    // render as bullet if it looks like a list item
                                    const isListy = it.length < 140 && !it.includes(". ") && !it.includes(": ");
                                    return (
                                        <div key={i} className="flex gap-2">
                                            <span className="opacity-60 select-none">•</span>
                                            <span>{it}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-[11px] text-[var(--text-muted)]">
                    No result yet.
                </div>
            ))}
        </div>
    );
}
