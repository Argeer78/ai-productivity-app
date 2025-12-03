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
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const code =
          url.searchParams.get("code") || url.searchParams.get("auth_code");
        const errorParam =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");

        // If the provider returned an error, bail early
        if (errorParam) {
          if (!cancelled) {
            router.replace(
              `/auth?error=${encodeURIComponent(errorParam)}`
            );
          }
          return;
        }

        // No code in URL → maybe user already has a session,
        // or something went wrong with OAuth redirect.
        if (!code) {
          const { data } = await supabase.auth.getUser();
          if (data?.user && !cancelled) {
            router.replace("/dashboard");
            return;
          }

          if (!cancelled) {
            router.replace("/auth?error=missing_code");
          }
          return;
        }

        // Explicitly exchange code for a session (more reliable than
        // hoping getUser() does it automatically on all devices)
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code
        );

        if (error || !data?.session) {
          console.error("[auth/callback] exchange error", error);
          if (!cancelled) {
            router.replace("/auth?error=auth");
          }
          return;
        }

        // Success – user should now be logged in
        if (!cancelled) {
          router.replace("/dashboard");
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
      <p className="text-sm text-[var(--text-muted)]">
        Finishing sign-in…
      </p>
    </main>
  );
}
