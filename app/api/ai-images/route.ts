
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bumpAiUsage } from "@/lib/aiUsageServer";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 60_000 })
    : null;

const requestSchema = z.object({ prompt: z.string().trim().min(1).max(1000) }).strict();

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

        const parsed = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.smallJson);
        if (!parsed.ok) return parsed.response;
        const { prompt } = parsed.data;
        const userId = auth.user.id;

        if (!prompt) {
            return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
        }

        // 1. Check Plan (Security Gate)
        const { data: profile, error: profErr } = await supabaseAdmin
            .from("profiles")
            .select("plan")
            .eq("id", userId)
            .single();

        if (profErr || !profile) {
            return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 403 });
        }

        const isPro = profile.plan === "pro" || profile.plan === "founder";
        if (!isPro) {
            return NextResponse.json(
                { ok: false, error: "Upgrade required. This feature is for Pro users." },
                { status: 403 }
            );
        }

        const rateLimit = await enforceProviderRateLimit({
            request: req,
            action: "ai:image",
            rateClass: "ai-heavy",
            verifiedUserId: userId,
        });
        if (!rateLimit.ok) return rateLimit.response;

        // 2. Generate Image
        const completion = await openai.images.generate({
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1024",
            response_format: "url",
            quality: "standard",
        });

        const imageUrl = completion?.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error("No image returned from OpenAI");
        }

        // 3. Billing / Tracking (optional, bump usage)
        await bumpAiUsage(userId, 5); // Image gen is more expensive, count as 5 tokens? Or just track separately.

        return NextResponse.json({
            ok: true,
            imageUrl,
        });
    } catch {
        console.error("[ai-images] request failed");
        return NextResponse.json(
            { ok: false, error: "Generation failed" },
            { status: 500 }
        );
    }
}
