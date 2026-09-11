// app/api/admin-revenue/route.ts
import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/adminAuth";

// Simple stub for Admin Revenue card.
// This keeps the UI working even before Stripe is wired up.
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  const authError = adminAuthErrorResponse(admin);
  if (authError) return authError;

  return NextResponse.json(
    {
      activeSubscriptions: 0,
      mrr: 0,
      revenueLast30Days: 0,
      revenueLast12Months: 0,
      currency: "EUR",
    },
    { status: 200 }
  );
}
