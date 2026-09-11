import { NextResponse } from "next/server";
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

    const body = await req.json().catch(() => ({}));
    const { endpoint } = body as { endpoint?: string };

    if (endpoint && !isValidUrl(endpoint)) {
      return NextResponse.json(
        { ok: false, error: "Invalid endpoint format" },
        { status: 400 }
      );
    }

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

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
