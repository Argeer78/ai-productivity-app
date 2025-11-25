import { NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  const supabase = createRouteHandlerSupabaseClient({ req });
  const { taskId } = await req.json();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      is_completed: true,
      completed_at: new Date(),
    })
    .eq("id", taskId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
