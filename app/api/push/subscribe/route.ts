// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();

    if (!userId || !subscription) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or subscription" },
        { status: 400 }
      );
    }

    const endpoint = subscription?.endpoint as string | undefined;
    const p256dh = subscription?.keys?.p256dh as string | undefined;
    const auth = subscription?.keys?.auth as string | undefined;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { ok: false, error: "Invalid subscription payload (missing keys)" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          subscription, // full JSON for convenience
        },
        { onConflict: "user_id" } // matches the UNIQUE constraint we added
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
