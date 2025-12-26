"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/useT";

export default function DashboardGlance({
    todayScore,
}: {
    todayScore: number | null;
}) {
    const { t } = useT();
    const [energy, setEnergy] = useState<number | null>(null);

    useEffect(() => {
        // Attempt to load today's energy from local storage
        // Key format: "energy_YYYY-MM-DD"
        const today = new Date().toISOString().split("T")[0];
        const stored = localStorage.getItem(`energy_${today}`);
        if (stored) {
            setEnergy(Number(stored));
        }
    }, []);

    if (todayScore === null && energy === null) return null;

    return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-card)] p-4 shadow-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl -mr-10 -mt-10" />

            <p className="text-xs font-semibold text-[var(--text-muted)] mb-3 relative z-10">
                {t("dashboard.glance.title", "AT A GLANCE")}
            </p>

            <div className="flex items-center justify-between gap-4 relative z-10">
                {/* Left: Energy */}
                <div className="flex-1">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        {t("dashboard.glance.energy", "Energy")}
                    </p>
                    <div className="flex items-center gap-2">
                        {energy !== null ? (
                            <>
                                <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-body)] rounded-full border border-[var(--border-subtle)]">
                                    <span className="text-base">
                                        {energy >= 8 ? "⚡" : energy >= 4 ? "🔋" : "🪫"}
                                    </span>
                                </div>
                                <div>
                                    <span className={`text-lg font-bold ${energy >= 8 ? "text-emerald-500" : energy >= 4 ? "text-yellow-500" : "text-red-500"
                                        }`}>
                                        {energy}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">/10</span>
                                </div>
                            </>
                        ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">
                                {t("dashboard.glance.noEnergy", "Not recorded")}
                            </span>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-[var(--border-subtle)]" />

                {/* Right: Score */}
                <div className="flex-1 text-right">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                        {t("dashboard.glance.score", "Success Score")}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        {todayScore !== null ? (
                            <>
                                <div>
                                    <span className={`text-lg font-bold ${todayScore >= 80 ? "text-emerald-500" : todayScore >= 60 ? "text-[var(--accent)]" : "text-[var(--text-main)]"
                                        }`}>
                                        {todayScore}
                                    </span>
                                </div>
                                <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-body)] rounded-full border border-[var(--border-subtle)]">
                                    <span className="text-base">
                                        {todayScore >= 80 ? "🏆" : todayScore >= 60 ? "⭐" : "📈"}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">
                                {t("dashboard.glance.noScore", "No score yet")}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
