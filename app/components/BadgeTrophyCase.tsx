"use client";

import { useMemo } from "react";
import { useT } from "@/lib/useT";

type BadgeType = "streak-7" | "perfect" | "early-bird";

interface BadgeProps {
    id: BadgeType;
    unlocked: boolean;
    unlockedAt?: string; // ISO date
}

export default function BadgeTrophyCase({
    streak,
    scores, // Array of recent scores
    morningPlans, // Array of recent plan timestamps
}: {
    streak: number;
    scores: number[];
    morningPlans: string[];
}) {
    const { t } = useT();

    // 1. Calculate Badges
    const badges = useMemo(() => {
        const list: BadgeProps[] = [];

        // Badge: Streak 7
        const hasStreak7 = streak >= 7;
        list.push({
            id: "streak-7",
            unlocked: hasStreak7,
        });

        // Badge: Perfect Score (100)
        const hasPerfect = scores.some((s) => s >= 100);
        list.push({
            id: "perfect",
            unlocked: hasPerfect,
        });

        // Badge: Early Bird (Plan created before 8 AM)
        // Simplified check: if any plan in the list has a time < 08:00
        const hasEarlyBird = morningPlans.some((iso) => {
            const d = new Date(iso);
            return d.getHours() < 8;
        });
        list.push({
            id: "early-bird",
            unlocked: hasEarlyBird,
        });

        return list;
    }, [streak, scores, morningPlans]);

    const unlockedCount = badges.filter((b) => b.unlocked).length;

    return (
        <div className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    {t("diff.trophyCase", "🏆 Trophy Case")}
                </h3>
                <span className="text-[10px] text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full border border-[var(--accent)]/30">
                    {unlockedCount} {t("diff.unlocked", "unlocked")}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {badges.map((b) => (
                    <BadgeItem key={b.id} badge={b} />
                ))}
            </div>
        </div>
    );
}

function BadgeItem({ badge }: { badge: BadgeProps }) {
    const { t } = useT();

    const config = {
        "streak-7": {
            img: "/images/badge-streak-7.png",
            title: t("badge.streak7.title", "On Fire"),
            desc: t("badge.streak7.desc", "7 day streak"),
        },
        perfect: {
            img: "/images/badge-perfect.png",
            title: t("badge.perfect.title", "Perfection"),
            desc: t("badge.perfect.desc", "Score 100"),
        },
        "early-bird": {
            img: "/images/badge-early-bird.png",
            title: t("badge.earlyBird.title", "Early Bird"),
            desc: t("badge.earlyBird.desc", "Plan before 8am"),
        },
    }[badge.id];

    return (
        <div
            className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${badge.unlocked
                    ? "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] opacity-100"
                    : "bg-[var(--bg-subtle)] border border-transparent opacity-40 grayscale"
                }`}
        >
            <div className="w-12 h-12 mb-2 relative">
                <img
                    src={config.img}
                    alt={config.title}
                    className="w-full h-full object-contain drop-shadow-sm"
                />
            </div>
            <p className="text-[11px] font-medium text-[var(--text-main)] leading-tight">
                {config.title}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{config.desc}</p>
        </div>
    );
}
