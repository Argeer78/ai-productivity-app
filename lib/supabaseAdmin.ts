import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Prefer non-public server env var if you have it.
// Fallback to NEXT_PUBLIC_SUPABASE_URL only if needed.
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ✅ Primary export (backwards compatible with your existing imports)
export const supabaseAdmin: SupabaseClient = (() => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    // Throw on server routes so you immediately see misconfigured env on Vercel
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env (server-only)."
    );
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "admin-server" } },
  });
})();

// (Optional) keep helper you started using
let cached: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = supabaseAdmin;
  return cached;
}
