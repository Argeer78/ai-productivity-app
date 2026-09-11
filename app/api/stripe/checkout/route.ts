// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import {
  getStripePriceId,
  type StripeCurrency,
  type StripePlan,
} from "@/lib/stripePrices";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: auth.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    if (!stripe) {
      console.error("[stripe/checkout] Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 503 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          currency?: string;
          plan?: string; // "pro" | "yearly" | "founder"
        }
      | null;

    if (!body?.currency || !auth.user.email) {
      return NextResponse.json(
        { ok: false, error: "Missing account email or currency." },
        { status: 400 }
      );
    }

    const currency = body.currency.toLowerCase() as StripeCurrency;

    if (!["eur", "usd", "gbp"].includes(currency)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported currency "${body.currency}".` },
        { status: 400 }
      );
    }

    // 🔁 Normalize plan (default to "pro" monthly if missing/unknown)
    const requestedPlan = (body.plan || "pro").toLowerCase();
    let planType: StripePlan;
    if (requestedPlan === "founder") {
      planType = "founder";
    } else if (requestedPlan === "yearly") {
      planType = "yearly";
    } else {
      planType = "pro";
    }

    const priceId = getStripePriceId(planType, currency);

    if (!priceId) {
      console.error(
        "[stripe/checkout] No price for currency/plan",
        currency,
        planType
      );
      return NextResponse.json(
        {
          ok: false,
          error: `No Stripe price configured for plan "${planType}" and currency "${currency}".`,
        },
        { status: 503 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: "Application URL is not configured on the server." },
        { status: 503 }
      );
    }
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: auth.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${normalizedBaseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${normalizedBaseUrl}/dashboard?checkout=cancelled`,
      metadata: {
        userId: auth.user.id,
        plan: planType, // "pro" | "yearly" | "founder"
        currency,
      },
    });

    if (!session.url) {
      console.error("[stripe/checkout] session missing URL", session);
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe did not return a checkout URL.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, url: session.url },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[stripe/checkout] Unexpected error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
