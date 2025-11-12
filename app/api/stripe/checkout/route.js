// app/api/stripe/checkout/route.js
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user data." }, { status: 400 });
    }
    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
    }
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1) Find or create a Stripe Customer for this email
    let customerId = null;
    try {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email,
          metadata: { userId }, // keep a pointer to your user
        });
        customerId = created.id;
      }
    } catch (e) {
      console.error("Stripe customer error:", e);
      return NextResponse.json({ error: "Failed to ensure customer." }, { status: 500 });
    }

    // 2) (Optional) Store stripe_customer_id on profiles now (webhook also does this)
    try {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    } catch (e) {
      console.warn("Non-fatal: could not update stripe_customer_id now:", e?.message || e);
    }

    // 3) Create Checkout Session using the explicit customer
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId, // <- ensures customer is present in webhook event
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      // Keep your metadata (use both keys so webhook matches either)
      metadata: { userId, user_id: userId, userEmail: email },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Stripe checkout failed." }, { status: 500 });
  }
}
