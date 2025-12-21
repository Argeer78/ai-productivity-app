import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export async function GET(req: Request) {
  const key = req.headers.get("x-admin-key") || "";
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("feedback")
    .select("id,user_id,email,message,source,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
