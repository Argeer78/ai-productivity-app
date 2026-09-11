import { createClient, type User } from "@supabase/supabase-js";

export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: "missing_token" | "invalid_token" | "server_misconfigured" };

export async function getAuthenticatedUser(request: Request): Promise<AuthResult> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[auth] Supabase server authentication is not configured");
    return { user: null, error: "server_misconfigured" };
  }

  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { user: null, error: "missing_token" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, error: "invalid_token" };
  }

  return { user: data.user, error: null };
}