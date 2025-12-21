"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

type PlanType = "free" | "pro" | "founder";

type FeatureCount = {
  feature: string;
  count: number;
};

function safeVibrate(ms = 10) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as any).vibrate(ms);
    }
  } catch {}
}

function todayYmdLocal() {
  // Your app timezone is Europe/Athens, but we keep "local" here for simplicity.
  // If you log usage by Athens date, ensure the backend writes usage_date consistently.
  return new Date().toISOString().slice(0, 10);
}

/**
 * AiUsageBadge
 * - Shows plan + daily usage (Free: X/limit, Pro/Founder: Unlimited)
 * - Soft warning when low remaining (toast)
 * - Blocked state (limit reached) + Upgrade button
 * - Tooltip breakdown per feature (best-effort)
 * - Real-time updates via Supabase Realtime (ai_usage_logs changes)
 */
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
  const [featureCounts, setFeatureCounts] = useState<FeatureCount[]>([]);

  const [tooltipOpen, setTooltipOpen] = useState(false);

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const lastRemainingRef = useRef<number | null>(null);

  function clearToastTimer() {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }

  function showToast(msg: string) {
    clearToastTimer();
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }

  // 1) Load user + plan
  useEffect(() => {
    let mounted = true;

    async function loadUserAndPlan() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        if (!mounted) return;

        if (!user) {
          setLoading(false);
          setUserId(null);
          return;
        }

        setUserId(user.id);

        // plan from profiles.plan (free/pro/founder)
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

  // 2) Load usage totals + breakdown (best-effort)
  async function refreshUsage(uid: string) {
    try {
      const today = todayYmdLocal();

      // Total count (fast)
      const { count: totalCount } = await supabase
        .from("ai_usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("usage_date", today);

      const total = totalCount || 0;
      setUsedToday(total);

      // Breakdown (best-effort):
      // We fetch only the columns we might have; if "feature" doesn't exist,
      // this query may error. We'll catch and simply not show breakdown.
      const { data: rows, error } = await supabase
        .from("ai_usage_logs")
        .select("feature")
        .eq("user_id", uid)
        .eq("usage_date", today)
        .limit(500);

      if (error) {
        // likely "feature column not found" or permission issue
        setFeatureCounts([]);
        return;
      }

      const map = new Map<string, number>();
      for (const r of rows || []) {
        const feat = (r as any)?.feature;
        const key =
          typeof feat === "string" && feat.trim()
            ? feat.trim()
            : t("ai.usage.feature.unknown", "Other");
        map.set(key, (map.get(key) || 0) + 1);
      }

      const list: FeatureCount[] = Array.from(map.entries())
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count);

      setFeatureCounts(list);
    } catch {
      // fail silently
    }
  }

  useEffect(() => {
    if (!userId) return;
    refreshUsage(userId).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 3) Real-time updates (ai_usage_logs changes)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`ai-usage-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_usage_logs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Any change: refresh current day
          refreshUsage(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Derived
  const limit = FREE_DAILY_LIMIT;
  const remaining = useMemo(() => {
    if (plan === "pro" || plan === "founder") return Number.POSITIVE_INFINITY;
    return Math.max(0, limit - usedToday);
  }, [plan, usedToday, limit]);

  // 4) Soft warning toast when low remaining (free only)
  useEffect(() => {
    if (plan !== "free") return;

    const prev = lastRemainingRef.current;
    lastRemainingRef.current = remaining;

    // Only fire when crossing into low territory (prevents spam)
    if (prev === null) return;

    if (remaining === 2 && prev > 2) {
      safeVibrate(10);
      showToast(t("ai.usage.toast.low2", "⚠️ Only 2 AI calls left today."));
    } else if (remaining === 1 && prev > 1) {
      safeVibrate(10);
      showToast(t("ai.usage.toast.low1", "⚠️ Only 1 AI call left today."));
    } else if (remaining === 0 && prev > 0) {
      safeVibrate(15);
      showToast(t("ai.usage.toast.none", "⛔ Daily AI limit reached."));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, plan]);

  // Initialize lastRemaining once we have data
  useEffect(() => {
    if (plan !== "free") return;
    if (lastRemainingRef.current === null && !loading) {
      lastRemainingRef.current = remaining;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, plan]);

  if (loading || !userId) return null;

  const isUnlimited = plan === "pro" || plan === "founder";
  const isBlocked = !isUnlimited && remaining <= 0;
  const isLow = !isUnlimited && remaining > 0 && remaining <= 2;
  const isWarn = !isUnlimited && remaining > 2 && remaining <= 5;

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

  const pillText = isUnlimited
    ? t("ai.usage.today", "AI today") + ": " + label
    : `${t("ai.usage.today", "AI today")}: ${label} ${t("ai.usage.freeTag", "(free)")}`;

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

      {/* Badge + optional Upgrade */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(true)}
          onBlur={() => setTooltipOpen(false)}
          className={`${badgeBase} ${badgeStyle}`}
          aria-label={pillText}
          title={pillText}
        >
          <span className={isLow ? "animate-pulse" : ""}>🤖</span>

          {isUnlimited ? (
            <>
              <span>{t("ai.usage.today", "AI today")}:</span>
              <span className="font-semibold">{label}</span>
              <span className="opacity-70">({plan})</span>
            </>
          ) : (
            <>
              <span>{t("ai.usage.today", "AI today")}:</span>
              <span className="font-semibold">{usedToday}/{limit}</span>
              <span className="opacity-70">{t("ai.usage.freeTag", "(free)")}</span>
              {isBlocked ? (
                <span className="ml-1 text-[10px] opacity-90">
                  {t("ai.usage.limitReached", "Limit reached")}
                </span>
              ) : isLow ? (
                <span className="ml-1 text-[10px] opacity-90">
                  {t("ai.usage.lowLeft", "{N} left")
                    .replace("{N}", String(remaining))}
                </span>
              ) : null}
            </>
          )}
        </button>

        {showUpgradeButton && !isUnlimited && (
          <Link
            href={pricingHref}
            className={`text-[11px] px-3 py-1 rounded-full border ${
              isBlocked
                ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-main)]"
            }`}
          >
            {t("ai.usage.upgrade", "Upgrade")}
          </Link>
        )}
      </div>

      {/* Tooltip breakdown */}
      {tooltipOpen && (
        <div className="absolute right-0 mt-2 z-50 w-[280px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-3 text-[11px] text-[var(--text-main)]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              {t("ai.usage.tooltip.title", "AI usage today")}
            </p>
            {!isUnlimited && (
              <p className="text-[10px] text-[var(--text-muted)]">
                {t("ai.usage.tooltip.remaining", "{N} remaining")
                  .replace("{N}", String(remaining))}
              </p>
            )}
          </div>

          <div className="mt-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)]">
                {t("ai.usage.tooltip.plan", "Plan")}
              </span>
              <span className="font-semibold">{isUnlimited ? plan : "free"}</span>
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

          <div className="mt-2">
            <p className="text-[10px] text-[var(--text-muted)] mb-1">
              {t("ai.usage.tooltip.breakdown", "Breakdown")}
            </p>

            {featureCounts.length === 0 ? (
              <p className="text-[10px] text-[var(--text-muted)]">
                {t(
                  "ai.usage.tooltip.noBreakdown",
                  "No feature breakdown available."
                )}
              </p>
            ) : (
              <ul className="space-y-1">
                {featureCounts.slice(0, 8).map((fc) => (
                  <li
                    key={fc.feature}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate max-w-[200px]">
                      {fc.feature}
                    </span>
                    <span className="font-semibold">{fc.count}</span>
                  </li>
                ))}
              </ul>
            )}
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
