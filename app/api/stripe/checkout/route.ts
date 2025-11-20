// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

type SupportedCurrency = "eur" | "usd" | "gbp";

const PRICE_IDS: Record<SupportedCurrency, string> = {
  eur: process.env.STRIPE_PRICE_EUR || "",
  usd: process.env.STRIPE_PRICE_USD || "",
  gbp: process.env.STRIPE_PRICE_GBP || "",
};

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: "Stripe secret key is not configured." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          userId?: string;
          email?: string;
          currency?: SupportedCurrency;
        }
      | null;

    if (!body || !body.userId || !body.email || !body.currency) {
      console.error("[stripe/checkout] missing fields", body);
      return NextResponse.json(
        { ok: false, error: "Missing userId, email, or currency." },
        { status: 400 }
      );
    }

    const { userId, email, currency } = body;

    const priceId = PRICE_IDS[currency];
    if (!priceId) {
      console.error(
        "[stripe/checkout] no price configured for currency",
        currency
      );
      return NextResponse.json(
        {
          ok: false,
          error: `No Stripe price configured for currency "${currency}".`,
        },
        { status: 500 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // If you set payment_method_types in Dashboard, you can omit this.
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        userId,
        currency,
      },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      console.error("[stripe/checkout] no session.url returned", session);
      return NextResponse.json(
        {
          ok: false,
          error: "Could not create Stripe checkout session (no URL).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        url: session.url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    // 🔍 Very important: surface Stripe’s message so we see what’s wrong
    console.error("[stripe/checkout] exception", err);

    const msg =
      err?.message ||
      err?.raw?.message ||
      "Stripe checkout error (unknown error).";

    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
