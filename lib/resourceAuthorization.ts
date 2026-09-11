import type { User } from "@supabase/supabase-js";
import type { AuthResult } from "./serverAuth";

export type ResourceAuthorizationResult<Resource> =
  | { resource: Resource; user: User; error: null; status: 200 }
  | { resource: null; user: null; error: string; status: 401 | 404 | 500 };

export async function authorizeOwnedResource<Resource>(
  auth: AuthResult,
  loadOwnedResource: (userId: string) => Promise<Resource | null>
): Promise<ResourceAuthorizationResult<Resource>> {
  if (!auth.user) {
    return {
      resource: null,
      user: null,
      error: auth.error === "server_misconfigured" ? "Authorization unavailable" : "Unauthorized",
      status: auth.error === "server_misconfigured" ? 500 : 401,
    };
  }

  try {
    const resource = await loadOwnedResource(auth.user.id);
    if (!resource) {
      return { resource: null, user: null, error: "Not found", status: 404 };
    }

    return { resource, user: auth.user, error: null, status: 200 };
  } catch {
    return {
      resource: null,
      user: null,
      error: "Authorization unavailable",
      status: 500,
    };
  }
}