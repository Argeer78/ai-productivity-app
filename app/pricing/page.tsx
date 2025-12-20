// app/pricing/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import { useT } from "@/lib/useT";

// ✅ Auth gate (modal)
import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";

const PRICE_LABELS = {
  pro: {
    monthly: {
      eur: "€8.49",
      usd: "$8.99",
      gbp: "£7.99",
    },
    yearly: {
      eur: "€74.00",
      usd: "$79.00",
      gbp: "£69.00",
    },
  },
  founder: {
    monthly: {
      eur: "€5.49",
      usd: "$5.99",
      gbp: "£4.99",
    },
  },
};

type Currency = "eur" | "usd" | "gbp";

export default function PricingPage() {
  const { t } = useT();

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const gate = useAuthGate(user);

  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState("");

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrency] = useState<Currency>("eur");

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  async function startCheckout(selectedCurrency: Currency, planType: "pro" | "yearly" | "founder") {
    setError("");

    // ✅ Require auth for checkout (Stripe needs email + userId)
    if (
      !gate.requireAuth(undefined, {
        title: t("pricing.auth.title", "Log in to upgrade."),
        subtitle: t("pricing.auth.subtitle", "Create an account to manage billing and your plan."),
      })
    ) {
      return;
    }
    if (!user) return;

    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          currency: selectedCurrency,
          plan: planType,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        console.error("[pricing/checkout] error payload", data);
        setError(data?.error || t("pricing.checkout.error", "Could not start checkout."));
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("[pricing/checkout] exception", err);
      setError(t("pricing.checkout.networkError", "Network error while starting checkout."));
    } finally {
      setBillingLoading(false);
    }
  }

  const proPrice =
    billingPeriod === "monthly" ? PRICE_LABELS.pro.monthly[currency] : PRICE_LABELS.pro.yearly[currency];

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      {/* ✅ Pricing page should highlight Pricing */}
      <AppHeader active="pricing" />

      {/* ✅ Auth modal */}
      <AuthGateModal open={gate.open} onClose={gate.close} copy={gate.copy} authHref={gate.authHref} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                {t("pricing.kicker", "PRICING")}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold">
                {t("pricing.title", "Start free. Upgrade when it becomes part of your day.")}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)] mt-2 max-w-2xl">
                {t(
                  "pricing.subtitle",
                  "Pick Monthly or Yearly, choose your currency, and you’ll go to Stripe Checkout. Cancel anytime from Stripe."
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/"
                className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-xs"
              >
                {t("pricing.backHome", "← Home")}
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-xs text-[var(--accent-contrast)]"
              >
                {t("pricing.openDashboard", "Open dashboard")}
              </Link>
            </div>
          </div>

          {error ? <div className="mb-4 text-sm text-red-400">{error}</div> : null}

          {/* QUICK: Plan comparison row */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("pricing.free.title", "FREE")}</p>
              <p className="text-2xl font-bold">€0</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-2">
                {t("pricing.free.desc", "Perfect for light usage and getting started.")}
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--text-main)]">
                <li>• {t("pricing.free.f1", "Notes + Tasks")}</li>
                <li>• {t("pricing.free.f2", "Daily Success Score")}</li>
                <li>• {t("pricing.free.f3", "Basic reminders")}</li>
                <li>• {t("pricing.free.f4", "20 AI calls/day")}</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
              <p className="text-xs font-semibold text-[var(--accent)] mb-1">{t("pricing.pro.title", "PRO")}</p>
              {/* ✅ show current selected price */}
              <p className="text-2xl font-bold">
                {proPrice}
                <span className="text-xs font-normal text-[var(--text-muted)]"> / {billingPeriod}</span>
              </p>
              <p className="text-[12px] text-[var(--text-muted)] mt-2">
                {t("pricing.pro.desc", "For daily users who want higher limits and weekly insights.")}
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--text-main)]">
                <li>• {t("pricing.pro.f1", "Unlimited AI (2000 calls/day)")}</li>
                <li>• {t("pricing.pro.f2", "Weekly AI email reports")}</li>
                <li>• {t("pricing.pro.f3", "AI-powered Weekly Goals")}</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{t("pricing.founder.title", "FOUNDER")}</p>
              <p className="text-2xl font-bold">
                {PRICE_LABELS.founder.monthly[currency]}
                <span className="text-xs font-normal text-[var(--text-muted)]"> / month</span>
              </p>
              <p className="text-[12px] text-[var(--text-muted)] mt-2">
                {t("pricing.founder.desc", "Early supporter price — never increases once subscribed.")}
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--text-main)]">
                <li>• {t("pricing.founder.f1", "Everything in Pro")}</li>
                <li>• {t("pricing.founder.f2", "Locked-in lifetime price")}</li>
                <li>• {t("pricing.founder.f3", "Priority support")}</li>
              </ul>
            </div>
          </div>

          {/* PRO PLAN (your original block style) */}
          <section className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-5 text-xs md:text-sm max-w-xl mb-4">
            <p className="font-semibold mb-1 text-sm md:text-base">
              {t("pricing.pro.sectionTitle", "Upgrade to AI Productivity Hub PRO")}
            </p>
            <p className="mb-3 text-[var(--text-muted)]">
              {t("pricing.pro.sectionSubtitle", "For daily users who want higher limits and weekly insights.")}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  billingPeriod === "monthly"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                }`}
              >
                {t("pricing.period.monthly", "Monthly")}
              </button>

              <button
                type="button"
                onClick={() => setBillingPeriod("yearly")}
                className={`px-3 py-1.5 rounded-xl text-xs ${
                  billingPeriod === "yearly"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                }`}
              >
                {t("pricing.period.yearly", "Yearly — save 25%")}
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-2xl font-bold">
                {proPrice}
                <span className="text-base font-normal text-[var(--text-muted)]"> / {billingPeriod}</span>
              </p>
            </div>

            <ul className="space-y-1.5 text-[11px] text-[var(--text-main)] mb-4">
              <li>• {t("pricing.pro.b1", "Unlimited AI (2000 calls/day)")}</li>
              <li>• {t("pricing.pro.b2", "Weekly AI email reports")}</li>
              <li>• {t("pricing.pro.b3", "AI-powered Weekly Goals")}</li>
              <li>• {t("pricing.pro.b4", "Save & revisit trip plans")}</li>
              <li>• {t("pricing.pro.b5", "All premium templates")}</li>
              <li>• {t("pricing.pro.b6", "Priority feature access")}</li>
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-xs mb-2 sm:mb-0"
              >
                <option value="eur">EUR €</option>
                <option value="usd">USD $</option>
                <option value="gbp">GBP £</option>
              </select>

              <button
                type="button"
                onClick={() => startCheckout(currency, billingPeriod === "yearly" ? "yearly" : "pro")}
                disabled={billingLoading}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)] disabled:opacity-60"
              >
                {billingLoading
                  ? t("pricing.checkout.loading", "Opening Stripe…")
                  : billingPeriod === "yearly"
                  ? t("pricing.checkout.goYearly", "Go yearly ({CUR})").replace("{CUR}", currency.toUpperCase())
                  : t("pricing.checkout.goMonthly", "Upgrade monthly ({CUR})").replace("{CUR}", currency.toUpperCase())}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              {t("pricing.cancelAnytime", "Cancel anytime via Stripe billing portal.")}
            </p>

            {!checkingUser && !user ? (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {t("pricing.loginHint", "Tip: log in first so we can link the subscription to your account.")}
              </p>
            ) : null}
          </section>

          {/* Founder / early supporter (your original block style) */}
          <section className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-5 text-xs md:text-sm max-w-xl">
            <p className="text-[var(--accent)] font-semibold mb-1 text-sm md:text-base">
              🎉 {t("pricing.founder.sectionTitle", "Early Supporter Discount")}
            </p>
            <p className="text-[var(--text-main)] mb-3">
              {t("pricing.founder.sectionSubtitle", "Because you're early — lock in a permanent discount, forever.")}
            </p>

            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-2xl font-bold text-[var(--text-main)]">
                {PRICE_LABELS.founder.monthly[currency]}
                <span className="text-base font-normal text-[var(--text-muted)]"> / month</span>
              </p>

              <p className="text-[11px] text-[var(--text-muted)]">
                {t("pricing.founder.neverIncreases", "Founder price — never increases")}
              </p>
            </div>

            <ul className="space-y-1.5 text-[11px] text-[var(--text-main)] mb-4">
              <li>• {t("pricing.founder.b1", "Everything in Pro")}</li>
              <li>• {t("pricing.founder.b2", "Locked-in lifetime price")}</li>
              <li>• {t("pricing.founder.b3", "Unlimited AI (2000/day)")}</li>
              <li>• {t("pricing.founder.b4", "Weekly reports & goals")}</li>
              <li>• {t("pricing.founder.b5", "Premium templates")}</li>
              <li>• {t("pricing.founder.b6", "Priority support")}</li>
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1 text-xs mb-2 sm:mb-0"
              >
                <option value="eur">EUR €</option>
                <option value="usd">USD $</option>
                <option value="gbp">GBP £</option>
              </select>

              <button
                type="button"
                onClick={() => startCheckout(currency, "founder")}
                disabled={billingLoading}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm text-[var(--accent-contrast)] disabled:opacity-60"
              >
                {billingLoading
                  ? t("pricing.checkout.loading", "Opening Stripe…")
                  : t("pricing.founder.cta", "Get Founder Price ({CUR})").replace("{CUR}", currency.toUpperCase())}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              {t("pricing.founder.limited", "Limited time. Price is yours forever once subscribed.")}
            </p>
          </section>

          {/* Small footer */}
          <div className="mt-10 text-[11px] text-[var(--text-muted)]">
            <p>{t("pricing.footer.note1", "Payments are handled securely by Stripe.")}</p>
            <p className="mt-1">
              {t("pricing.footer.note2", "If you have any issues, contact support from Settings → Feedback.")}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/privacy-policy" className="hover:text-[var(--text-main)]">
                {t("pricing.footer.privacy", "Privacy")}
              </Link>
              <Link href="/terms" className="hover:text-[var(--text-main)]">
                {t("pricing.footer.terms", "Terms")}
              </Link>
              <Link href="/changelog" className="hover:text-[var(--text-main)]">
                {t("pricing.footer.changelog", "What's new")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
