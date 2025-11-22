// app/api/cron-digest/route.ts

export const dynamic = "force-dynamic"; // avoid any caching for cron

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  // If CRON_SECRET not set, fail loudly so you notice
  if (!expectedSecret) {
    console.error("[cron-digest] CRON_SECRET is not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  // 1) Check Authorization header (what Vercel Cron uses)
  const authHeader = request.headers.get("authorization") || "";

  // 2) Also allow ?secret=... for manual testing in browser
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  const headerMatches = authHeader === `Bearer ${expectedSecret}`;
  const queryMatches = querySecret === expectedSecret;

  if (!headerMatches && !queryMatches) {
    console.warn("[cron-digest] Unauthorized call");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Call your Supabase Edge Function
    const resp = await fetch(
      "https://moouqffemvtqzviozgsx.supabase.co/functions/v1/daily-digest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[cron-digest] Supabase function error:", text);
      return new Response("Error calling daily digest", { status: 500 });
    }

    console.log("[cron-digest] Daily digest triggered successfully");
    return new Response("Daily digest triggered", { status: 200 });
  } catch (err) {
    console.error("[cron-digest] Cron failed:", err);
    return new Response("Cron failed", { status: 500 });
  }
}
