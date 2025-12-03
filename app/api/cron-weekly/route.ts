// app/api/cron-weekly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";
import { runWeeklyReport } from "@/app/api/weekly-report/route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const result = await runWeeklyReport();

    console.log("[cron-weekly] DONE", result);

    return NextResponse.json({
  fromCron: true,
  ...result, // don't repeat ok
});
  } catch (err) {
    console.error("[cron-weekly] error", err);
    return NextResponse.json(
      { ok: false, error: "cron-weekly failed" },
      { status: 500 }
    );
  }
}
