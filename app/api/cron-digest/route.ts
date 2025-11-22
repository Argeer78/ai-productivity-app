export async function GET() {
  try {
    const resp = await fetch(
      "https://moouqffemvtqzviozgsx.supabase.co/functions/v1/daily-digest",
      {
        method: "POST", // GET also works, but POST avoids caching issues
        headers: { "Content-Type": "application/json" }
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Digest function error:", text);
      return new Response("Error calling daily digest", { status: 500 });
    }

    return new Response("Daily digest triggered", { status: 200 });
  } catch (err) {
    console.error("Cron error:", err);
    return new Response("Cron failed", { status: 500 });
  }
}
