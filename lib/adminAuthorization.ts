import type { User } from "@supabase/supabase-js";
import type { AuthResult } from "@/lib/serverAuth";

export type AdminAuthResult =
  | { user: User; error: null; status: 200 }
  | { user: null; error: "Unauthorized" | "Forbidden" | "Admin authorization unavailable"; status: 401 | 403 | 500 };

export async function authorizeAdminIdentity(
  auth: AuthResult,
  checkMembership: (userId: string) => Promise<boolean>
): Promise<AdminAuthResult> {
  if (!auth.user) {
    return {
      user: null,
      error: auth.error === "server_misconfigured" ? "Admin authorization unavailable" : "Unauthorized",
      status: auth.error === "server_misconfigured" ? 500 : 401,
    };
  }

  try {
    if (!(await checkMembership(auth.user.id))) {
      return { user: null, error: "Forbidden", status: 403 };
    }
  } catch {
    return { user: null, error: "Admin authorization unavailable", status: 500 };
  }

  return { user: auth.user, error: null, status: 200 };
}