// lib/verifyCron.ts
import { NextRequest, NextResponse } from "next/server";

export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.warn("CRON_SECRET not set, skipping auth check");
    return null; // or return a 500 if you want to enforce it
  }

  if (authHeader !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return null;
}
