import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// If key missing, we still compile but respond with an error at runtime
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  : null;

export async function GET() {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured (missing STRIPE_SECRET_KEY)" },
        { status: 500 }
      );
    }

    // ---------- Active subscriptions & MRR ----------
    // We’ll approximate MRR using all active monthly subscriptions (max 100 for now)
    const subs = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    });

    let activeSubscriptions = 0;
    let mrr = 0;
    let currency = "EUR";

    subs.data.forEach((sub) => {
      activeSubscriptions += 1;

      sub.items.data.forEach((item) => {
        const price = item.price;
        if (!price) return;
        if (
          price.recurring?.interval === "month" &&
          typeof price.unit_amount === "number"
        ) {
          mrr += price.unit_amount / 100;
          if (price.currency) {
            currency = price.currency.toUpperCase();
          }
        }
      });
    });

    // ---------- Revenue over time from invoices ----------
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const twelveMonthsAgo = now - 365 * 24 * 60 * 60;

    // Limit to last 100 paid invoices – good enough for a small app
    const invoices = await stripe.invoices.list({
      status: "paid",
      limit: 100,
      expand: ["data.charge"],
    });

    let revenueLast30Days = 0;
    let revenueLast12Months = 0;

    invoices.data.forEach((inv) => {
      const created = inv.created || 0;
      const amount = (inv.amount_paid || 0) / 100;
      const invCurrency = inv.currency?.toUpperCase();

      if (invCurrency && !currency) {
        currency = invCurrency;
      }

      if (created >= thirtyDaysAgo) {
        revenueLast30Days += amount;
      }
      if (created >= twelveMonthsAgo) {
        revenueLast12Months += amount;
      }
    });

    return NextResponse.json({
      activeSubscriptions,
      mrr,
      revenueLast30Days,
      revenueLast12Months,
      currency,
    });
  } catch (err) {
    console.error("[admin-revenue] unexpected error", err);
    return NextResponse.json(
      { error: "Failed to load revenue analytics." },
      { status: 500 }
    );
  }
}
