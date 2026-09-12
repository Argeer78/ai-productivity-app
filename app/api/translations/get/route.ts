// app/api/get-translations/route.ts (or wherever this lives)
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceAnonymousRateLimit } from "@/lib/rateLimit";

const requestSchema = z.object({
  lang: z.string().min(2).max(16).regex(/^[a-z]{2,3}(-[a-z]{2})?$/i),
  path: z.string().max(200).regex(/^\/?[a-z0-9/_-]*$/i).optional(),
}).strict();

export async function POST(req: Request) {
  try {
    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const lang = parsedBody.data.lang.toLowerCase();
    const path = (parsedBody.data.path || "").trim();
    const rateLimit = await enforceAnonymousRateLimit(req, "public:translations", "public-light");
    if (!rateLimit.ok) return rateLimit.response;

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
