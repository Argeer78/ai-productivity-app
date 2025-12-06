import { createClient } from "@supabase/supabase-js";

// Fetch the Supabase URL and service role key from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Guard against missing environment variables on the server
if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for supabaseAdmin. Please check your .env file.");
}
if (!SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for supabaseAdmin. Please check your .env file.");
}

// SERVER-ONLY client – this should NEVER be imported into client components!
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false, // Do not persist session for server-side requests
  },
  global: {
    headers: {
      "X-Client-Info": "admin-metrics", // Custom client header for tracking/debugging
    },
  },
});
