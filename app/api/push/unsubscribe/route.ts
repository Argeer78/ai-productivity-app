import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UnsubPayload = {
  userId: string;
  endpoint: string;
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UnsubPayload;

    if (!body?.userId || !body?.endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or endpoint" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", body.userId)
      .eq("endpoint", body.endpoint);

    if (error) {
      console.error("[push/unsubscribe] DB error:", error);
      return NextResponse.json(
        { ok: false, error: "DB error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/unsubscribe] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
