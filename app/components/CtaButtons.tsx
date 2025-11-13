"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAnalytics } from "@/lib/analytics";

export default function CtaButtons() {
  const [user, setUser] = useState<any | null>(null);
  const { track } = useAnalytics();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  const primaryHref = user ? "/dashboard" : "/auth";
  const primaryText = user ? "Open Dashboard" : "Get Started — Free";

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={primaryHref}
        className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
        onClick={() => track(user ? "login_completed" : "signup_started")}
      >
        {primaryText}
      </Link>
      <a
        href="#pricing"
        className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
        onClick={() => track("share_clicked", { where: "see_pricing" })}
      >
        See Pricing
      </a>
    </div>
  );
}
