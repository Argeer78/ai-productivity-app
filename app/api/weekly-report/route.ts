// app/api/weekly-report/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { renderWeeklyReportEmail } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AI Productivity Hub <hello@aiprod.app>";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRateLimit(
  args: Parameters<typeof resend.emails.send>[0]
) { /* <- keep your existing implementation here */ }

// your existing getWeekRangeDateStrings() here

export async function runWeeklyReport() {
  const { startDate, endDate } = getWeekRangeDateStrings();

  // 🔽 everything that’s currently inside your GET (after auth check)
  // - query profiles
  // - loop over users
  // - build stats
  // - call OpenAI
  // - insert into weekly_reports
  // - send emails
  // return something like { ok: true, processed: users.length }

  // At the very end:
  return { ok: true, processed: users?.length || 0 };
}

export async function GET(req: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[weekly-report] CRON_SECRET is not set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: CRON_SECRET missing" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.warn("[weekly-report] Unauthorized request");
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWeeklyReport();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[weekly-report] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
