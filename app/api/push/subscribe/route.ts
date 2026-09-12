import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceAuthenticatedRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Define types for the subscription data
interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscription {
  endpoint: string;
  keys: SubscriptionKeys;
}

interface SubscribeRequest {
  subscription: PushSubscription;
}

const requestSchema = z.object({
  subscription: z.object({
    endpoint: z.url().max(2_048).refine((value) => value.startsWith("https://")),
    keys: z.object({ p256dh: z.string().min(20).max(512), auth: z.string().min(8).max(256) }).strict(),
  }).strict(),
}).strict();

export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: authResult.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { subscription }: SubscribeRequest = parsedBody.data;

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    const rateLimit = await enforceAuthenticatedRateLimit(authResult.user.id, "push:subscribe", "authenticated-standard");
    if (!rateLimit.ok) return rateLimit.response;

    // Upsert subscription in the database
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: authResult.user.id,
          endpoint,
          p256dh,
          auth,
          subscription, // Store full subscription object
        },
        { onConflict: "user_id,endpoint" } // Prevent duplicates based on user_id
      );

    if (error) {
      console.error("Push subscribe DB error:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to save push subscription",
        },
        { status: 500 }
      );
    }

    console.log("[Push Subscribe] Subscription saved successfully for authenticated user");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
