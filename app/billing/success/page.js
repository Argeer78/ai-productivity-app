import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic"; // don't prerender this at build time

export default async function BillingSuccessPage({ searchParams }) {
  const sessionId = searchParams?.session_id;
  let statusMessage = "Processing your upgrade...";
  let success = false;

  if (!sessionId) {
    statusMessage = "Missing Stripe session ID in the URL.";
  } else {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Get the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const userId = session?.metadata?.user_id;

      if (!userId) {
        statusMessage = "Payment found, but no user ID in metadata.";
      } else {
        // Mark user as Pro in Supabase
        const { error } = await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId,
              plan: "pro",
            },
            { onConflict: "id" }
          );

        if (error) {
          console.error("Supabase update error:", error);
          statusMessage =
            "Payment succeeded, but there was an error upgrading your account.";
        } else {
          statusMessage = "Your account is now Pro! 🎉";
          success = true;
        }
      }
    } catch (err) {
      console.error("Stripe confirm error:", err);
      statusMessage =
        "There was an error confirming your payment. Please contact support.";
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full border border-slate-800 rounded-2xl p-6 bg-slate-900/70 text-center">
        <h1 className="text-2xl font-bold mb-3">
          {success ? "Payment successful ✅" : "Payment status"}
        </h1>
        <p className="text-sm text-slate-300 mb-4">{statusMessage}</p>
        <Link
          href="/notes"
          className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
        >
          Go to your notes
        </Link>
      </div>
    </main>
  );
}
