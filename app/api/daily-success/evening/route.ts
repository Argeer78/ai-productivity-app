// app/api/daily-success/evening/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 20;

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30_000 })
    : null;

const requestSchema = z.object({
    reflection: z.string().trim().min(1).max(8_000),
    lang: z.string().max(16).optional(),
}).strict();

const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 2000;

function getTodayAthensYmd() {
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
        const body = parsedBody.data;
        const userId = auth.user.id;
        const reflection = body.reflection;
        const lang = body.lang || "en";

        const rateLimit = await enforceProviderRateLimit({ request: req, action: "ai:evening", rateClass: "ai-light", verifiedUserId: userId });
        if (!rateLimit.ok) return rateLimit.response;

        if (!reflection) {
            return NextResponse.json(
            { ok: false, error: "Missing reflection." },
                { status: 400 }
            );
        }

        const today = getTodayAthensYmd();

        // 🔐 Load plan
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("plan")
            .eq("id", userId)
            .maybeSingle();

        const plan = (profile?.plan as "free" | "pro" | "founder") || "free";
        const isPro = plan === "pro" || plan === "founder";
        const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

        // 🔢 Check usage
        const { data: usage } = await supabaseAdmin
            .from("ai_usage")
            .select("id, count")
            .eq("user_id", userId)
            .eq("usage_date", today)
            .maybeSingle();

        const usedToday = usage?.count || 0;

        if (!isPro && usedToday >= dailyLimit) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "You’ve reached today’s AI limit.",
                    plan,
                    dailyLimit,
                },
                { status: 429 }
            );
        }

        // 🧠 AI prompt
        const prompt = `
You are a supportive productivity coach.

The user is reflecting on their day.

Please return a clear, readable reflection with this structure:

WINS:
- 2–3 concrete things they did well

IMPROVEMENTS:
- 1–2 gentle areas to improve (no shaming)

ADJUSTMENTS FOR TOMORROW:
- 3 specific, practical changes they can try

Keep the tone supportive and encouraging.
Do NOT use markdown, emojis, or long paragraphs.
Keep it concise and human.

IMPORTANT: Respond in the user's language ("${lang}").

User reflection:
${reflection}
`.trim();

        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            max_tokens: 500,
        });

        const text =
            completion.choices?.[0]?.message?.content?.trim() ||
            "No reflection generated.";

        // 🔢 Increment usage
        try {
            if (!usage) {
                await supabaseAdmin.from("ai_usage").insert([
                    {
                        user_id: userId,
                        usage_date: today,
                        count: 1,
                    },
                ]);
            } else {
                await supabaseAdmin
                    .from("ai_usage")
                    .update({ count: usedToday + 1 })
                    .eq("id", usage.id);
            }
        } catch (err) {
            console.error("[daily-success-evening] usage update failed", err);
        }

        return NextResponse.json(
            {
                ok: true,
                reflection: text,
                plan,
                dailyLimit,
                usedToday: usedToday + 1,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("[daily-success-evening] fatal", err);
        return NextResponse.json(
            { ok: false, error: "Failed to generate evening reflection." },
            { status: 500 }
        );
    }
}
