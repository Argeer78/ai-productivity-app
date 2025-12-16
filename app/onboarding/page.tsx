"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import OnboardingWizard from "./wizard/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const force = searchParams.get("force") === "1";

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[onboarding] load profile error", error);
        // If profile fails, still allow showing wizard (better UX)
      }

      // ✅ Only redirect away if NOT forced
      if (!force && profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      if (!cancelled) setReady(true);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [router, force]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] text-[var(--text-main)]">
        <p className="text-sm text-[var(--text-muted)]">Preparing setup…</p>
      </main>
    );
  }

  return <OnboardingWizard />;
}
