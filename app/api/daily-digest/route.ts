// app/api/daily-digest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderDailyDigestEmail } from "@/lib/emailTemplates";
import { verifyCronAuth } from "@/lib/verifyCron";
import { enforceInternalRateLimit } from "@/lib/rateLimit";
import OpenAI from "openai";

export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";
const CRON_BATCH_LIMIT = 500;
const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://aiprod.app"
).replace(/\/+$/, "");

// OpenAI optional (deploy-safe)
const openai =
  process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30_000 })
    : null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Normalize locale like "el-GR" -> "el", "pt-BR" -> "pt-br"
function normalizeLocale(locale?: string | null): string {
  if (!locale) return "en";
  const lower = locale.trim().toLowerCase();
  if (lower.startsWith("pt-br")) return "pt-br";
  return (lower.split("-")[0] || "en").trim();
}

function languageNameForPrompt(code: string): string {
  const map: Record<string, string> = {
    en: "English",
    el: "Greek",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    "pt-br": "Brazilian Portuguese",
    nl: "Dutch",
    tr: "Turkish",
    ru: "Russian",
    uk: "Ukrainian",
    pl: "Polish",
    ro: "Romanian",
    bg: "Bulgarian",
    sr: "Serbian",
    hr: "Croatian",
    hu: "Hungarian",
    cs: "Czech",
    sk: "Slovak",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    ar: "Arabic",
    he: "Hebrew",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
  };
  return map[code] || code;
}

async function aiTranslate(
  text: string,
  targetLangCode: string
): Promise<string> {
  if (!openai) return text;
  if (!text.trim()) return text;
  if (targetLangCode === "en") return text;

  const langName = languageNameForPrompt(targetLangCode);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `Translate the user's text to ${langName} (${targetLangCode}).\n` +
            `Rules:\n` +
            `- Return ONLY the translated text.\n` +
            `- Preserve bullet points, numbers, emojis, and line breaks.\n` +
            `- Do not add commentary.`,
        },
        { role: "user", content: text },
      ],
    });

    const out = completion.choices?.[0]?.message?.content?.trim();
    return out || text;
  } catch (err) {
    console.error("[daily-digest] aiTranslate error", err);
    return text;
  }
}

function defaultSubjectForLang(lang: string) {
  if (lang === "el") return "Η καθημερινή σου αναφορά AI παραγωγικότητας";
  return "Your Daily AI Productivity Digest";
}

