import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: authResult.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    const { subscription }: SubscribeRequest = await req.json();

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "Missing subscription" },
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
    } catch {
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
