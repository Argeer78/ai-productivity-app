
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bumpAiUsage } from "@/lib/aiUsageServer";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

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

        const { prompt } = await req.json();
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
    } catch (err: any) {
        console.error("[ai-images]", err);
        return NextResponse.json(
            { ok: false, error: err?.message || "Generation failed" },
            { status: 500 }
        );
    }
}
