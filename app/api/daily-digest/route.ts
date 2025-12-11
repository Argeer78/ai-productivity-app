// app/api/daily-digest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderDailyDigestEmail } from "@/lib/emailTemplates";
import { verifyCronAuth } from "@/lib/verifyCron";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Small helper to normalize locale like "el-GR" -> "el"
function normalizeLocale(locale?: string | null): "en" | "el" {
  if (!locale) return "en";
  const lower = locale.toLowerCase();
  if (lower.startsWith("el")) return "el";
  return "en";
}

// 🔹 Shared helper – used by cron AND manual triggers
export async function runDailyDigest() {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, ai_tone, focus_area, daily_digest_enabled, language")
    .eq("daily_digest_enabled", true)
    .not("email", "is", null);

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
    const locale = (profile as any).language || "en";
    const lang = normalizeLocale(locale);
    const tone = profile.ai_tone || "friendly";
    const focus = profile.focus_area || (lang === "el"
      ? "τα πιο σημαντικά πράγματα σου"
      : "your most important work");

    const { data: tasksDueToday, error: tasksTodayError } =
      await supabaseAdmin
        .from("tasks")
        .select("id, title, description, due_date, completed")
        .eq("user_id", userId)
        .eq("completed", false)
        .gte("due_date", startOfTodayIso)
        .lt("due_date", startOfTomorrowIso);

    if (tasksTodayError) {
      console.error(
        "[daily-digest] tasksDueToday error for",
        email,
        tasksTodayError
      );
    }

    const { data: overdueTasks, error: overdueError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, due_date, completed")
      .eq("user_id", userId)
      .eq("completed", false)
      .lt("due_date", startOfTodayIso);

    if (overdueError) {
      console.error(
        "[daily-digest] overdueTasks error for",
        email,
        overdueError
      );
    }

    const safeTasksDueToday = tasksDueToday || [];
    const safeOverdueTasks = overdueTasks || [];

    const maxPerSection = 10;
    const tasksDueTodayShort = safeTasksDueToday.slice(0, maxPerSection);
    const overdueTasksShort = safeOverdueTasks.slice(0, maxPerSection);

    const lines: string[] = [];

    if (lang === "el") {
      // 🇬🇷 Greek version
      lines.push("Γεια σου 👋", "");
      lines.push(
        `Να η καθημερινή σου αναφορά από το AI Productivity Hub για ${todayDate}:`,
        ""
      );
      lines.push(`• Ύφος: ${tone}`);
      lines.push(`• Περιοχή εστίασης: ${focus}`);
      lines.push("");

      if (tasksDueTodayShort.length > 0) {
        lines.push("Σημερινές εκκρεμείς εργασίες (μη ολοκληρωμένες):");
        for (const t of tasksDueTodayShort) {
          const title = (t.title as string | null) || "(χωρίς τίτλο)";
          const dueDateStr =
            (t.due_date as string | null)?.slice(0, 10) || todayDate;
          lines.push(`• ${title} (λήξη ${dueDateStr})`);
        }
        lines.push("");
      }

      if (overdueTasksShort.length > 0) {
        lines.push("Καθυστερημένες εργασίες (ακόμα ανοικτές):");
        for (const t of overdueTasksShort) {
          const title = (t.title as string | null) || "(χωρίς τίτλο)";
          const dueDateStr =
            (t.due_date as string | null)?.slice(0, 10) || "άγνωστη ημερομηνία";
          lines.push(`• ${title} (ήταν για ${dueDateStr})`);
        }
        lines.push("");
      }

      if (
        tasksDueTodayShort.length === 0 &&
        overdueTasksShort.length === 0
      ) {
        lines.push(
          "Δεν υπάρχουν εργασίες με προθεσμία σήμερα ή καθυστερημένες. Ωραία στιγμή για να σχεδιάσεις τις επόμενες προτεραιότητές σου στη σελίδα Εργασίες. ✅",
          ""
        );
      }

      lines.push("Αύριο μπορείς να δοκιμάσεις:");
      lines.push("• Να ορίσεις τις 3 σημαντικότερες προτεραιότητές σου πριν ξεκινήσεις.");
      lines.push("• Ένα μπλοκ βαθιάς συγκέντρωσης (60–90 λεπτά) χωρίς ειδοποιήσεις.");
      lines.push("• Να γράψεις μια σύντομη σημείωση για το τι ολοκλήρωσες.");
      lines.push("");
      lines.push(
        "Μπορείς να αλλάξεις τις ρυθμίσεις της καθημερινής αναφοράς οποιαδήποτε στιγμή μέσα στην εφαρμογή."
      );
    } else {
      // 🇬🇧/🇺🇸 English version
      lines.push("Hi there 👋", "");
      lines.push(
        `Here’s your daily AI Productivity Hub digest for ${todayDate}:`,
        ""
      );
      lines.push(`• Tone: ${tone}`);
      lines.push(`• Focus area: ${focus}`);
      lines.push("");

      if (tasksDueTodayShort.length > 0) {
        lines.push("Today's tasks (not completed):");
        for (const t of tasksDueTodayShort) {
          const title = (t.title as string | null) || "(untitled task)";
          const dueDateStr =
            (t.due_date as string | null)?.slice(0, 10) || todayDate;
          lines.push(`• ${title} (due ${dueDateStr})`);
        }
        lines.push("");
      }

      if (overdueTasksShort.length > 0) {
        lines.push("Overdue tasks (still open):");
        for (const t of overdueTasksShort) {
          const title = (t.title as string | null) || "(untitled task)";
          const dueDateStr =
            (t.due_date as string | null)?.slice(0, 10) || "unknown date";
          lines.push(`• ${title} (was due ${dueDateStr})`);
        }
        lines.push("");
      }

      if (
        tasksDueTodayShort.length === 0 &&
        overdueTasksShort.length === 0
      ) {
        lines.push(
          "No tasks due today or overdue. Great moment to plan your next priorities in the Tasks page. ✅",
          ""
        );
      }

      lines.push("Tomorrow, you might try:");
      lines.push("• Planning your top 3 priorities before you start.");
      lines.push("• One deep-work block (60–90 minutes) with no notifications.");
      lines.push("• Writing one quick note about what you finished.");
      lines.push("");
      lines.push(
        "You can change your daily digest settings anytime in the app."
      );
    }

    const fullBody = lines.join("\n");

    // 👇 Pass locale to email template so title/preview/footer localize too
    const { text, html } = renderDailyDigestEmail(fullBody, locale);

    const subject =
      lang === "el"
        ? "Η καθημερινή σου αναφορά AI παραγωγικότητας"
        : "Your Daily AI Productivity Digest";

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        text,
        html,
        headers: {
          "List-Unsubscribe": "<https://aiprod.app/settings>",
        },
      });

      console.log("[daily-digest] sent to", email);
      sent++;
    } catch (sendErr: any) {
      console.error(
        "[daily-digest] Resend error for",
        email,
        sendErr?.message || sendErr
      );
    }

    // Optional throttle if you want:
    // await delay(300);
  }

  return {
    ok: true,
    message: `Daily digest processed for ${profiles.length} profiles, attempted ${attempted}, sent ${sent}.`,
    processed: profiles.length,
    attempted,
    sent,
  };
}

// 🔹 HTTP route – can be used for manual triggers with Authorization header
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

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
