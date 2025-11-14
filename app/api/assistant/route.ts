// app/api/assistant/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Assistant: OPENAI_API_KEY missing");
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = body?.messages;
    const userId = body?.userId as string | undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages." },
        { status: 400 }
      );
    }

    // Optional: record a usage tick (best effort, ignore errors)
    if (userId) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabaseAdmin
          .from("ai_usage")
          .select("id, count")
          .eq("user_id", userId)
          .eq("usage_date", today)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("Assistant: ai_usage select error", error);
        } else if (!data) {
          const { error: insErr } = await supabaseAdmin
            .from("ai_usage")
            .insert([{ user_id: userId, usage_date: today, count: 1 }]);
          if (insErr) console.error("Assistant: ai_usage insert error", insErr);
        } else {
          const newCount = (data.count || 0) + 1;
          const { error: updErr } = await supabaseAdmin
            .from("ai_usage")
            .update({ count: newCount })
            .eq("id", data.id);
          if (updErr) console.error("Assistant: ai_usage update error", updErr);
        }
      } catch (err) {
        console.error("Assistant: ai_usage wrapper error", err);
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.4,
    });

    const answer =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a response.";

    return NextResponse.json({ answer }, { status: 200 });
  } catch (err: any) {
    console.error("Assistant API error:", err?.message || err);
    return NextResponse.json(
      { error: "AI error on the server." },
      { status: 500 }
    );
  }
}
