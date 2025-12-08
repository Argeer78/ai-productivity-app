import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { lang, path } = await req.json();

  const { data, error } = await supabase
    .from("translations")
    .select("original_text, translated_text")
    .eq("lang_code", lang)
    .eq("page_path", path);

  if (error) {
    console.error("get translations error", error);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  return Response.json({
    ok: true,
    items: data ?? [],
  });
}
