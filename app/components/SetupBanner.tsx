// app/components/SetupBanner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

type Props = {
  userId?: string | null;
};

export default function SetupBanner({ userId }: Props) {
  const { t } = useT("setupBanner");

  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) {
      setShow(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkOnboarding() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_use_case, onboarding_weekly_focus, onboarding_reminder")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (error && (error as any).code !== "PGRST116") {
          console.error("[SetupBanner] profile load error", error);
          // On error we prefer to show the banner instead of hiding forever
          setShow(true);
          return;
        }

        const useCase = data?.onboarding_use_case?.trim();
        const weeklyFocus = data?.onboarding_weekly_focus?.trim();
        const reminder = data?.onboarding_reminder;

        // Consider onboarding "done" if user has filled *any* of these
        const onboardingDone =
          !!useCase || !!weeklyFocus || (reminder && reminder !== "none");

        setShow(!onboardingDone);
      } catch (err) {
        if (!cancelled) {
          console.error("[SetupBanner] unexpected error", err);
          // Again, better to show than silently hide
          setShow(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // While loading, or if no user, or if we decided to hide -> render nothing
  if (!userId || loading || !show) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs md:text-sm flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-start gap-2">
        <span className="text-lg">✨</span>
        <div>
          <p className="font-semibold text-amber-100">
            {t(
              "title",
              "Finish your setup to get better AI summaries & weekly reports"
            )}
          </p>
          <p className="text-[11px] text-amber-100/80">
            {t(
              "body",
              "Choose your AI tone, main focus area and email preferences in Settings. It takes under a minute."
            )}
          </p>
        </div>
      </div>

      <Link
        href="/settings"
        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-semibold"
      >
        {t("cta", "Finish setup →")}
      </Link>
    </div>
  );
}
