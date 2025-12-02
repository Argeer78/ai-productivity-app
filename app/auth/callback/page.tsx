// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        // Supabase can automatically detect the `code` in the URL
        // when we call getUser()/getSession(), so we just poll a bit.
        for (let attempt = 0; attempt < 6; attempt++) {
          const { data, error } = await supabase.auth.getUser();

          // (Optional) debug – safe to leave or remove
          console.log("[auth/callback] attempt", attempt, {
            hasUser: !!data?.user,
            error,
          });

          if (data?.user) {
            if (!cancelled) {
              router.replace("/dashboard");
            }
            return;
          }

          // wait a bit before trying again
          await new Promise((res) => setTimeout(res, 500));
        }

        // If we get here, we never saw a user
        if (!cancelled) {
          router.replace("/auth?error=auth");
        }
      } catch (err) {
        console.error("[auth/callback] unexpected error", err);
        if (!cancelled) {
          router.replace("/auth?error=unknown");
        }
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
