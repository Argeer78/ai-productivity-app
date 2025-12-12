// lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;

  // Prefer server-only env vars (DO NOT use NEXT_PUBLIC here if you can avoid it)
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  // IMPORTANT: do not throw here — return null so API routes can fall back
  if (!url || !serviceKey) {
    console.warn(
      "[getSupabaseAdmin] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Returning null."
    );
    return null;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "admin-metrics" } },
  });

  return cached;
}
