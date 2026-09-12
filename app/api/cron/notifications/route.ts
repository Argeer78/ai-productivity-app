import { NextRequest, NextResponse } from "next/server";
import { runNotifications } from "@/app/api/notifications/route";
import { verifyCronAuth } from "@/lib/verifyCron";
import { enforceInternalRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
    const rateLimit = await enforceInternalRateLimit("internal:notifications");
    if (!rateLimit.ok) return rateLimit.response;

  const startTime = new Date().toISOString(); // Track when the cron job started

  try {
    // Call the runNotifications function and log the start time
    console.log(`[cron-notifications] Started at ${startTime}`);

    const result = await runNotifications();
    const endTime = new Date().toISOString(); // Track when the cron job ends

    // Log the result with execution time
    console.log(`[cron-notifications] Completed at ${endTime}`, { fromCron: true, result });

    return NextResponse.json({
      fromCron: true,
      result,
      status: "success",
      executedAt: endTime,
    });
  } catch (err) {
    // Log error with timestamp
    const errorTime = new Date().toISOString();
    console.error(`[cron-notifications] error at ${errorTime}`, err);

    return NextResponse.json(
      { ok: false, error: "cron-notifications failed" },
      { status: 500 }
    );
  }
}
