import "server-only";

import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AdminAuthResult =
  | { user: User; error: null; status: 200 }
  | { user: null; error: "Unauthorized" | "Forbidden" | "Admin authorization unavailable"; status: 401 | 403 | 500 };

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const auth = await getAuthenticatedUser(request);

  if (!auth.user) {
    return {
      user: null,
      error: auth.error === "server_misconfigured" ? "Admin authorization unavailable" : "Unauthorized",
      status: auth.error === "server_misconfigured" ? 500 : 401,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin-auth] Failed to verify admin membership", error.message);
    return { user: null, error: "Admin authorization unavailable", status: 500 };
  }

  if (!data) {
    return { user: null, error: "Forbidden", status: 403 };
  }

  return { user: auth.user, error: null, status: 200 };
}

export function adminAuthErrorResponse(result: AdminAuthResult) {
  if (!result.error) return null;
  return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
}