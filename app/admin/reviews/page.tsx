
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";
import { Star } from "lucide-react";

// You might reuse ADMIN_EMAIL check if you want extra security logic here
// relying on Row Level Security (RLS) is also fine if implemented correctly.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

type ReviewRow = {
    id: string;
    user_id: string | null;
    rating: number;
    comment: string | null;
    source: string;
    created_at: string;
};

export default function AdminReviewsPage() {
    const { t } = useT();
    const [reviews, setReviews] = useState<ReviewRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Move env read inside to ensure it's captured on render
    const REQUIRED_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    useEffect(() => {
        async function load() {
            try {
                // 1. Auth Check - mimicking app/admin/page.tsx exactly
                const { data: { user: u } } = await supabase.auth.getUser();
                setUser(u);

                const currentEmail = u?.email?.toLowerCase().trim();
                const allowedEmail = REQUIRED_ADMIN_EMAIL?.toLowerCase().trim();

                // Allow access if emails match matches
                const authorized = !!currentEmail && !!allowedEmail && currentEmail === allowedEmail;
                setIsAuthorized(authorized);

                if (!authorized) {
                    setLoading(false);
                    return; // Stop here if not admin, no need to fetch data
                }

                // 2. Fetch Data via Admin API (Bypasses RLS)
                // We must pass the user's token so the API can verify they are admin
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) throw new Error("No auth token");

                const res = await fetch("/api/admin/reviews/list", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                const json = await res.json();

                if (!res.ok) {
                    console.error("API Error", json);
                }

                if (json.reviews) {
                    setReviews(json.reviews);
                }

            } catch (err) {
                console.error("Critical admin load error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [REQUIRED_ADMIN_EMAIL]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center flex-col gap-4">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm opacity-50">Checking permissions...</p>
            </main>
        );
    }

    if (!isAuthorized) {
        const currentEmail = user?.email || "No detected user";
        const envSet = !!REQUIRED_ADMIN_EMAIL;

        return (
            <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
                <AppHeader active="admin" />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center max-w-lg w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 rounded-3xl shadow-xl">
                        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>

                        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                        <p className="text-[var(--text-muted)] mb-6">You do not have permission to view the reviews manager.</p>

                        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl text-left text-xs font-mono space-y-2 mb-6 border border-[var(--border-subtle)]">
                            <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
                                <span className="font-bold">Diagnostic Info</span>
                                <span className="opacity-50">v1.2</span>
                            </div>

                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="opacity-70">Status:</span>
                                <span className="text-red-500 font-bold">UNAUTHORIZED</span>

                                <span className="opacity-70">Logged In:</span>
                                <span>{user ? "✅ Yes" : "❌ No"}</span>

                                <span className="opacity-70">Env Var Set:</span>
                                <span>{envSet ? "✅ Yes" : "❌ MISSING"}</span>

                                <span className="opacity-70">Current User:</span>
                                <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded truncate block">{currentEmail}</span>

                                <span className="opacity-70">Required:</span>
                                <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded truncate block">
                                    {envSet ? REQUIRED_ADMIN_EMAIL : "(Set NEXT_PUBLIC_ADMIN_EMAIL)"}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Link
                                href="/dashboard"
                                className="px-5 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm font-medium transition-colors"
                            >
                                Back to Dashboard
                            </Link>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                Reload Verification
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
            <AppHeader active="admin" />
            <div className="flex-1">
                <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold">User Reviews ({reviews.length})</h1>
                        <Link
                            href="/admin"
                            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-sm"
                        >
                            Back to Admin
                        </Link>
                    </div>

                    <div className="grid gap-4">
                        {reviews.map((r) => (
                            <div key={r.id} className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                className={`w-4 h-4 ${star <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                                            />
                                        ))}
                                        <span className="ml-2 text-sm font-semibold">{r.rating}/5</span>
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {r.comment && (
                                    <p className="text-sm text-[var(--text-main)] mb-3 bg-[var(--bg-elevated)] p-3 rounded-xl">
                                        "{r.comment}"
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                    <span>Source: <span className="font-mono">{r.source}</span></span>
                                    <span>User: <span className="font-mono">{r.user_id ? r.user_id.slice(0, 8) + "..." : "Anonymous"}</span></span>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!confirm("Delete this review?")) return;

                                        const { data: { session } } = await supabase.auth.getSession();
                                        const token = session?.access_token;
                                        if (!token) return;

                                        await fetch(`/api/reviews?id=${r.id}`, {
                                            method: "DELETE",
                                            headers: { "Authorization": `Bearer ${token}` }
                                        });

                                        // Refresh local state
                                        setReviews(prev => prev.filter(item => item.id !== r.id));
                                    }}
                                    className="mt-3 text-xs text-red-500 hover:text-red-600 hover:underline"
                                >
                                    Delete Review
                                </button>
                            </div>
                        ))}

                        {reviews.length === 0 && (
                            <p className="text-[var(--text-muted)] italic">No reviews yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
