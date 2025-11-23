// app/api/cron-digest/route.ts

export const dynamic = "force-dynamic"; // never cache cron responses

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[cron-digest] CRON_SECRET is not set");
    return new Response("Server misconfigured: CRON_SECRET missing", {
      status: 500,
    });
  }

  const authHeader = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") || "";

  const headerMatches = authHeader === `Bearer ${expectedSecret}`;
  const queryMatches = querySecret === expectedSecret;

  if (!headerMatches && !queryMatches) {
    console.warn("[cron-digest] Unauthorized call");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const resp = await fetch(
      "https://moouqffemvtqzviozgsx.supabase.co/functions/v1/daily-digest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const text = await resp.text();

    if (!resp.ok) {
      console.error(
        "[cron-digest] Supabase daily-digest failed:",
        resp.status,
        text
      );
      // Forward the Supabase error body to you so you can see it
      return new Response(
        text || `daily-digest failed with status ${resp.status}`,
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
