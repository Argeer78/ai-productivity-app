// app/changelog/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Alive3DImage from "@/app/components/Alive3DImage";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

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
  // ✅ Notes-style: always build full keys changelogPage.*
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) =>
    rawT(`changelogPage.${key}`, fallback);

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
          <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {t("title", "What's new")}
                </h1>
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs md:hidden"
                >
                  {t("back", "← Back")}
                </Link>
              </div>

              <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-lg mb-4">
                {t(
                  "subtitle",
                  "Recent updates, fixes, and experiments in AI Productivity Hub."
                )}
              </p>

              <div className="hidden md:block">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]"
                >
                  {t("back", "← Back to dashboard")}
                </Link>
              </div>
            </div>

            {/* 3D Image */}
            <div className="relative w-full max-w-[180px] md:max-w-[220px] mx-auto md:mx-0">
              <Alive3DImage
                src="/images/changelog-3d.png"
                alt="Changelog 3D"
                className="w-full h-auto drop-shadow-xl"
              />
              {/* Decor */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-teal-500/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>

          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

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
                    <h2 className="text-sm font-semibold mb-2">{entry.title}</h2>
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
                {t(
                  "moreImprovements",
                  "More improvements are in progress around focus, routines, and better AI guidance. If you have a feature request, you can always send it from the Feedback page."
                )}{" "}
                <Link
                  href="/feedback"
                  className="text-[var(--accent)] hover:underline underline-offset-2"
                >
                  Feedback
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