// 🔹 Shared helper – used by cron AND manual triggers
export async function runDailyDigest() {
  if (!resend) {
    console.warn("[daily-digest] RESEND_API_KEY is not configured; digest delivery is disabled.");
    return { ok: true, message: "Email delivery is disabled.", processed: 0, attempted: 0, sent: 0 };
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    // ✅ your schema: ui_language + language
    .select("id, email, ai_tone, focus_area, daily_digest_enabled, ui_language, language")
    .eq("daily_digest_enabled", true)
    .not("email", "is", null)
    .limit(CRON_BATCH_LIMIT);

  if (error) {
    console.error("[daily-digest] profiles query error", error);
    return { ok: false, error: "DB error loading profiles" };
  }

  if (!profiles || profiles.length === 0) {
    console.log("[daily-digest] No subscribers found");
    return {
      ok: true,
      message: "No subscribers for daily digest.",
      processed: 0,
    };
  }

  let attempted = 0;
  let sent = 0;

  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];

  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfTodayIso = startOfToday.toISOString();

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
  const startOfTomorrowIso = startOfTomorrow.toISOString();

  for (const profile of profiles) {
    const email = profile.email as string | null;
    if (!email) continue;

    attempted++;

    const userId = profile.id as string;

    // ✅ prefer ui_language, fallback language
    const rawLocale =
      (profile as any).ui_language ||
      (profile as any).language ||
      "en";

    const lang = normalizeLocale(rawLocale);
    const tone = profile.ai_tone || "friendly";

    // Focus defaults in EN/EL; for other languages we will translate the full email anyway.
    const focus =
      profile.focus_area ||
      (lang === "el"
        ? "τα πιο σημαντικά πράγματα σου"
        : "your most important work");

    const { data: tasksDueToday, error: tasksTodayError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, due_date, completed")
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("due_date", startOfTodayIso)
      .lt("due_date", startOfTomorrowIso);

    if (tasksTodayError) {
      console.error("[daily-digest] tasksDueToday query failed", tasksTodayError);
    }

    const { data: overdueTasks, error: overdueError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, due_date, completed")
      .eq("user_id", userId)
      .eq("completed", false)
      .lt("due_date", startOfTodayIso);

    if (overdueError) {
      console.error("[daily-digest] overdueTasks query failed", overdueError);
    }

    const safeTasksDueToday = tasksDueToday || [];
    const safeOverdueTasks = overdueTasks || [];

    const maxPerSection = 10;
    const tasksDueTodayShort = safeTasksDueToday.slice(0, maxPerSection);
    const overdueTasksShort = safeOverdueTasks.slice(0, maxPerSection);

    // Build EN base + EL native. For other langs: translate EN base once.
    const linesEn: string[] = [];
    linesEn.push("Hi there 👋", "");
    linesEn.push(`Here’s your daily AI Productivity Hub digest for ${todayDate}:`, "");
    linesEn.push(`• Tone: ${tone}`);
    linesEn.push(`• Focus area: ${focus}`);
    linesEn.push("");

    if (tasksDueTodayShort.length > 0) {
      linesEn.push("Today's tasks (not completed):");
      for (const t of tasksDueTodayShort) {
        const title = (t.title as string | null) || "(untitled task)";
        const dueDateStr = (t.due_date as string | null)?.slice(0, 10) || todayDate;
        linesEn.push(`• ${title} (due ${dueDateStr})`);
      }
      linesEn.push("");
    }

    if (overdueTasksShort.length > 0) {
      linesEn.push("Overdue tasks (still open):");
      for (const t of overdueTasksShort) {
        const title = (t.title as string | null) || "(untitled task)";
        const dueDateStr = (t.due_date as string | null)?.slice(0, 10) || "unknown date";
        linesEn.push(`• ${title} (was due ${dueDateStr})`);
      }
      linesEn.push("");
    }

    if (tasksDueTodayShort.length === 0 && overdueTasksShort.length === 0) {
      linesEn.push(
        "No tasks due today or overdue. Great moment to plan your next priorities in the Tasks page. ✅",
        ""
      );
    }

    linesEn.push("Tomorrow, you might try:");
    linesEn.push("• Planning your top 3 priorities before you start.");
    linesEn.push("• One deep-work block (60–90 minutes) with no notifications.");
    linesEn.push("• Writing one quick note about what you finished.");
    linesEn.push("");
    linesEn.push("You can change your daily digest settings anytime in the app.");

    const linesEl: string[] = [];
    linesEl.push("Γεια σου 👋", "");
    linesEl.push(`Να η καθημερινή σου αναφορά από το AI Productivity Hub για ${todayDate}:`, "");
    linesEl.push(`• Ύφος: ${tone}`);
    linesEl.push(`• Περιοχή εστίασης: ${focus}`);
    linesEl.push("");

    if (tasksDueTodayShort.length > 0) {
      linesEl.push("Σημερινές εκκρεμείς εργασίες (μη ολοκληρωμένες):");
      for (const t of tasksDueTodayShort) {
        const title = (t.title as string | null) || "(χωρίς τίτλο)";
        const dueDateStr = (t.due_date as string | null)?.slice(0, 10) || todayDate;
        linesEl.push(`• ${title} (λήξη ${dueDateStr})`);
      }
      linesEl.push("");
    }

    if (overdueTasksShort.length > 0) {
      linesEl.push("Καθυστερημένες εργασίες (ακόμα ανοικτές):");
      for (const t of overdueTasksShort) {
        const title = (t.title as string | null) || "(χωρίς τίτλο)";
        const dueDateStr =
          (t.due_date as string | null)?.slice(0, 10) || "άγνωστη ημερομηνία";
        linesEl.push(`• ${title} (ήταν για ${dueDateStr})`);
      }
      linesEl.push("");
    }

    if (tasksDueTodayShort.length === 0 && overdueTasksShort.length === 0) {
      linesEl.push(
        "Δεν υπάρχουν εργασίες με προθεσμία σήμερα ή καθυστερημένες. Ωραία στιγμή για να σχεδιάσεις τις επόμενες προτεραιότητές σου στη σελίδα Εργασίες. ✅",
        ""
      );
    }

    linesEl.push("Αύριο μπορείς να δοκιμάσεις:");
    linesEl.push("• Να ορίσεις τις 3 σημαντικότερες προτεραιότητές σου πριν ξεκινήσεις.");
    linesEl.push("• Ένα μπλοκ βαθιάς συγκέντρωσης (60–90 λεπτά) χωρίς ειδοποιήσεις.");
    linesEl.push("• Να γράψεις μια σύντομη σημείωση για το τι ολοκλήρωσες.");
    linesEl.push("");
    linesEl.push(
      "Μπορείς να αλλάξεις τις ρυθμίσεις της καθημερινής αναφοράς οποιαδήποτε στιγμή μέσα στην εφαρμογή."
    );

    let fullBody = lang === "el" ? linesEl.join("\n") : linesEn.join("\n");

    // ✅ For any other language: translate the EN email ONCE
    if (lang !== "en" && lang !== "el") {
      fullBody = await aiTranslate(linesEn.join("\n"), lang);
    }

    // 👇 Template wrapper localized by rawLocale
    const { text, html } = renderDailyDigestEmail(fullBody, rawLocale);

    let subject = defaultSubjectForLang(lang);
    if (lang !== "en" && lang !== "el") {
      subject = await aiTranslate(defaultSubjectForLang("en"), lang);
    }

    try {
     if (!resend) {
       throw new Error("Email service not configured");
     }

  await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        text,
        html,
        headers: {
          "List-Unsubscribe": `<${APP_URL}/settings>`,
        },
      });

      console.log("[daily-digest] sent", { lang });
      sent++;
    } catch (sendErr: any) {
      console.error("[daily-digest] Resend error", sendErr?.message || sendErr);
    }

    // Optional throttle:
    // await delay(250);
  }

  return {
    ok: true,
    message: `Daily digest processed for ${profiles.length} profiles, attempted ${attempted}, sent ${sent}.`,
    processed: profiles.length,
    attempted,
    sent,
  };
}

// 🔹 HTTP route – manual/cron trigger
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;
  const rateLimit = await enforceInternalRateLimit("internal:daily-digest");
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const result = await runDailyDigest();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[daily-digest] handler error", err);
    return NextResponse.json(
      { ok: false, error: "Internal error in daily digest." },
      { status: 500 }
    );
  }
}
