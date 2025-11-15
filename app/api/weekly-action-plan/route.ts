import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openaiApiKey = process.env.OPENAI_API_KEY || "";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Last 7 days including today
function getWeekRangeDateStrings() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  return { startDate, endDate };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const userId = body?.userId as string | undefined;
    const explicitWeekStart = body?.weekStart as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId in request body." },
        { status: 400 }
      );
    }

    // 1) Check plan = pro
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[weekly-action-plan] profile error:", profileError);
      return NextResponse.json(
        { ok: false, error: "Failed to load profile." },
        { status: 500 }
      );
    }

    const plan = (profile?.plan as "free" | "pro" | null) || "free";
    if (plan !== "pro") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Weekly action plans are a Pro feature. Upgrade to Pro to use this.",
        },
        { status: 403 }
      );
    }

    // 2) Determine week range (last 7 days by default)
    const { startDate, endDate } = getWeekRangeDateStrings();
    const weekStart = explicitWeekStart || startDate;

    // 3) Fetch data for this week

    // Completed tasks this week
    const { data: completedTasks, error: completedError } =
      await supabaseAdmin
        .from("tasks")
        .select("id, title, description, created_at")
        .eq("user_id", userId)
        .eq("completed", true) // if your column is is_done, change this
        .gte("created_at", `${startDate}T00:00:00Z`)
        .order("created_at", { ascending: false });

    if (completedError) {
      console.error("[weekly-action-plan] completed tasks error:", completedError);
    }

    // Open (not completed) tasks – no date filter so AI sees full backlog
    const { data: openTasks, error: openTasksError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, created_at, completed")
      .eq("user_id", userId)
      .eq("completed", false)
      .order("created_at", { ascending: true })
      .limit(40);

    if (openTasksError) {
      console.error("[weekly-action-plan] open tasks error:", openTasksError);
    }

    // Notes last 7 days
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("notes")
      .select("id, title, content, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${startDate}T00:00:00Z`)
      .order("created_at", { ascending: false })
      .limit(40);

    if (notesError) {
      console.error("[weekly-action-plan] notes error:", notesError);
    }

    // AI usage this week
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("ai_usage")
      .select("usage_date, count")
      .eq("user_id", userId)
      .gte("usage_date", startDate)
      .lte("usage_date", endDate)
      .order("usage_date", { ascending: true });

    if (usageError) {
      console.error("[weekly-action-plan] ai_usage error:", usageError);
    }

    const aiUsageList =
      (usage || []) as { usage_date: string; count: number }[];

    const aiCalls = aiUsageList.reduce(
      (sum, row) => sum + (row.count || 0),
      0
    );
    const timeSavedMinutes = aiCalls * 3; // simple heuristic

    // Productivity scores this week
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from("daily_scores")
      .select("score_date, score")
      .eq("user_id", userId)
      .gte("score_date", startDate)
      .lte("score_date", endDate)
      .order("score_date", { ascending: true });

    if (scoresError) {
      console.error("[weekly-action-plan] daily_scores error:", scoresError);
    }

    const scoresList =
      (scores || []) as { score_date: string; score: number }[];

    let avgScore: number | null = null;
    if (scoresList.length > 0) {
      const total = scoresList.reduce(
        (sum, s) => sum + (s.score || 0),
        0
      );
      avgScore = Math.round(total / scoresList.length);
    }

    // Latest weekly goal (if any)
    const { data: goalRow, error: goalError } = await supabaseAdmin
      .from("weekly_goals")
      .select("id, goal_text, week_start, completed")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (goalError) {
      console.error("[weekly-action-plan] weekly_goals error:", goalError);
    }

    const notesList =
      (notes || []) as {
        id: string;
        title: string | null;
        content: string | null;
        created_at: string | null;
      }[];

    const completedList =
      (completedTasks || []) as {
        id: string;
        title: string | null;
        description: string | null;
        created_at: string | null;
      }[];

    const openTasksList =
      (openTasks || []) as {
        id: string;
        title: string | null;
        description: string | null;
        created_at: string | null;
        completed: boolean;
      }[];

    // 4) Build a compact summary for the model
    const payloadForModel = {
      weekRange: { startDate, endDate },
      weeklyGoal: goalRow
        ? {
            text: goalRow.goal_text,
            completed: goalRow.completed,
            week_start: goalRow.week_start,
          }
        : null,
      stats: {
        completedTasksCount: completedList.length,
        openTasksCount: openTasksList.length,
        notesCount: notesList.length,
        aiCalls,
        timeSavedMinutes,
        avgScore,
      },
      samples: {
        completedTasks: completedList.slice(0, 5).map((t) => ({
          title: t.title,
          description: t.description,
        })),
        openTasks: openTasksList.slice(0, 5).map((t) => ({
          title: t.title,
          description: t.description,
        })),
        notes: notesList.slice(0, 5).map((n) => ({
          title: n.title,
          content: n.content
            ? String(n.content).slice(0, 160)
            : "",
        })),
      },
    };

    let planText =
      "Your weekly action plan is ready, but the AI model is not configured. Please set OPENAI_API_KEY.";

    // 5) Call OpenAI (if configured) to generate the plan
    if (openai) {
      const systemPrompt = `
You are an encouraging productivity coach.
Given a summary of the user's last 7 days (tasks, notes, AI usage, productivity scores, and weekly goal),
create a short, practical Weekly Action Plan.

Structure it as plain text only (no markdown), with these sections:

1) "Top priorities this week:"
   - 3 bullet points for the most important outcomes.

2) "Supporting tasks:"
   - 3 bullet points of helpful but secondary tasks.

3) "Habits to focus on:"
   - 2 bullet points for habits or routines.

4) "Things to avoid or reduce:"
   - 2 bullet points on distractions or low-value work.

5) "One big thing:"
   - 1–2 sentences describing the single most important win for the week.

Be concise, direct, and positive. Make it feel realistic based on the data.
If there's very little data, propose generic but helpful suggestions.
`.trim();

      const userPrompt = JSON.stringify(payloadForModel);

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 600,
        });

        const content = completion.choices[0]?.message?.content;
        if (content && typeof content === "string") {
          planText = content.trim();
        } else {
          planText =
            "Your weekly action plan could not be generated. Please try again later.";
        }
      } catch (aiErr) {
        console.error("[weekly-action-plan] OpenAI error:", aiErr);
        planText =
          "AI was not able to generate a plan right now. Please try again later.";
      }
    }

    // 6) Upsert into weekly_action_plans (by user_id + week_start)
    // First check if one already exists for this week
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("weekly_action_plans")
      .select("id, week_start, plan_text, created_at")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error(
        "[weekly-action-plan] select existing error:",
        existingError
      );
    }

    let savedPlan = existing || null;

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("weekly_action_plans")
        .update({ plan_text: planText })
        .eq("id", existing.id)
        .select("id, week_start, plan_text, created_at")
        .maybeSingle();

      if (updateError) {
        console.error(
          "[weekly-action-plan] update error:",
          updateError
        );
      } else if (updated) {
        savedPlan = updated;
      }
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("weekly_action_plans")
        .insert([
          {
            user_id: userId,
            week_start: weekStart,
            plan_text: planText,
          },
        ])
        .select("id, week_start, plan_text, created_at")
        .maybeSingle();

      if (insertError) {
        console.error(
          "[weekly-action-plan] insert error:",
          insertError
        );
      } else if (inserted) {
        savedPlan = inserted;
      }
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      weekRange: { startDate, endDate },
      plan: {
        id: savedPlan?.id ?? null,
        week_start: savedPlan?.week_start ?? weekStart,
        plan_text: savedPlan?.plan_text ?? planText,
        created_at: savedPlan?.created_at ?? null,
      },
    });
  } catch (err) {
    console.error("[weekly-action-plan] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
