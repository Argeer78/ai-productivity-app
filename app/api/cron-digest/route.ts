// app/api/cron-digest/route.ts
import { NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/verifyCron";

export const dynamic = "force-dynamic"; // never cache cron responses

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

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
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error(
        "[cron-digest] /api/daily-digest failed:",
        resp.status,
        text
      );
      return new Response(
        text || `/api/daily-digest failed with status ${resp.status}`,
        { status: 500 }
      );
    }

    console.log("[cron-digest] Daily digest triggered successfully");
    return new Response(text || "Daily digest triggered", { status: 200 });
  } catch (err) {
    console.error("[cron-digest] Cron failed:", err);
    return new Response("Cron failed (see server logs)", { status: 500 });
  }
}
