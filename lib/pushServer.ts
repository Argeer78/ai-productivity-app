// lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Backwards-compatible named export (fixes all your Vercel errors)
export const supabaseAdmin: SupabaseClient | null = (() => {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) {
    console.warn(
      "[supabaseAdmin] Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "admin-server" } },
  });
})();

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;
  cached = supabaseAdmin;
  return cached;
}