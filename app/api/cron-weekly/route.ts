// app/api/cron-weekly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // 1) Verify it's actually Vercel Cron
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron-weekly] CRON_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET missing" },
      { status: 500 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const url = `${origin}/api/weekly-report`;

  let data: any = null;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[cron-weekly] /api/weekly-report failed", {
        status: res.status,
        data,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "weekly-report failed",
          status: res.status,
          data,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[cron-weekly] fetch error → /api/weekly-report", err);
    return NextResponse.json(
      { ok: false, error: "fetch to weekly-report failed" },
      { status: 500 }
    );
  }

  console.log("[cron-weekly] DONE", data);

  return NextResponse.json({
    ok: true,
    fromCron: true,
    child: data,
  });
}
