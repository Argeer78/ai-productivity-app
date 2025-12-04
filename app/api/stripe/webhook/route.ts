// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs"; // ensure Node runtime (not edge)

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Support multiple founder price IDs: comma-separated env
// e.g. STRIPE_FOUNDER_PRICE_IDS="price_eur,price_usd,price_gbp"
const FOUNDER_PRICE_IDS: string[] = (process.env.STRIPE_FOUNDER_PRICE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY env var is missing");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

type Plan = "free" | "pro" | "founder";

function isActiveStatus(status: Stripe.Subscription.Status) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}

function isFounderPrice(priceId: string | null | undefined): boolean {
  if (!priceId) return false;
  return FOUNDER_PRICE_IDS.includes(priceId);
}

// Decide plan based on subscription status + price id (for founders)
function planFromSubscription(sub: Stripe.Subscription): Plan {
  const status = sub.status;

  const priceId =
    ((sub.items?.data?.[0]?.price?.id as string | undefined) ||
      // older accounts may still use plan.id
      ((sub.items?.data?.[0] as any)?.plan?.id as string | undefined)) ?? "";

  const active = isActiveStatus(status);

  if (isFounderPrice(priceId)) {
    // Founder is lifetime *while* subscription is on; if they cancel, go back to free
    return active ? "founder" : "free";
  }

  return active ? "pro" : "free";
}

export async function POST(req: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  // 1) Verify signature using the raw body
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(
      "Stripe webhook signature verification failed:",
      err?.message || err
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2) Handle events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const metadata = (session.metadata || {}) as Record<string, string>;
        const metaUserId =
          metadata.userId || metadata.user_id || null;

        const email =
          (session as any).customer_email ??
          session.customer_details?.email ??
          null;

        const customerId =
          (typeof session.customer === "string"
            ? session.customer
            : null) ?? null;

        console.log("WEBHOOK checkout.session.completed", {
          customerId,
          email,
          metadata,
          sessionId: session.id,
        });

        // Decide if this is a founder or pro checkout
        let plan: Plan = "pro";
        try {
          const fullSession = await stripe.checkout.sessions.retrieve(
            session.id,
            { expand: ["line_items.data.price"] }
          );

          const li = fullSession.line_items?.data?.[0];
          const priceId = (li?.price?.id as string | undefined) ?? "";

          if (isFounderPrice(priceId)) {
            plan = "founder";
          } else {
            plan = "pro";
          }
        } catch (e) {
          console.error(
            "Failed to retrieve full Checkout Session for priceId:",
            e
          );
          // default plan stays "pro"
        }

        const updates: Partial<{
          plan: Plan;
          stripe_customer_id: string;
        }> = { plan };
        if (customerId) {
          updates.stripe_customer_id = customerId;
        }

        // Prefer userId from metadata if present
        try {
          if (metaUserId) {
            const { error: upErr } = await supabaseAdmin
              .from("profiles")
              .update(updates)
              .eq("id", metaUserId);

            if (upErr) {
              console.error(
                "profiles update by userId (checkout) failed:",
                upErr
              );
            }
          } else if (email) {
            const { error: upErr } = await supabaseAdmin
              .from("profiles")
              .update(updates)
              .eq("email", email);

            if (upErr) {
              console.error(
                "profiles update by email (checkout) failed:",
                upErr
              );
            }
          } else {
            console.warn(
              "checkout.session.completed: no userId or email to map profile"
            );
          }
        } catch (e) {
          console.error("DB error during checkout.session.completed:", e);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const plan = planFromSubscription(sub);

        console.log("WEBHOOK subscription.updated/created", {
          customerId,
          status: sub.status,
          plan,
        });

        try {
          const { error: upErr } = await supabaseAdmin
            .from("profiles")
            .update({ plan })
            .eq("stripe_customer_id", customerId);

          if (upErr) {
            console.error("profiles plan update by customerId failed:", upErr);
          }
        } catch (e) {
          console.error(
            "DB error during customer.subscription.updated/created:",
            e
          );
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        console.log("WEBHOOK subscription.deleted", {
          customerId,
          status: sub.status,
        });

        // When subscription is deleted, everyone goes back to free
        try {
          const { error: upErr } = await supabaseAdmin
            .from("profiles")
            .update({ plan: "free" })
            .eq("stripe_customer_id", customerId);

          if (upErr) {
            console.error(
              "profiles plan cancel update by customerId failed:",
              upErr
            );
          }
        } catch (e) {
          console.error("DB error during customer.subscription.deleted:", e);
        }

        break;
      }

      default:
        // Not relevant to plans; just log and acknowledge
        console.log("Unhandled Stripe webhook event type:", event.type);
        break;
    }

    // Always acknowledge so Stripe stops retrying
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    // Return 200 anyway so Stripe doesn't retry forever.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
