// app/changelog/admin/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppHeader from "@/app/components/AppHeader";

type Profile = {
  id: string;
  is_admin: boolean | null;
};

// Allowed section labels
const SECTION_OPTIONS = ["Latest", "Recent", "Earlier"] as const;
type SectionOption = (typeof SECTION_OPTIONS)[number];

export default function ChangelogAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [section, setSection] = useState<SectionOption>("Latest");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load user + profile
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          if (!cancelled) setChecking(false);
          return;
        }
        const uid = authData.user.id;
        if (cancelled) return;

        setUserId(uid);

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id, is_admin")
          .eq("id", uid)
          .maybeSingle();

        if (profErr) {
          console.error("[changelog/admin] profile error", profErr);
        }
        if (!cancelled) {
          setProfile(prof as Profile | null);
        }
      } catch (err) {
        console.error("[changelog/admin] load error", err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Please add a title and at least one line of body text.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error: insertError } = await supabase.from("changelog_entries").insert([
        {
          title: title.trim(),
          section, // always "Latest" | "Recent" | "Earlier"
          body: body.trim(),
          // published_at: default now()
        },
      ]);

      if (insertError) {
        console.error("[changelog/admin] insert error", insertError);
        setError("Failed to create changelog entry.");
        return;
      }

      setTitle("");
      setBody("");
      setSection("Latest");
      setMessage("Changelog entry created!");
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      console.error("[changelog/admin] unexpected error", err);
      setError("Unexpected error while creating entry.");
    } finally {
      setSaving(false);
    }
  }

  // Gate: loading
  if (checking) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Checking access…</p>
      </main>
    );
  }

  // Gate: not logged in
  if (!userId) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <p className="mb-2 text-sm font-semibold">Changelog admin</p>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          You need to be logged in as an admin to manage the changelog.
        </p>
        <a
          href="/auth"
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs"
        >
          Log in
        </a>
      </main>
    );
  }

  // Gate: not admin
  if (!profile?.is_admin) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col items-center justify-center p-4">
        <p className="mb-2 text-sm font-semibold">Changelog admin</p>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          This page is only available to admins.
        </p>
        <a
          href="/"
          className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs"
        >
          Go back home
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="changelog" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Changelog admin
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Create new changelog entries. They’ll appear instantly on the public
                “What&apos;s new” page.
              </p>
            </div>
            <Link
              href="/changelog"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← View public changelog
            </Link>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-3"
          >
            {error && <p className="text-[11px] text-red-400 mb-1">{error}</p>}
            {message && (
              <p className="text-[11px] text-emerald-400 mb-1">{message}</p>
            )}

            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-muted)]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly AI reports, goals, and wins"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-muted)]">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as SectionOption)}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-xs"
              >
                {SECTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-muted)]">
                Body (one bullet per line)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Added Weekly AI email report for Pro users.\nNew Weekly Reports page.\nDashboard now shows AI Wins This Week.\nAdded Goal of the Week with AI refinement.`}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 text-xs min-h-[140px] whitespace-pre-wrap"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Each non-empty line will be shown as a bullet on the public changelog.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs font-semibold disabled:opacity-60"
              >
                {saving ? "Saving…" : "Publish entry"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
