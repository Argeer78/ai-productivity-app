// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      try {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // If Supabase sent a code, exchange it for a session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession error", error);
            if (!cancelled) router.replace("/auth?error=oauth");
            return;
          }
        }

        // Verify we actually have a user
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[auth/callback] getUser error", error);
        }

        if (cancelled) return;

        if (data?.user) {
          router.replace("/dashboard");
        } else {
          router.replace("/auth?error=auth");
        }
      } catch (err) {
        console.error("[auth/callback] unexpected error", err);
        if (!cancelled) router.replace("/auth?error=unknown");
      }
    }

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
      <p className="text-sm text-[var(--text-muted)]">Finishing sign-in…</p>
    </main>
  );
}
