// app/api/cron-weekly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runWeeklyReport } from "@/app/api/weekly-report/route";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const result = await runWeeklyReport();
    console.log("[cron-weekly] DONE", { fromCron: true, result });

    return NextResponse.json({
      fromCron: true,
      result,
    });
  } catch (err) {
    console.error("[cron-weekly] error", err);
    return NextResponse.json(
      { ok: false, error: "cron-weekly failed" },
      { status: 500 }
    );
  }
}
