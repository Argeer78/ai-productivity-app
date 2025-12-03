// app/changelog/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

type ChangelogEntry = {
  id: string;
  title: string;
  body: string | null;
  section: string | null;
  published_at: string | null;
};

const SECTION_ICON: Record<string, string> = {
  Latest: "📅",
  Recent: "📊",
  Earlier: "🧠",
  Ongoing: "🧪",
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mark changelog as seen for the logged-in user
  useEffect(() => {
    let cancelled = false;

    async function markSeen() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[changelog] auth error", error);
          return;
        }
        const user = data?.user;
        if (!user || cancelled) return;

        await supabase
          .from("profiles")
          .update({
            latest_seen_changelog_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (err) {
        console.error("[changelog] mark seen error", err);
      }
    }

    markSeen();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load changelog entries from Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("changelog_entries")
          .select("id, title, body, section, published_at")
          .order("published_at", { ascending: false });

        if (error) {
          console.error("[changelog] load error", error);
          if (!cancelled) setError("Failed to load changelog.");
          return;
        }

        if (!cancelled) {
          setEntries(data || []);
        }
      } catch (err) {
        console.error("[changelog] unexpected load error", err);
        if (!cancelled) setError("Failed to load changelog.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="changelog" />
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                What&apos;s new
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                Recent updates, fixes, and experiments in AI Productivity Hub.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              ← Back to dashboard
            </Link>
          </div>

          {error && (
            <p className="mb-3 text-xs text-red-400">{error}</p>
          )}

          {loading ? (
            <p className="text-xs text-[var(--text-muted)]">
              Loading changelog…
            </p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              No changelog entries yet. Add some in the
              <span className="font-semibold"> changelog_entries </span>
              table in Supabase.
            </p>
          ) : (
            <div className="space-y-6">
              {entries.map((entry) => {
                const section = entry.section || "Update";
                const icon = SECTION_ICON[section] || "✨";
                const dateLabel = entry.published_at
                  ? new Date(entry.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "";

                const bullets =
                  entry.body
                    ?.split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean) || [];

                return (
                  <section
                    key={entry.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
                  >
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">
                      {icon} {dateLabel} • {section}
                    </p>
                    <h2 className="text-sm font-semibold mb-2">
                      {entry.title}
                    </h2>
                    {bullets.length > 0 ? (
                      <ul className="list-disc list-inside text-[12px] text-[var(--text-main)] space-y-1">
                        {bullets.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-[var(--text-main)]">
                        {entry.body}
                      </p>
                    )}
                  </section>
                );
              })}

              <p className="text-[11px] text-[var(--text-muted)] mt-4">
                More improvements are in progress around focus, routines,
                and better AI guidance. If you have a feature request, you
                can always send it from the{" "}
                <Link
                  href="/feedback"
                  className="text-[var(--accent)] hover:underline underline-offset-2"
                >
                  Feedback
                </Link>{" "}
                page.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
