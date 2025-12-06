import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // ✅ use existing client

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, endpoint } = body as { userId?: string; endpoint?: string };

    // We allow either userId, endpoint, or both.
    if (!userId && !endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or endpoint" },
        { status: 400 }
      );
    }

    // Validate userId (optional)
    if (userId && !isValidUUID(userId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid userId format" },
        { status: 400 }
      );
    }

    // Validate endpoint (optional)
    if (endpoint && !isValidUrl(endpoint)) {
      return NextResponse.json(
        { ok: false, error: "Invalid endpoint format" },
        { status: 400 }
      );
    }

    // ⚠️ Adjust table name/columns if yours is different
    let query = supabase.from("push_subscriptions").delete();

    if (userId) query = query.eq("user_id", userId);
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
    console.log("[push/unsubscribe] Successfully unsubscribed user:", userId, "from endpoint:", endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe] exception", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// Helper function to validate UUID format
function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(value);
}

// Helper function to validate URL format
function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}
