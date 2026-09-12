// app/api/daily-success/morning/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30_000 })
    : null;

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

function todayAthensYmd() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Athens",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const yyyy = parts.find((p) => p.type === "year")?.value || "0000";
    const mm = parts.find((p) => p.type === "month")?.value || "01";
    const dd = parts.find((p) => p.type === "day")?.value || "01";
    return `${yyyy}-${mm}-${dd}`;
}

function normalizeLang(code?: string | null) {
    return (code || "en").split("-")[0].toLowerCase();
}

function getLanguageName(code: string) {
    switch (code) {
        case "el":
            return "Greek";
        case "fr":
            return "French";
        case "de":
            return "German";
        case "es":
            return "Spanish";
        case "it":
            return "Italian";
        case "pt":
            return "Portuguese";
        case "tr":
            return "Turkish";
        case "ru":
            return "Russian";
        case "ro":
            return "Romanian";
        case "ar":
            return "Arabic";
        case "he":
            return "Hebrew";
        case "zh":
            return "Chinese (Simplified)";
        case "ja":
            return "Japanese";
        case "id":
            return "Indonesian";
        case "sr":
            return "Serbian";
        case "bg":
            return "Bulgarian";
        case "hu":
            return "Hungarian";
        case "pl":
            return "Polish";
        case "cs":
            return "Czech";
        case "da":
            return "Danish";
        case "sv":
            return "Swedish";
        case "nb":
            return "Norwegian (Bokmål)";
        case "nl":
            return "Dutch";
        case "hi":
            return "Hindi";
        case "ko":
            return "Korean";
        default:
            return "English";
    }
}

function buildToneDescription(aiTone?: string | null) {
    switch (aiTone) {
        case "friendly":
            return "Use a warm, friendly, and encouraging tone.";
        case "direct":
            return "Be concise, straightforward, and to the point. Avoid fluff.";
        case "motivational":
            return "Be energetic and motivational, but still practical.";
        case "casual":
            return "Use a relaxed, casual tone, like chatting with a friend.";
        case "balanced":
        default:
            return "Use a balanced, clear, and professional but approachable tone.";
    }
}

