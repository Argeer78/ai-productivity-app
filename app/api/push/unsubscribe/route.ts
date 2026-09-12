import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceAuthenticatedRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: auth.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    const parsedBody = await parseJsonBody(req, z.object({ endpoint: z.url().max(2_048).optional() }).strict(), REQUEST_LIMITS.smallJson);
    if (!parsedBody.ok) return parsedBody.response;
    const { endpoint } = parsedBody.data;
    const rateLimit = await enforceAuthenticatedRateLimit(auth.user.id, "push:unsubscribe", "authenticated-standard");
    if (!rateLimit.ok) return rateLimit.response;

    let query = supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", auth.user.id);

    if (endpoint) query = query.eq("endpoint", endpoint);

    const { error } = await query;

    if (error) {
      console.error("[push/unsubscribe] supabase error", error);
      return NextResponse.json(
        { ok: false, error: "Database error while unsubscribing" },
        { status: 500 }
      );
    }

    // Log successful unsubscription
    console.log("[push/unsubscribe] Successfully unsubscribed authenticated user");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe] exception", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
