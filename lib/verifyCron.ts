// lib/verifyCron.ts
import { NextRequest, NextResponse } from "next/server";

export function verifyCronAuth(req: NextRequest): NextResponse | null {
  if (!process.env.CRON_SECRET) {
    console.error("[cron] CRON_SECRET is not configured");
    return new NextResponse("Cron authentication is not configured", { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return null;
}
