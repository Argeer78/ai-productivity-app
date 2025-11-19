// app/api/ui-translations/[lang]/route.ts
import { NextResponse, type NextRequest } from "next/server";

// Simple demo translations – replace with Supabase later if you like
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.notes": "Notes",
    "nav.tasks": "Tasks",
    "nav.planner": "Planner",
    "nav.aiChat": "AI Hub Chat",
    "nav.templates": "Templates",
    "nav.dailySuccess": "Daily Success",
    "nav.weeklyReports": "Weekly Reports",
    "nav.travel": "Travel Planner",
    "nav.myTrips": "My Trips",
    "nav.feedback": "Feedback",
    "nav.changelog": "What’s new",
    "nav.settings": "Settings",
    "nav.admin": "Admin",
  },
  el: {
    "nav.dashboard": "Πίνακας ελέγχου",
    "nav.notes": "Σημειώσεις",
    "nav.tasks": "Εργασίες",
    "nav.planner": "Πλάνο",
    "nav.aiChat": "AI Hub Chat",
    "nav.templates": "Πρότυπα",
    "nav.dailySuccess": "Daily Success",
    "nav.weeklyReports": "Εβδομαδιαίες αναφορές",
    "nav.travel": "Travel Planner",
    "nav.myTrips": "Τα ταξίδια μου",
    "nav.feedback": "Ανατροφοδότηση",
    "nav.changelog": "Τι νέο υπάρχει",
    "nav.settings": "Ρυθμίσεις",
    "nav.admin": "Διαχειριστής",
  },
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ lang: string }> }
) {
  try {
    // NOTE: with your Next version, params is a Promise
    const { lang } = await context.params;

    const code = (lang || "en").toLowerCase();

    const translations =
      TRANSLATIONS[code] ||
      TRANSLATIONS[code.split("-")[0]] ||
      TRANSLATIONS.en ||
      {};

    return NextResponse.json(
      {
        ok: true,
        languageCode: code,
        translations,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-translations] GET error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load UI translations",
      },
      { status: 500 }
    );
  }
}
