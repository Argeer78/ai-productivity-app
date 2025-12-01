// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      // Align with Stripe dashboard API version if needed
      apiVersion: "2024-06-20",
    })
  : null;

type Currency = "eur" | "usd" | "gbp";
type PlanType = "pro" | "yearly" | "founder";

// ✅ Pro MONTHLY price IDs
const PRO_PRICE_IDS: Record<Currency, string> = {
  eur: "price_1SZXgJIaVkwgnHGjGepES6Vc",
  usd: "price_1SZXxSIaVkwgnHGjm9SLuPfm",
  gbp: "price_1SZXzNIaVkwgnHGjg4BdMcdJ",
};

// ✅ Pro YEARLY price IDs
const YEARLY_PRICE_IDS: Record<Currency, string> = {
  eur: "price_1SZXiIIaVkwgnHGjRoYLY1n3",
  usd: "price_1SZY1DIaVkwgnHGjuNUXWjVB",
  gbp: "price_1SZY2DIaVkwgnHGj51H10PI4",
};

// ✅ Founder MONTHLY price IDs
const FOUNDER_PRICE_IDS: Record<Currency, string> = {
  eur: "price_1SZXm9IaVkwgnHGjkj3mYYu7",
  usd: "price_1SZXqYIaVkwgnHGjROTAO47Y",
  gbp: "price_1SZXseIaVkwgnHGjdck8h4Qw",
};

export async function POST(req: Request) {
  try {
    if (!stripe) {
      console.error("[stripe/checkout] Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { ok: false, error: "Stripe is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | {
          userId?: string;
          email?: string;
          currency?: string;
          plan?: string; // "pro" | "yearly" | "founder"
        }
      | null;

    if (!body || !body.userId || !body.email || !body.currency) {
      console.error("[stripe/checkout] Missing required fields", body);
      return NextResponse.json(
        { ok: false, error: "Missing userId, email or currency." },
        { status: 400 }
      );
    }

    const currency = body.currency.toLowerCase() as Currency;

    if (!["eur", "usd", "gbp"].includes(currency)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported currency "${body.currency}".` },
        { status: 400 }
      );
    }

    // 🔁 Normalize plan (default to "pro" monthly if missing/unknown)
    const requestedPlan = (body.plan || "pro").toLowerCase();
    let planType: PlanType;
    if (requestedPlan === "founder") {
      planType = "founder";
    } else if (requestedPlan === "yearly") {
      planType = "yearly";
    } else {
      planType = "pro";
    }

    // 🔗 Choose correct price ID based on planType + currency
    let priceId: string | undefined;
    if (planType === "founder") {
      priceId = FOUNDER_PRICE_IDS[currency];
    } else if (planType === "yearly") {
      priceId = YEARLY_PRICE_IDS[currency];
    } else {
      priceId = PRO_PRICE_IDS[currency];
    }

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
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") || "";
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || origin || "https://aiprod.app";

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
