// app/api/cron-weekly/route.ts
import { NextResponse } from "next/server";
import { runWeeklyReport } from "@/app/api/weekly-report/route";

export const runtime = "nodejs";

export async function GET() {
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
