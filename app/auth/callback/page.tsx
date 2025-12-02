"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      try {
        // Newer Supabase + OAuth often returns a `code` (PKCE)
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession error", error);
            if (!cancelled) router.replace("/auth?error=oauth");
            return;
          }
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[auth/callback] getUser error", error);
        }

        if (!cancelled) {
          if (data?.user) {
            // ✅ Logged in – go to dashboard
            router.replace("/dashboard");
          } else {
            // ❌ No user – back to auth
            router.replace("/auth?error=auth");
          }
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
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
      <p className="text-sm text-[var(--text-muted)]">
        Finishing sign-in…
      </p>
    </main>
  );
}
