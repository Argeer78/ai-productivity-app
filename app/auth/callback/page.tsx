// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

async function getPostAuthRedirect(userId: string): Promise<string> {
  // Default
  let target = "/dashboard";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.onboarding_completed) target = "/onboarding";
  } catch (e) {
    // If this fails for any reason, don't block login
    console.warn("[auth/callback] profile check failed", e);
  }

  return target;
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const code =
          url.searchParams.get("code") || url.searchParams.get("auth_code");
        const errorParam =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");

        // Provider returned an error
        if (errorParam) {
          if (!cancelled) {
            router.replace(`/auth?error=${encodeURIComponent(errorParam)}`);
          }
          return;
        }

        // No code → maybe session already exists
        if (!code) {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;

          if (user && !cancelled) {
            const target = await getPostAuthRedirect(user.id);
            router.replace(target);
            return;
          }

          if (!cancelled) router.replace("/auth?error=missing_code");
          return;
        }

        // Exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data?.session) {
          console.error("[auth/callback] exchange error", error);
          if (!cancelled) router.replace("/auth?error=auth");
          return;
        }

        const userId = data.session.user?.id;
        if (!userId) {
          if (!cancelled) router.replace("/auth?error=no_user");
          return;
        }

        const target = await getPostAuthRedirect(userId);

        if (!cancelled) router.replace(target);
      } catch (err) {
        console.error("[auth/callback] unexpected error", err);
        if (!cancelled) router.replace("/auth?error=unknown");
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] text-[var(--text-main)]">
      <p className="text-sm text-[var(--text-muted)]">Finishing sign-in…</p>
    </main>
  );
}
