import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json({ ok: false, error: "DB delete error" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unsubscribe exception:", err);
    return NextResponse.json({ ok: false, error: "Server error" });
  }
}
