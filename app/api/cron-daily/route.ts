// app/api/cron-daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";
import { runDailyDigest } from "@/app/api/daily-digest/route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const result = await runDailyDigest();

    console.log("[cron-daily] DONE", result);

    return NextResponse.json({
      fromCron: true,
      ...result, // result already contains ok, message, etc.
    });
  } catch (err) {
    console.error("[cron-daily] error", err);
    return NextResponse.json(
      { ok: false, error: "cron-daily failed" },
      { status: 500 }
    );
  }
}
