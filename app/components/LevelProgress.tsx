"use client";

import { useMemo, useEffect } from "react";
import { useT } from "@/lib/useT";
import confetti from "canvas-confetti";

const LEVELS = [
    { max: 500, title: "Novice" },
    { max: 1500, title: "Apprentice" },
    { max: 3000, title: "Journeyman" },
    { max: 5000, title: "Expert" },
    { max: 5000, title: "Expert" },
    { max: Infinity, title: "Grandmaster" },
];

const REWARDS = [
    { level: 5, label: "🌧️ Rain Sound" },
    { level: 10, label: "🎨 Gold Theme" },
    { level: 20, label: "🕶️ Stealth Mode" },
];

export default function LevelProgress({ totalScore }: { totalScore: number }) {
    const { t } = useT();

    const { currentLevel, nextLevelXP, progressPercent, title } = useMemo(() => {
        let previousMax = 0;

        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            if (totalScore < level.max) {
                // Found current level bracket
                const range = level.max - previousMax;
                const currentInBracket = totalScore - previousMax;
                const percent = (currentInBracket / range) * 100;

                return {
                    currentLevel: i + 1,
                    title: level.title,
                    nextLevelXP: level.max,
                    progressPercent: Math.min(100, Math.max(0, percent)),
                };
            }
            previousMax = level.max;
        }

        // Grandmaster (Max level)
        return {
            currentLevel: LEVELS.length,
            title: LEVELS[LEVELS.length - 1].title,
            nextLevelXP: null,
            progressPercent: 100,
        };
    }, [totalScore]);

    const nextReward = REWARDS.find(r => r.level > currentLevel);

    // 🎉 Level Up Celebration Logic
    useEffect(() => {
        // We use a small timeout to ensure the UI has rendered the new bar width before exploding
        const timer = setTimeout(() => {
            const savedLevelStr = localStorage.getItem("rpg_last_seen_level");
            // Default to current level if missing (first run) to avoid instant explosion
            const savedLevel = savedLevelStr ? parseInt(savedLevelStr) : currentLevel;

            if (currentLevel > savedLevel) {
                // 🎆 LEVEL UP!
                const duration = 3000;
                const end = Date.now() + duration;

                const frame = () => {
                    confetti({
                        particleCount: 5,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0, y: 0.8 },
                        colors: ['#a855f7', '#fbbf24', '#34d399'] // Purple, Gold, Emerald
                    });
                    confetti({
                        particleCount: 5,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1, y: 0.8 },
                        colors: ['#a855f7', '#fbbf24', '#34d399']
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                };

                frame();
            }

            // Sync
            if (currentLevel !== savedLevel) {
                localStorage.setItem("rpg_last_seen_level", currentLevel.toString());
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [currentLevel]);

    return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 relative overflow-hidden group">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-5 blur-3xl rounded-full -mr-10 -mt-10 transition-opacity group-hover:opacity-10" />

            <div className="relative z-10 flex items-center justify-between mb-3">
                <div>
                    <p className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider mb-0.5">
                        {t("gamification.levelLabel", "Level {n}").replace("{n}", String(currentLevel))}
                    </p>
                    <h3 className="text-xl font-bold text-[var(--text-main)]">
                        {title}
                    </h3>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5" title={t("gamification.xpHelp", "How to earn XP:\n1. Log your Daily Success Score.\n2. 1 Score Point = 1 XP.")}>
                        <span className="text-2xl font-bold tabular-nums">{totalScore}</span>
                        <span className="text-xs text-[var(--text-muted)] mt-1">XP</span>
                        <div className="w-4 h-4 rounded-full border border-[var(--text-muted)] text-[var(--text-muted)] text-[10px] flex items-center justify-center cursor-help hover:bg-[var(--text-muted)] hover:text-[var(--bg-card)] transition-colors">
                            ?
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-2">
                <div
                    className="h-full bg-gradient-to-r from-[var(--accent)] to-purple-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Footer text */}
            <div className="flex justify-between items-end text-[10px] text-[var(--text-muted)] font-medium">
                <div className="flex flex-col">
                    <span>
                        {nextLevelXP
                            ? t("gamification.nextLevel", "{xp} XP to next level").replace("{xp}", String(nextLevelXP - totalScore))
                            : t("gamification.maxLevel", "Max Level Reached!")
                        }
                    </span>
                    {nextReward && (
                        <span className="text-[var(--accent)] mt-0.5 animate-pulse">
                            🎁 {t("gamification.nextReward", "Unlock: {r}").replace("{r}", nextReward.label)}
                        </span>
                    )}
                </div>
                <span>{nextLevelXP ? `${Math.round(progressPercent)}%` : "100%"}</span>
            </div>
        </div>
    );
}
