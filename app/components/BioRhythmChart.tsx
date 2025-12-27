"use client";

import { useMemo } from "react";
import { useT } from "@/lib/useT";

type ChartData = {
    date: string;
    energy: number | null; // 1-10
    score: number | null; // 0-100
};

export default function BioRhythmChart({ data }: { data: ChartData[] }) {
    const { t } = useT();

    // Normalize data for the chart (0-100 scale)
    const points = useMemo(() => {
        return data.map((d) => ({
            label: new Date(d.date).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
            }),
            // Energy x 10 to match Score scale (0-100)
            energy: d.energy !== null ? d.energy * 10 : null,
            score: d.score,
        }));
    }, [data]);

    if (data.length < 2) {
        return (
            <div className="h-40 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                {t("analytics.notEnoughData", "Need a few days of data to show trends.")}
            </div>
        );
    }

    // Chart Dimensions
    const height = 160;
    const width = 100; // percent
    const padding = 20;

    // Generate Path Strings
    const getPath = (key: "energy" | "score") => {
        return points
            .map((p, i) => {
                const val = p[key];
                if (val === null) return null;
                const x = (i / (points.length - 1)) * 100;
                const y = 100 - val; // Invert for SVG coords
                return `${x},${y}`;
            })
            .filter(Boolean)
            .join(" L ");
    };

    const energyPath = getPath("energy");
    const scorePath = getPath("score");

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-[var(--text-main)]">
                    {t("analytics.chartTitle", "Bio-Rhythm: Energy vs Success")}
                </h3>
                <div className="flex gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        {t("glance.energy", "Energy")}
                    </span>
                    <span className="flex items-center gap-1 text-purple-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        {t("glance.success", "Success")}
                    </span>
                </div>
            </div>

            <div className="relative h-40 w-full bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-4 overflow-hidden">
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                >
                    {/* Grid Lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="var(--border-subtle)"
                            strokeWidth="0.5"
                            strokeDasharray="2"
                        />
                    ))}

                    {/* Energy Line */}
                    {energyPath && (
                        <path
                            d={`M ${energyPath}`}
                            fill="none"
                            stroke="#FACC15" // Yellow-400
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-sm opacity-80"
                        />
                    )}

                    {/* Success Line */}
                    {scorePath && (
                        <path
                            d={`M ${scorePath}`}
                            fill="none"
                            stroke="#C084FC" // Purple-400
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-sm"
                        />
                    )}
                </svg>

                {/* X-Axis Labels (First and Last) */}
                <div className="absolute bottom-1 left-4 text-[9px] text-[var(--text-muted)]">
                    {points[0].label}
                </div>
                <div className="absolute bottom-1 right-4 text-[9px] text-[var(--text-muted)]">
                    {points[points.length - 1].label}
                </div>
            </div>
        </div>
    );
}
