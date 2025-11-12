import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Look up the Stripe customer id for this user
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    const customerId = profile?.stripe_customer_id;
    if (!customerId) return NextResponse.json({ error: "No Stripe customer found." }, { status: 404 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/settings`
        : "http://localhost:3000/settings";

    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url: returnUrl,
    };

    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
      params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    }

    const session = await stripe.billingPortal.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("portal route error:", err);
    return NextResponse.json({ error: err?.message || "Portal error" }, { status: 500 });
  }
}
