"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishSignIn() {
      try {
        // Supabase JS reads the tokens from the URL hash and sets the session.
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("[auth/callback] getUser error", error);
          router.replace("/auth");
          return;
        }

        if (data?.user) {
          // Logged in – send to dashboard
          router.replace("/dashboard");
        } else {
          // No user – back to login
          router.replace("/auth");
        }
      } catch (err) {
        console.error("[auth/callback] unexpected error", err);
        router.replace("/auth");
      }
    }

    finishSignIn();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <p className="text-sm text-slate-300">Finishing sign-in…</p>
    </main>
  );
}
