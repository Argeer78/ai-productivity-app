import "server-only";

import { NextResponse } from "next/server";
import { authorizeAdminIdentity, type AdminAuthResult } from "@/lib/adminAuthorization";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin-auth] Failed to verify admin membership", error.message);
    throw new Error("Admin authorization unavailable");
  }

  return Boolean(data);
}

export async function requireAdmin(
  request: Request
): Promise<AdminAuthResult> {
  return authorizeAdminIdentity(await getAuthenticatedUser(request), isAdminUser);
}

export function adminAuthErrorResponse(result: AdminAuthResult) {
  if (!result.error) return null;
  return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
}