"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";
import Link from "next/link";

type Tone = "balanced" | "friendly" | "direct" | "motivational" | "casual";
const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "balanced", label: "Balanced (default)" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "motivational", label: "Motivational" },
  { value: "casual", label: "Casual" },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [tone, setTone] = useState<Tone>("balanced");
  const [focusArea, setFocusArea] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error(error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Load profile settings
  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      setLoadingProfile(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("ai_tone, focus_area")
          .eq("id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data?.ai_tone) {
          setTone(data.ai_tone as Tone);
        }
        if (data?.focus_area) {
          setFocusArea(data.focus_area);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load your settings.");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ai_tone: tone,
          focus_area: focusArea.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setError("Failed to save settings.");
        return;
      }

      setSuccess("Settings saved. Your AI will now use this style.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-300 text-sm">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppHeader active="settings" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">Settings</h1>
          <p className="text-slate-300 mb-4 text-center max-w-sm text-sm">
            Log in or create a free account to customize your AI experience.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
          >
            Go to login / signup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Settings</h1>
          <p className="text-xs md:text-sm text-slate-400 mb-6">
            Customize how the AI talks to you and what to focus on.
          </p>

          {loadingProfile ? (
            <p className="text-slate-300 text-sm">Loading your settings...</p>
          ) : (
            <form
              onSubmit={handleSave}
              className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
            >
              {error && (
                <p className="text-xs text-red-400 mb-2">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-400 mb-2">
                  {success}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  AI tone
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  This affects the assistant, templates, and planner tone.
                </p>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Main focus area (optional)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Example: &quot;Work projects&quot;, &quot;University
                  study&quot;, &quot;Personal growth&quot;, or leave blank.
                </p>
                <input
                  type="text"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. Work projects, university, personal life..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
{/* Manage subscription (Stripe Portal) */}
<button
  type="button"
  onClick={async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url; // go to Stripe portal
      } else {
        alert(data?.error || "Could not open billing portal.");
      }
    } catch (e) {
      console.error(e);
      alert("Could not open billing portal.");
    }
  }}
  className="mt-3 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
>
  Manage subscription (Stripe)
</button>

<div className="pt-2 border-t border-slate-800 mt-4">
  <p className="text-[11px] text-slate-400 mb-2">
    You can download a copy of your notes and tasks as a Markdown file.
  </p>
  <button
    type="button"
    onClick={async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ai_productivity_export.md";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert("Export failed. Please try again.");
      }
    }}
    className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
  >
    Download my data (.md)
  </button>
</div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
