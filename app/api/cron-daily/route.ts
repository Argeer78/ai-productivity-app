// app/api/cron-daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // 1) Verify it's actually Vercel Cron
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron-daily] CRON_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET missing" },
      { status: 500 }
    );
  }

  // 2) Build the URL to /api/daily-digest on this deployment
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const url = `${origin}/api/daily-digest`;

  let data: any = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        // Must match what /api/daily-digest expects
        Authorization: `Bearer ${secret}`,
      },
    });

    data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[cron-daily] /api/daily-digest failed", {
        status: res.status,
        data,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "daily-digest failed",
          status: res.status,
          data,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[cron-daily] fetch error → /api/daily-digest", err);
    return NextResponse.json(
      { ok: false, error: "fetch to daily-digest failed" },
      { status: 500 }
    );
  }

  console.log("[cron-daily] DONE", data);

  return NextResponse.json({
    ok: true,
    fromCron: true,
    child: data,
  });
}
