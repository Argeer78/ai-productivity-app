import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTaskReminderPush } from "@/lib/pushServer";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json().catch(() => ({}));

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // Get the latest subscription for this user
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[push-test] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "DB error loading subscription" },
        { status: 500 }
      );
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No subscription found for this user" },
        { status: 404 }
      );
    }

    const sub = subs[0];

    console.log("[push-test] Sending test push to", sub.endpoint);

    await sendTaskReminderPush(sub, {
      taskId: "test-task",
      title: "🔔 Test push from AI Productivity Hub",
      note: "If you see this, push notifications are working!",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push-test] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
