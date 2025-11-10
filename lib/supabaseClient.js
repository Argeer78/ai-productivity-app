import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Basic safety check
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or anon key is missing. Check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
