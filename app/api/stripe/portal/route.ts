import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY on the server" },
        { status: 500 }
      );
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // 1) Get the user's Stripe customer id from profiles
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("portal: profile error", error);
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this user." },
        { status: 404 }
      );
    }

    // 2) Create a Billing Portal session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/settings`
        : "http://localhost:3000/settings";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("portal route error:", err);
    return NextResponse.json(
      { error: err?.message || "Could not create portal session" },
      { status: 500 }
    );
  }
}
