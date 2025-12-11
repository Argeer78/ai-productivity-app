// app/api/get-translations/route.ts (or wherever this lives)
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const lang = (body.lang || "").toLowerCase();
    const path = (body.path || "").trim(); // optional – we'll treat it as a prefix

    if (!lang) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing lang" }),
        { status: 400 }
      );
    }

    // Build base query against ui_translations
    let query = supabase
      .from("ui_translations")
      .select("key, text")
      .eq("language_code", lang);

    // If caller passes `path`, use it as a prefix/namespace, e.g. "tools."
    // You can adjust this logic if you want `/dashboard` → "dashboard." etc.
    if (path) {
      // naive: strip leading slash and use as prefix
      const normalized = path.replace(/^\/+/, ""); // "/tools" -> "tools"
      query = query.like("key", `${normalized}.%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("get ui_translations error", error);
      return new Response(
        JSON.stringify({ ok: false, error: "DB error" }),
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      items: (data ?? []).map((row) => ({
        key: row.key,
        text: row.text,
      })),
    });
  } catch (err) {
    console.error("get-translations unexpected error", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Unexpected server error" }),
      { status: 500 }
    );
  }
}