async function getPlanAndUsage(userId: string) {
    const today = todayAthensYmd();

    const { data: profile, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("plan, ui_language, ai_tone, focus_area")
        .eq("id", userId)
        .maybeSingle();

    if (profErr) {
        console.error("[daily-success/morning] profile load error", profErr);
        throw new Error("Failed to load profile.");
    }

    const planRaw = (profile?.plan as "free" | "pro" | "founder" | null) || "free";
    const isPro = planRaw === "pro" || planRaw === "founder";
    const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const { data: usage, error: usageErr } = await supabaseAdmin
        .from("ai_usage")
        .select("id, count")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .maybeSingle();

    if (usageErr && (usageErr as any).code !== "PGRST116") {
        console.error("[daily-success/morning] usage select error", usageErr);
        throw new Error("Could not check AI usage.");
    }

    const usedToday = usage?.count ?? 0;

    return {
        today,
        profile,
        plan: planRaw,
        isPro,
        dailyLimit,
        usageRow: usage ?? null,
        usedToday,
    };
}

async function incrementUsage(userId: string, today: string, usageRow: { id: string; count: number } | null) {
    if (!usageRow) {
        const { error } = await supabaseAdmin
            .from("ai_usage")
            .insert([{ user_id: userId, usage_date: today, count: 1 }]);
        if (error) {
            console.error("[daily-success/morning] usage insert error", error);
        }
        return 1;
    }

    const next = (usageRow.count ?? 0) + 1;
    const { error } = await supabaseAdmin.from("ai_usage").update({ count: next }).eq("id", usageRow.id);
    if (error) {
        console.error("[daily-success/morning] usage update error", error);
    }
    return next;
}

type Body = {
    userId?: string;

    // ✅ NEW payload from your page
    dayDescription?: string;

    // ✅ legacy payload (older caller)
    morningInput?: string;

    priorities?: string[];
    lang?: string;
};

const requestSchema = z.object({
    dayDescription: z.string().max(8_000).optional(),
    morningInput: z.string().max(8_000).optional(),
    priorities: z.array(z.string().max(500)).max(10).optional(),
    lang: z.string().max(16).optional(),
}).strict();

export async function POST(req: Request) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth.user) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized" },
                { status: auth.error === "server_misconfigured" ? 500 : 401 }
            );
        }

        if (!openai) {
            return NextResponse.json(
                { ok: false, error: "AI is not configured on this environment" },
                { status: 503 }
            );
        }

        const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.aiTextJson);
        if (!parsedBody.ok) return parsedBody.response;
        const body: Body = parsedBody.data;

        const userId = auth.user.id;
        const rateLimit = await enforceProviderRateLimit({ request: req, action: "ai:morning", rateClass: "ai-light", verifiedUserId: userId });
        if (!rateLimit.ok) return rateLimit.response;

        // ✅ accept both dayDescription and morningInput
        const dayDescription = String(body?.dayDescription ?? body?.morningInput ?? "").trim();
        const priorities = (body?.priorities || [])
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .slice(0, 10);

        if (!dayDescription && priorities.length === 0) {
            return NextResponse.json({ ok: false, error: "Missing input." }, { status: 400 });
        }

        // ✅ Check usage (NO increment yet)
        const usageInfo = await getPlanAndUsage(userId);

        if (!usageInfo.isPro && usageInfo.usedToday >= usageInfo.dailyLimit) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Daily AI limit reached.",
                    plan: usageInfo.plan,
                    dailyLimit: usageInfo.dailyLimit,
                    usedToday: usageInfo.usedToday,
                },
                { status: 429 }
            );
        }

        const uiLang = normalizeLang(body?.lang || usageInfo.profile?.ui_language);
        const langName = getLanguageName(uiLang);
        const tone = buildToneDescription(usageInfo.profile?.ai_tone);
        const focusArea = usageInfo.profile?.focus_area ? String(usageInfo.profile.focus_area) : null;

        const systemPrompt = `
You are an AI daily planner inside AI Productivity Hub.
Respond ONLY in ${langName}. Never use any other language.
${tone}
${focusArea ? `The user's main focus area is "${focusArea}".` : ""}

Output format (use clean headings + bullets, no markdown fences):
- A short motivating line
- TOP 3 PRIORITIES:
- SCHEDULE: (morning / afternoon / evening blocks)
- FOCUS TIPS: (2–3 bullets)
`.trim();

        const userPrompt = `
Date (Athens): ${usageInfo.today}

User notes:
${dayDescription || "(none)"}

Top priorities:
${priorities.length ? priorities.map((p, i) => `${i + 1}. ${p}`).join("\n") : "(none)"}

Make a realistic plan for today.
`.trim();

        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.6,
            max_tokens: 450,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const plan = completion.choices?.[0]?.message?.content?.trim() || "";
        if (!plan) {
            return NextResponse.json({ ok: false, error: "Empty AI response" }, { status: 500 });
        }

        // ✅ Increment usage AFTER successful AI response
        const usedTodayAfter = await incrementUsage(userId, usageInfo.today, usageInfo.usageRow as any);

        // ✅ Save plan to DB (for history & Early Bird badge)
        try {
            const { error: saveErr } = await supabaseAdmin.from("daily_plans").insert({
                user_id: userId,
                plan_text: plan,
            });
            if (saveErr) {
                console.error("[daily-success/morning] failed to save to daily_plans:", saveErr);
            }
        } catch (err) {
            console.error("[daily-success/morning] save exception:", err);
        }

        return NextResponse.json(
            {
                ok: true,
                plan, // ✅ page can use data.plan
                usedToday: usedTodayAfter,
                dailyLimit: usageInfo.dailyLimit,
                planAccount: usageInfo.plan,
                usageDate: usageInfo.today,
            },
            { status: 200 }
        );
    } catch {
        console.error("[daily-success/morning] request failed");
        return NextResponse.json(
            { ok: false, error: "Failed to generate plan." },
            { status: 500 }
        );
    }
}
