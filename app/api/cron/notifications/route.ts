// app/api/cron/notifications/route.ts
import { NextResponse } from "next/server";
import { runNotifications } from "@/app/api/notifications/route";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await runNotifications();
    console.log("[cron-notifications] DONE", { fromCron: true, result });

    return NextResponse.json({
      fromCron: true,
      result,
    });
  } catch (err) {
    console.error("[cron-notifications] error", err);
    return NextResponse.json(
      { ok: false, error: "cron-notifications failed" },
      { status: 500 }
    );
  }
}
