"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAnalytics } from "@/lib/analytics";

export default function CtaButtons() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { track } = useAnalytics();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });
  }, []);

  const primaryHref = user ? "/dashboard" : "/auth";
  const primaryText = user ? "Open Dashboard" : "Get Started — Free";

  function handlePrimaryClick() {
    if (user) {
      track("open_dashboard_clicked");
    } else {
      track("cta_signup_clicked");
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Avoid hydration mismatch: render neutral CTA until auth state known */}
      <Link
        href={loading ? "/auth" : primaryHref}
        className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
        onClick={handlePrimaryClick}
      >
        {loading ? "Loading..." : primaryText}
      </Link>

      <Link
        href="/#pricing"
        className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
        onClick={() => track("see_pricing_clicked")}
      >
        See Pricing
      </Link>
    </div>
  );
}
