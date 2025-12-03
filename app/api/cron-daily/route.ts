// app/api/cron-daily/route.ts
import { NextResponse } from "next/server";
import { runDailyDigest } from "@/app/api/daily-digest/route";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await runDailyDigest();
    console.log("[cron-daily] DONE", { fromCron: true, ...result });

    return NextResponse.json({
      fromCron: true,
      ...result, // contains ok, message, processed, ...
    });
  } catch (err) {
    console.error("[cron-daily] error", err);
    return NextResponse.json(
      { ok: false, error: "cron-daily failed" },
      { status: 500 }
    );
  }
}
