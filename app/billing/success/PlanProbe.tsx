"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PlanProbe() {
  const [status, setStatus] = useState<"checking" | "pro" | "free" | "anon">("checking");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) {
        setStatus("anon");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile) {
        setStatus("free");
        return;
      }

      setStatus(profile.plan === "pro" ? "pro" : "free");
    })();
  }, []);

  if (status === "checking") {
    return <p className="text-xs text-slate-400">Checking your account…</p>;
  }

  if (status === "pro") {
    return <p className="text-sm text-green-400">Your account is Pro — you’re all set! 🎉</p>;
  }

  if (status === "anon") {
    return <p className="text-sm text-slate-300">You’re not logged in. Please sign in to view your plan.</p>;
  }

  return (
    <p className="text-sm text-yellow-300">
      We couldn’t confirm via URL, and your account isn’t Pro yet.  
      If you just paid, give it a few seconds and refresh.
    </p>
  );
}
