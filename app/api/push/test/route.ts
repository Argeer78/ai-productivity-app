// app/api/push/test/route.ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTaskReminderEmail } from "@/lib/emailTasks";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

export async function POST(req: Request) {
  try {
    // ✅ 1) Require VAPID keys – if missing, return an error, not ok:true
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.error(
        "[push/test] Missing VAPID_PUBLIC or VAPID_PRIVATE – cannot send push"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Missing VAPID keys (VAPID_PUBLIC / VAPID_PRIVATE)",
        },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // 2) Load push subscription
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (subErr || !sub) {
      console.error("[push/test] no subscription:", subErr);
      return NextResponse.json(
        { ok: false, error: "No subscription for this user" },
        { status: 404 }
      );
    }

    // 3) Load user email for debug email
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    const email = profile?.email as string | undefined;
    if (profileErr) {
      console.error("[push/test] profile error:", profileErr);
    }

    // 4) Send PUSH notification
    const payload = JSON.stringify({
      title: "Test task reminder",
      body: "If you see this, push notifications are wired end-to-end ✅",
      url: "/tasks",
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        } as any,
        payload
      );
      console.log("[push/test] push sent OK");
    } catch (err: any) {
      console.error(
        "[push/test] webpush error:",
        err?.statusCode,
        err?.body || err
      );
      return NextResponse.json(
        { ok: false, error: "webpush send error" },
        { status: 500 }
      );
    }

    // 5) Send debug EMAIL using the same helper (optional but useful)
    if (email) {
      try {
        await sendTaskReminderEmail({
          to: email,
          taskTitle: "Test task reminder",
          taskNote:
            "If you see this email, the task reminder email pipeline works ✅",
          dueAt: null,
        });
      } catch (err) {
        console.error("[push/test] email send error:", err);
        // don't fail test just because email failed
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/test] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Push send error" },
      { status: 500 }
    );
  }
}
