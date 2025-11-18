"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type OnboardingFields = {
  onboarding_use_case: string | null;
  onboarding_weekly_focus: string | null;
  onboarding_reminder: "none" | "daily" | "weekly" | null;
};

export default function OnboardingPreferences() {
  const [values, setValues] = useState<OnboardingFields>({
    onboarding_use_case: "",
    onboarding_weekly_focus: "",
    onboarding_reminder: "none",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          if (!cancelled) setError("Could not load your session.");
          return;
        }

        const userId = authData.user.id;

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select(
            "onboarding_use_case, onboarding_weekly_focus, onboarding_reminder"
          )
          .eq("id", userId)
          .maybeSingle();

        if (profErr) {
          console.error("[OnboardingPreferences] load profile error", profErr);
          if (!cancelled) setError("Failed to load your onboarding preferences.");
          return;
        }

        if (!cancelled && profile) {
          setValues({
            onboarding_use_case: profile.onboarding_use_case ?? "",
            onboarding_weekly_focus: profile.onboarding_weekly_focus ?? "",
            onboarding_reminder: profile.onboarding_reminder ?? "none",
          });
        }
      } catch (err) {
        console.error("[OnboardingPreferences] unknown load error", err);
        if (!cancelled) setError("Failed to load your onboarding preferences.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSavedMessage("");

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        setError("You need to be logged in to save changes.");
        return;
      }

      const userId = authData.user.id;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          onboarding_use_case: values.onboarding_use_case || null,
          onboarding_weekly_focus: values.onboarding_weekly_focus || null,
          onboarding_reminder: values.onboarding_reminder || "none",
        })
        .eq("id", userId);

      if (updateErr) {
        console.error("[OnboardingPreferences] save error", updateErr);
        setError("Failed to save your preferences.");
        return;
      }

      setSavedMessage("Saved!");
      setTimeout(() => setSavedMessage(""), 2000);
    } catch (err) {
      console.error("[OnboardingPreferences] unknown save error", err);
      setError("Failed to save your preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
        Loading onboarding preferences…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs md:text-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-200">
            Onboarding & focus
          </p>
          <p className="text-[11px] text-slate-400">
            Help the app tailor AI prompts, reminders and weekly reports.
          </p>
        </div>
        {savedMessage && (
          <span className="text-[11px] text-emerald-400">{savedMessage}</span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <label className="block text-[11px] text-slate-300">
          Main way you plan to use this app
          <textarea
            value={values.onboarding_use_case ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, onboarding_use_case: e.target.value }))
            }
            placeholder="Example: I’m a solo founder using this for planning my week, journaling progress and drafting emails."
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 resize-vertical"
            rows={2}
          />
        </label>

        <label className="block text-[11px] text-slate-300">
          One important thing you want to make progress on each week
          <textarea
            value={values.onboarding_weekly_focus ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                onboarding_weekly_focus: e.target.value,
              }))
            }
            placeholder="Example: Shipping one small improvement to my product every week."
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 resize-vertical"
            rows={2}
          />
        </label>

        <label className="block text-[11px] text-slate-300">
          Light reminder cadence
          <select
            value={values.onboarding_reminder ?? "none"}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                onboarding_reminder: e.target.value as
                  | "none"
                  | "daily"
                  | "weekly",
              }))
            }
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100"
          >
            <option value="none">No reminders</option>
            <option value="daily">Daily nudge email</option>
            <option value="weekly">Weekly check-in</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
