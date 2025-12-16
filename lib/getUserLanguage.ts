import { createClient } from "@supabase/supabase-js";

export async function getUserLanguageFromSupabase(userId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server only
  );

  const { data, error } = await supabase
    .from("profiles")
    .select("language_code")
    .eq("id", userId)
    .single();

  if (error) return "en";
  return data?.language_code || "en";
}
