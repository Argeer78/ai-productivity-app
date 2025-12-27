"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/useT";
import { supabase } from "@/lib/supabaseClient";
import AnimatedNumber from "@/app/components/AnimatedNumber";

export default function DashboardGlance() {
    const { t } = useT();
    const [energy, setEnergy] = useState<number | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const today = new Date().toISOString().split("T")[0];

                // 1. Energy from LocalStorage (set by AI Task Creator)
                const savedEnergy = localStorage.getItem(`energy_${today}`);
                if (savedEnergy) setEnergy(parseInt(savedEnergy, 10));

                // 2. Score from DB
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase
                        .from("daily_scores")
                        .select("score")
                        .eq("user_id", user.id)
                        .eq("score_date", today)
                        .maybeSingle();

                    if (data) setScore(data.score);
                }
            } catch (err) {
                console.error("DashboardGlance error", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="animate-pulse h-32 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)]" />;

    return (
        <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Energy Card */}
            <Link
                href="/ai-task-creator"
                className="group relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--accent)] transition-all"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-4xl">⚡</span>
                </div>

                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    {t("glance.energy", "Vitality")}
                </p>

                <div className="flex items-baseline gap-1">
                    {energy !== null ? (
                        <>
                            <span className={`text-3xl font-bold ${energy >= 7 ? "text-emerald-400" : energy <= 3 ? "text-red-400" : "text-yellow-400"
                                }`}>
                                {energy}
                            </span>
                            <span className="text-sm text-[var(--text-muted)]">/10</span>
                        </>
                    ) : (
                        <span className="text-sm text-[var(--text-muted)] italic">
                            {t("glance.tapToSet", "Tap to set")}
                        </span>
                    )}
                </div>

                {energy !== null && (
                    <div className="mt-3 h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${energy >= 7 ? "bg-emerald-400" : energy <= 3 ? "bg-red-400" : "bg-yellow-400"
                                }`}
                            style={{ width: `${energy * 10}%` }}
                        />
                    </div>
                )}
            </Link>

            {/* Success Score Card */}
            <Link
                href="/daily-success"
                className="group relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-purple-400 transition-all"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-4xl">🎯</span>
                </div>

                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    {t("glance.success", "Success")}
                </p>

                <div className="flex items-baseline gap-1">
                    {score !== null ? (
                        <>
                            <span className="text-3xl font-bold text-purple-400">
                                <AnimatedNumber value={score} />
                            </span>
                            <span className="text-sm text-[var(--text-muted)]">/100</span>
                        </>
                    ) : (
                        <span className="text-sm text-[var(--text-muted)] italic">
                            {t("glance.tapToRate", "Tap to rate")}
                        </span>
                    )}
                </div>

                {score !== null && (
                    <div className="mt-3 h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-400 rounded-full"
                            style={{ width: `${score}%` }}
                        />
                    </div>
                )}
            </Link>
        </div>
    );
}
