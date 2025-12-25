// lib/aiUsageServer.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function bumpAiUsage(userId: string, inc = 1) {
  if (!userId) return;

  const { error } = await supabaseAdmin.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_inc: inc,
  });

  if (error) console.error("[ai-usage] increment error", error);
}

export async function getAiUsageToday(userId: string) {
  if (!userId) return 0;

  const { data, error } = await supabaseAdmin.rpc("get_ai_usage_today", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[ai-usage] get today error", error);
    return 0;
  }
  return Number(data ?? 0);
}
