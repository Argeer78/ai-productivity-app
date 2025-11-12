import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    // support either key: session_id or sessionId
    const sessionId = body.session_id || body.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Get the session and expand useful fields
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    // Basic safety checks
    const paidOrComplete =
      session?.payment_status === "paid" || session?.status === "complete";
    if (!paidOrComplete) {
      return NextResponse.json(
        {
          error:
            "Checkout session not paid/complete yet. Try again in a few seconds.",
          status: session?.status,
          payment_status: session?.payment_status,
        },
        { status: 409 }
      );
    }

    // Prefer metadata userId; fall back to user_id
    const meta = session.metadata || {};
    const userId = meta.userId || meta.user_id || null;
    if (!userId) {
      return NextResponse.json(
        { error: "No user id in session metadata" },
        { status: 400 }
      );
    }

    // Try to capture customer id & email (if present)
    const customerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    // Build update payload
    const updates = { plan: "pro" };
    if (customerId) updates.stripe_customer_id = customerId;

    // If you want a guaranteed profile row, use upsert; otherwise update()
    const { error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,              // optional: won’t overwrite if same
          ...updates,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("Confirm: profiles upsert error", upsertError);
      return NextResponse.json(
        { error: "Failed to update profile plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId,
      plan: "pro",
      stripe_customer_id: updates.stripe_customer_id || null,
    });
  } catch (err) {
    console.error("Stripe confirm error:", err);
    return NextResponse.json(
      { error: "Stripe confirm failed" },
      { status: 500 }
    );
  }
}
