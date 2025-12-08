import { NextResponse } from "next/server";
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
  userId: string;
  subscription: PushSubscription;
}

export async function POST(req: Request) {
  try {
    const { userId, subscription }: SubscribeRequest = await req.json();

    // Validate userId and subscription
    if (!userId || !subscription) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or subscription" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Validate subscription keys
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { ok: false, error: "Invalid subscription payload (missing keys)" },
        { status: 400 }
      );
    }

    // Optionally validate endpoint URL (e.g., check it's a valid URL)
    try {
      new URL(endpoint); // This throws an error if the URL is invalid
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: "Invalid endpoint URL" },
        { status: 400 }
      );
    }

    // Upsert subscription in the database
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
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
          error: "DB error",
          details: error.details ?? error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    console.log("[Push Subscribe] Subscription saved successfully for user", userId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
