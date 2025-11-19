// app/api/ui-i18n/route.ts
import { NextResponse } from "next/server";

// In-memory demo translations.
// Later you can load from Supabase instead.
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = (searchParams.get("lang") || "en").toLowerCase();

    const translations =
      TRANSLATIONS[lang] ||
      TRANSLATIONS[lang.split("-")[0]] ||
      TRANSLATIONS.en ||
      {};

    return NextResponse.json(
      {
        ok: true,
        translations,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ui-i18n] GET error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load UI translations",
      },
      { status: 500 }
    );
  }
}
