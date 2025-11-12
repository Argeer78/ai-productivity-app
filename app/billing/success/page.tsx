// app/billing/success/page.tsx
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic"; // run on server at request time

type Search = { session_id?: string; sessionId?: string };

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  // Accept both session_id and sessionId
  const sessionId = searchParams?.session_id || searchParams?.sessionId;

  let title = "Payment status";
  let message = "Processing your upgrade…";
  let isSuccess = false;

  if (!sessionId) {
    message = "Missing Stripe session ID in the URL.";
  } else {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

      // Get the session + useful fields
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "customer"],
      });

      // Basic sanity: make sure it’s complete/paid
      const paidOrComplete =
        session?.payment_status === "paid" || session?.status === "complete";
      if (!paidOrComplete) {
        message =
          "Checkout session is not paid/complete yet. Please wait a few seconds and refresh.";
      } else {
        // Read metadata (support both keys)
        const meta = (session.metadata || {}) as Record<string, string>;
        const userId = meta.userId || meta.user_id || null;

        // Customer id & email if present
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id || null;

        const email =
          (session.customer_details && session.customer_details.email) ||
          (session as any).customer_email ||
          null;

        if (!userId) {
          message = "Payment found, but no user ID in session metadata.";
        } else {
          // Prepare updates: set plan=pro and store stripe_customer_id if we have it
          const updates: any = { plan: "pro" };
          if (customerId) updates.stripe_customer_id = customerId;

          const { error } = await supabaseAdmin
            .from("profiles")
            .upsert(
              {
                id: userId,
                email: email ?? undefined, // harmless if undefined
                ...updates,
              },
              { onConflict: "id" }
            );

          if (error) {
            console.error("Supabase update error:", error);
            message =
              "Payment succeeded, but there was an error upgrading your account.";
          } else {
            title = "Payment successful ✅";
            message = "Your account is now Pro! 🎉";
            isSuccess = true;
          }
        }
      }
    } catch (err) {
      console.error("Stripe confirm error:", err);
      message =
        "There was an error confirming your payment. Please contact support if it persists.";
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full border border-slate-800 rounded-2xl p-6 bg-slate-900/70 text-center">
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-sm text-slate-300 mb-5">{message}</p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
          >
            Settings
          </Link>
          {!isSuccess && (
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
            >
              Home
            </Link>
          )}
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Tip: If your plan doesn’t show as Pro yet, refresh the Dashboard. The
          Stripe webhook also keeps your plan in sync.
        </p>
      </div>
    </main>
  );
}
