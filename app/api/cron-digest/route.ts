// app/api/cron-digest/route.ts
import { NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";
import { enforceInternalRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic"; // never cache cron responses

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  const rateLimit = await enforceInternalRateLimit("internal:cron-digest");
  if (!rateLimit.ok) return rateLimit.response;

  const expectedSecret = process.env.CRON_SECRET;

  try {
    // 👇 Call your *Next.js* daily-digest route, NOT the Supabase Edge Function
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://aiprod.app";

    const resp = await fetch(`${baseUrl}/api/daily-digest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // pass the same secret so /api/daily-digest can verify
        authorization: `Bearer ${expectedSecret!}`,
      },
      signal: AbortSignal.timeout(35_000),
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error("[cron-digest] downstream request failed", { status: resp.status });
      return new Response("Daily digest failed", { status: 502 });
    }

    console.log("[cron-digest] Daily digest triggered successfully");
    return new Response(text || "Daily digest triggered", { status: 200 });
  } catch (err) {
    console.error("[cron-digest] Cron failed:", err);
    return new Response("Cron failed (see server logs)", { status: 500 });
  }
}
