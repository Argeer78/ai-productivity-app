"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

type PlanType = "free" | "pro" | "founder";



// ✅ MUST match server usage_date writes (UTC YYYY-MM-DD)
function todayYmdUtc() {
    return new Date().toISOString().split("T")[0];
}

export default function AiUsageBadge({
    className,
    showUpgradeButton = true,
    pricingHref = "/pricing",
}: {
    className?: string;
    showUpgradeButton?: boolean;
    pricingHref?: string;
}) {
    const { t: rawT } = useT("");
    const t = (k: string, f: string) => rawT(k, f);

    const FREE_DAILY_LIMIT =
        Number(process.env.NEXT_PUBLIC_FREE_AI_DAILY_LIMIT || "") || 10;

    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [plan, setPlan] = useState<PlanType>("free");

    const [usedToday, setUsedToday] = useState<number>(0);
    const [tooltipOpen, setTooltipOpen] = useState(false);

    // toast
    const [toast, setToast] = useState<string | null>(null);
    const toastTimerRef = useRef<number | null>(null);
    const lastRemainingRef = useRef<number | null>(null);

    const todayRef = useRef<string>(todayYmdUtc());

    function clearToastTimer() {
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
    }

    function showToast(msg: string) {
        clearToastTimer();
        setToast(msg);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
    }

    // ---------- Load user + plan ----------
    useEffect(() => {
        let mounted = true;

        async function loadUserAndPlan() {
            try {
                const { data } = await supabase.auth.getUser();
                const user = data?.user ?? null;

                if (!mounted) return;

                if (!user) {
                    setUserId(null);
                    setPlan("free");
                    setUsedToday(0);
                    setLoading(false);
                    return;
                }

                setUserId(user.id);

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("plan")
                    .eq("id", user.id)
                    .maybeSingle();

                if (!mounted) return;

                const p = (profile?.plan || "free") as PlanType;
                setPlan(p === "pro" || p === "founder" ? p : "free");
            } catch {
                if (!mounted) return;
                setPlan("free");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadUserAndPlan();
        return () => {
            mounted = false;
        };
    }, []);

    // ---------- Refresh usage (reads ai_usage) ----------
    async function refreshUsage(uid: string) {
        const today = todayYmdUtc();
        todayRef.current = today;

        const { data, error } = await supabase
            .from("ai_usage")
            .select("count")
            .eq("user_id", uid)
            .eq("usage_date", today)
            .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
            // fail silently; badge should never break UI
            return;
        }

        setUsedToday(data?.count || 0);
    }

    // Initial load
    useEffect(() => {
        if (!userId) return;
        refreshUsage(userId);

    }, [userId]);

    // ---------- “Refresh nicely” hooks ----------
    useEffect(() => {
        if (!userId) return;

        let channel: any;

        (async () => {
            await supabase.auth.getSession();

            const name = `ai-usage-${userId}-${crypto.randomUUID()}`;
            channel = supabase
                .channel(name)
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "ai_usage", filter: `user_id=eq.${userId}` },
                    () => refreshUsage(userId)
                )
                .subscribe((status, err) => console.log("[ai_usage] channel status:", status, err || ""));
        })();

        return () => channel?.unsubscribe?.();
    }, [userId]);

    // ✅ Realtime updates for ai_usage row (instant UI update)
    useEffect(() => {
        if (!userId) return;

        const today = todayYmdUtc();
        todayRef.current = today;

        const channel = supabase
            .channel(`ai-usage-${userId}-${today}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ai_usage",
                    // ✅ Narrow to today's row only
                    filter: `user_id=eq.${userId},usage_date=eq.${today}`,
                },
                (payload: any) => {
                    // ✅ Apply update immediately if present
                    const nextCount =
                        payload?.new?.count ??
                        payload?.record?.count ??
                        payload?.old?.count ??
                        null;

                    if (typeof nextCount === "number") {
                        setUsedToday(nextCount);
                        return;
                    }

                    // Fallback: re-read
                    refreshUsage(userId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [userId]);

    // ---------- Derived ----------
    const isUnlimited = plan === "pro" || plan === "founder";
    const limit = FREE_DAILY_LIMIT;

    const remaining = useMemo(() => {
        if (isUnlimited) return Number.POSITIVE_INFINITY;
        return Math.max(0, limit - usedToday);
    }, [isUnlimited, limit, usedToday]);

    const isBlocked = !isUnlimited && remaining <= 0;
    const isLow = !isUnlimited && remaining > 0 && remaining <= 2;
    const isWarn = !isUnlimited && remaining > 2 && remaining <= 5;

    // Toast thresholds (free only)
    useEffect(() => {
        if (isUnlimited) return;

        const prev = lastRemainingRef.current;
        lastRemainingRef.current = remaining;

        if (prev === null) return;

        if (remaining === 2 && prev > 2) {
            showToast(t("ai.usage.toast.low2", "⚠️ Only 2 AI calls left today."));
        } else if (remaining === 1 && prev > 1) {
            showToast(t("ai.usage.toast.low1", "⚠️ Only 1 AI call left today."));
        } else if (remaining === 0 && prev > 0) {
            showToast(t("ai.usage.toast.none", "⛔ Daily AI limit reached."));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remaining, isUnlimited]);

    useEffect(() => {
        if (!isUnlimited && lastRemainingRef.current === null && !loading) {
            lastRemainingRef.current = remaining;
        }
    }, [loading, remaining, isUnlimited]);

    if (loading || !userId) return null;

    const badgeBase =
        "inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border transition-colors";
    const badgeStyle = isUnlimited
        ? "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-main)]"
        : isBlocked
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : isLow
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : isWarn
                    ? "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-amber-300"
                    : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]";

    const label = isUnlimited
        ? t("ai.usage.unlimitedLabel", "Unlimited")
        : `${usedToday}/${limit}`;

    return (
        <div className={`relative ${className || ""}`}>
            {/* Toast */}
            {toast && (
                <div className="absolute -top-10 right-0 z-50">
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 shadow-xl text-[11px] text-[var(--text-main)]">
                        {toast}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onMouseEnter={() => setTooltipOpen(true)}
                    onMouseLeave={() => setTooltipOpen(false)}
                    onFocus={() => setTooltipOpen(true)}
                    onBlur={() => setTooltipOpen(false)}
                    className={`${badgeBase} ${badgeStyle}`}
                    title={
                        isUnlimited
                            ? `${t("ai.usage.today", "AI today")}: ${label} (${plan})`
                            : `${t("ai.usage.today", "AI today")}: ${label} ${t(
                                "ai.usage.freeTag",
                                "(free)"
                            )}`
                    }
                >
                    <span className={isLow ? "animate-pulse" : ""}>🤖</span>
                    <span>{t("ai.usage.today", "AI today")}:</span>
                    <span className="font-semibold">{label}</span>
                    {isUnlimited ? (
                        <span className="opacity-70">({plan})</span>
                    ) : (
                        <>
                            <span className="opacity-70">
                                {t("ai.usage.freeTag", "(free)")}
                            </span>
                            {isBlocked ? (
                                <span className="ml-1 text-[10px] opacity-90">
                                    {t("ai.usage.limitReached", "Limit reached")}
                                </span>
                            ) : isLow ? (
                                <span className="ml-1 text-[10px] opacity-90">
                                    {t("ai.usage.lowLeft", "{N} left").replace(
                                        "{N}",
                                        String(remaining)
                                    )}
                                </span>
                            ) : null}
                        </>
                    )}
                </button>

                {showUpgradeButton && !isUnlimited && (
                    <Link
                        href={pricingHref}
                        className={`text-[11px] px-3 py-1 rounded-full border ${isBlocked
                            ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                            : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-main)]"
                            }`}
                    >
                        {t("ai.usage.upgrade", "Upgrade")}
                    </Link>
                )}
            </div>

            {/* Tooltip */}
            {tooltipOpen && (
                <div className="absolute right-0 mt-2 z-50 w-[260px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-3 text-[11px] text-[var(--text-main)]">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">
                            {t("ai.usage.tooltip.title", "AI usage today")}
                        </p>
                        {!isUnlimited && (
                            <p className="text-[10px] text-[var(--text-muted)]">
                                {t("ai.usage.tooltip.remaining", "{N} remaining").replace(
                                    "{N}",
                                    String(remaining)
                                )}
                            </p>
                        )}
                    </div>

                    <div className="mt-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--text-muted)]">
                                {t("ai.usage.tooltip.plan", "Plan")}
                            </span>
                            <span className="font-semibold">{plan}</span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-[var(--text-muted)]">
                                {t("ai.usage.tooltip.total", "Total")}
                            </span>
                            <span className="font-semibold">
                                {isUnlimited
                                    ? t("ai.usage.unlimitedLabel", "Unlimited")
                                    : `${usedToday}/${limit}`}
                            </span>
                        </div>
                    </div>

                    {!isUnlimited && isBlocked && (
                        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-200">
                            <p className="font-semibold">
                                {t("ai.usage.tooltip.blockedTitle", "Daily limit reached")}
                            </p>
                            <p className="text-[10px] opacity-90 mt-0.5">
                                {t(
                                    "ai.usage.tooltip.blockedBody",
                                    "Upgrade to keep using AI without daily limits."
                                )}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
