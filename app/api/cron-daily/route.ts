// app/api/cron-daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runDailyDigest } from "@/app/api/daily-digest/route";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const result = await runDailyDigest();

    // result can be any shape; no spreading → no TS error
    console.log("[cron-daily] DONE", { fromCron: true, result });

    return NextResponse.json({
      fromCron: true,
      result,
    });
  } catch (err) {
    console.error("[cron-daily] error", err);
    return NextResponse.json(
      { ok: false, error: "cron-daily failed" },
      { status: 500 }
    );
  }
}
