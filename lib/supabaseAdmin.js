// lib/supabaseAdmin.js
import { createClient } from "@supabase/supabase-js";

// Prefer server-only SUPABASE_URL; fall back to NEXT_PUBLIC_* if needed
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) env var.");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
}

// IMPORTANT: service role key is server-only. Use this module only in API routes / server code.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

