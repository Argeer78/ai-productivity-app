// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      // use the version your stripe package expects
      apiVersion: "2025-10-29.clover",
    })
  : null;

// Multi-currency price IDs
const PRO_PRICE_IDS: Record<"eur" | "usd" | "gbp", string | undefined> = {
  eur: process.env.STRIPE_PRICE_EUR,
  usd: process.env.STRIPE_PRICE_USD,
  gbp: process.env.STRIPE_PRICE_GBP,
};

export async function POST(req: Request) {
  try {
    if (!stripe) {
      console.error("[stripe/checkout] Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { ok: false, error: "Stripe not configured on server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          userId?: string;
          email?: string;
          currency?: string;
        }
      | null;

    if (!body || !body.userId || !body.email || !body.currency) {
      console.error("[stripe/checkout] Missing required fields", body);
      return NextResponse.json(
        { ok: false, error: "Missing userId, email or currency." },
        { status: 400 }
      );
    }

    const currency = body.currency.toLowerCase() as "eur" | "usd" | "gbp";
    const priceId = PRO_PRICE_IDS[currency];

    if (!priceId) {
      console.error(
        `[stripe/checkout] No price configured for currency "${currency}".`
      );
      return NextResponse.json(
        {
          ok: false,
          error: `No Stripe price configured for currency "${currency}".`,
        },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: body.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
      metadata: {
        userId: body.userId,
        plan: "pro",
        currency,
      },
    });

    if (!session.url) {
      console.error("[stripe/checkout] Session created without URL", session);
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe checkout session created without a redirect URL.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[stripe/checkout] Unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
