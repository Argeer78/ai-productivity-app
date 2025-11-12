// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs"; // ensure Node runtime (not edge)

// Use the SDK's pinned API version (avoid TS mismatch errors)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Map Stripe subscription status to our plan
function planFromStatus(status: Stripe.Subscription.Status): "free" | "pro" {
  return status === "trialing" || status === "active" || status === "past_due"
    ? "pro"
    : "free";
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whSecret) {
    return NextResponse.json(
      { error: "Missing Stripe signature or STRIPE_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    // Read raw body text for signature verification
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) ?? null;
        const email = session.customer_details?.email ?? null;
        const metaUserId =
          (session.metadata as any)?.userId ??
          (session.metadata as any)?.user_id ??
          null;

        // Helpful debug log (safe to keep during testing)
        console.log("WEBHOOK checkout.session.completed", {
          customerId,
          email,
          metadata: session.metadata,
        });

        if (!customerId) break;

        if (metaUserId) {
          const { error: upErr } = await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: customerId, plan: "pro" })
            .eq("id", metaUserId);
          if (upErr) console.error("profiles update by userId failed:", upErr);
        } else if (email) {
          const { error: upErr } = await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: customerId, plan: "pro" })
            .eq("email", email);
          if (upErr) console.error("profiles update by email failed:", upErr);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const plan = planFromStatus(sub.status);

        console.log("WEBHOOK subscription.updated", {
          customerId,
          status: sub.status,
          plan,
        });

        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({ plan })
          .eq("stripe_customer_id", customerId);
        if (upErr) console.error("profiles plan update failed:", upErr);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        console.log("WEBHOOK subscription.deleted", { customerId });

        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({ plan: "free" })
          .eq("stripe_customer_id", customerId);
        if (upErr) console.error("profiles plan cancel update failed:", upErr);
        break;
      }

      default:
        // ignore other events
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
