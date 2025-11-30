export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resp = await fetch(
    "https://moouqffemvtqzviozgsx.supabase.co/functions/v1/weekly-report",
    { method: "POST" }
  );

  const text = await resp.text();
  return new Response(text, { status: resp.ok ? 200 : 500 });
}
