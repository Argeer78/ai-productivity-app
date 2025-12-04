// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendThankYouForUpgradeEmail } from "@/lib/stripeEmails";

export const runtime = "nodejs"; // ensure Node runtime (not edge)

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY env var is missing");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

type Plan = "free" | "pro" | "founder";

// 🔐 All founder price IDs (any currency)
const FOUNDER_PRICE_IDS = new Set<string>([
  "price_1SZXm9IaVkwgnHGjkj3mYYu7", // FOUNDER EUR
  "price_1SZXqYIaVkwgnHGjROTAO47Y", // FOUNDER USD
  "price_1SZXseIaVkwgnHGjdck8h4Qw", // FOUNDER GBP
]);

function isActiveStatus(status: Stripe.Subscription.Status) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}

// Decide plan based on subscription status + price id (for founders)
function planFromSubscription(sub: Stripe.Subscription): Plan {
  const active = isActiveStatus(sub.status);

  const firstItem = sub.items?.data?.[0];
  const priceId =
    (firstItem?.price?.id as string | undefined) ||
    // older accounts may still use plan.id
    ((firstItem as any)?.plan?.id as string | undefined) ||
    "";

  const isFounder = priceId && FOUNDER_PRICE_IDS.has(priceId);

  if (isFounder) {
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
        const metaUserId = metadata.userId || metadata.user_id || null;

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

        // Decide if this is a founder or pro checkout by checking the price id
        let plan: Plan = "pro";

        try {
          const fullSession = await stripe.checkout.sessions.retrieve(
            session.id,
            { expand: ["line_items.data.price"] }
          );

          const li = fullSession.line_items?.data?.[0];
          const priceId = (li?.price?.id as string | undefined) || "";

          if (priceId && FOUNDER_PRICE_IDS.has(priceId)) {
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
            
            // Send thank-you email (non-blocking)
if (email) {
  try {
    await sendThankYouForUpgradeEmail({ to: email, plan });
  } catch (e) {
    console.error("Failed to send thank-you email:", e);
  }
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
