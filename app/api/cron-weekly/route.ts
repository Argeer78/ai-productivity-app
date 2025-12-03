// app/api/cron-weekly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // 1) Make sure this really is your Vercel cron (or a manual call with secret)
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const origin = req.nextUrl.origin;
    const weeklyUrl = new URL("/api/weekly-report", origin);

    // 2) Call the real weekly-report job inside the same deployment
    const res = await fetch(weeklyUrl.toString(), {
      method: "GET",
      headers: {
        // /api/weekly-report expects this Authorization header
        authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[cron-weekly] /api/weekly-report failed", {
        status: res.status,
        data,
      });

      return NextResponse.json(
        {
          ok: false,
          fromCron: true,
          error:
            data?.error ||
            `weekly-report failed with status ${res.status}`,
        },
        { status: 500 }
      );
    }

    console.log("[cron-weekly] DONE", {
      fromCron: true,
      weekly: data,
    });

    return NextResponse.json(
      {
        ok: true,
        fromCron: true,
        weekly: data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[cron-weekly] unexpected error", err);
    return NextResponse.json(
      { ok: false, fromCron: true, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
