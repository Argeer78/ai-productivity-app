// app/api/push/test/route.ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("[push/test] Missing VAPID keys in env");
}

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[push/test] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "DB error", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn("[push/test] No subscription row for user", userId);
      return NextResponse.json(
        { ok: false, error: "No subscription for this user" },
        { status: 404 }
      );
    }

    if (!data.endpoint || !data.p256dh || !data.auth) {
      console.error("[push/test] Incomplete subscription data:", data);
      return NextResponse.json(
        { ok: false, error: "Incomplete subscription in DB" },
        { status: 500 }
      );
    }

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json(
        { ok: false, error: "VAPID not configured" },
        { status: 500 }
      );
    }

    const subscription = {
      endpoint: data.endpoint,
      keys: {
        p256dh: data.p256dh,
        auth: data.auth,
      },
    };

    const payload = JSON.stringify({
      title: "Test task reminder",
      body: "If you see this, push notifications are wired end-to-end ✅",
      url: "/tasks",
    });

    const result = await webpush.sendNotification(subscription as any, payload);
    console.log("[push/test] webpush result status:", result.statusCode);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/test] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Push send error" },
      { status: 500 }
    );
  }
}
