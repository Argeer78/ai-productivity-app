import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { parseJsonBody, REQUEST_LIMITS } from "@/lib/apiValidation";
import { bumpAiUsage } from "@/lib/aiUsageServer";
import { enforceProviderRateLimit } from "@/lib/rateLimit";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Use Node runtime for maximum compatibility
export const runtime = "nodejs";
export const maxDuration = 20; // seconds (hint for Vercel)

const apiKey = process.env.OPENAI_API_KEY;

// Initialise client (will throw if key is missing, so we guard above)
const client = apiKey ? new OpenAI({ apiKey, maxRetries: 0, timeout: 30_000 }) : null;

type HistoryItem = {
  role: "user" | "assistant";
  content: string;
};

const requestSchema = z.object({
  userId: z.string().max(128).optional(),
  userMessage: z.string().trim().min(1).max(8_000),
  category: z.string().max(100).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8_000) }).strict()).max(20).optional(),
  attachments: z.array(z.object({ name: z.string().max(255), content: z.string().max(50_000) }).strict()).max(5).optional(),
}).strict();

export async function POST(req: NextRequest) {
  try {
    if (!apiKey || !client) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPENAI_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables.",
        },
        { status: 503 }
      );
    }

    const parsedBody = await parseJsonBody(req, requestSchema, REQUEST_LIMITS.aiTextJson);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;

    const requestedUserId = body.userId ?? "";
    const userMessage = body.userMessage ?? "";
    const category = body.category ?? "General";
    const history: HistoryItem[] = Array.isArray(body.history) ? body.history : [];
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    // ✅ GUEST BYPASS
    const isGuest = requestedUserId === "guest" || requestedUserId.startsWith("demo-");
    const auth = isGuest ? null : await getAuthenticatedUser(req);

    if (!isGuest && !auth?.user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: auth?.error === "server_misconfigured" ? 500 : 401 }
      );
    }

    const userId = isGuest ? requestedUserId : auth?.user?.id;
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const rateLimit = await enforceProviderRateLimit({
      request: req,
      action: "ai:hub-chat",
      rateClass: "ai-light",
      verifiedUserId: auth?.user?.id,
    });
    if (!rateLimit.ok) return rateLimit.response;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ ok: false, error: "Missing userMessage in request body." }, { status: 400 });
    }

    // Handle Attachments (Pro check)
    let contextFromFiles = "";
    if (attachments.length > 0) {
      let isPro = false;
      if (!isGuest) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .single();
        isPro = profile?.plan === "pro" || profile?.plan === "founder";
      }

      if (!isPro) {
        return NextResponse.json({ ok: false, error: "Attachments are a Pro feature." }, { status: 403 });
      }
      contextFromFiles = attachments
        .map((f) => `\n---\nFILE: ${f.name}\nCONTENT:\n${f.content}\n---`)
        .join("\n");
    }

    // Build chat history for the model
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are an AI productivity coach inside an app called AI Productivity Hub. You help with planning, focus, mindset, tasks and tiny wins. Be concise, practical and friendly.\n\n" +
          (contextFromFiles ? `USER HAS ATTACHED FILES:\n${contextFromFiles}\nUse these to answer their questions.` : "")
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user",
        content: `Category: ${category}\n\n${userMessage}`,
      },
    ];

    // Call OpenAI – gpt-4o-mini is cheap & fast
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn’t generate a reply. Please try again.";

    const title = userMessage.split("\n")[0].slice(0, 80).trim();

    // ✅ Count 1 AI call (only after success)
    if (!isGuest) {
      await bumpAiUsage(userId, 1);
    }

    return NextResponse.json({
      ok: true,
      assistantMessage,
      title,
    });
  } catch {
    console.error("[api/ai-hub-chat] request failed");

    return NextResponse.json(
      {
        ok: false,
        error: "The AI assistant had a problem responding. Please try again.",
      },
      { status: 500 }
    );
  }
}
