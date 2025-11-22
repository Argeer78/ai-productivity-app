export async function GET() {
  try {
    const resp = await fetch(
      "https://moouqffemvtqzviozgsx.supabase.co/functions/v1/daily-digest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }
    );

    if (!resp.ok) {
      return new Response("Supabase function error", { status: 500 });
    }

    return new Response("Daily digest triggered", { status: 200 });
  } catch (err) {
    return new Response("Cron failed", { status: 500 });
  }
}
