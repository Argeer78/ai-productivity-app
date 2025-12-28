
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

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("app_reviews")
                .select("*")
                .order("created_at", { ascending: false });

            if (data) setReviews(data);
            if (error) console.error("Error loading reviews", error);

            setLoading(false);
        }
        load();
    }, []);

    if (loading) return null;

    const isAdmin = user?.email === ADMIN_EMAIL;

    if (!isAdmin) {
        return (
            <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
                <AppHeader active="admin" />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <h1 className="text-xl font-bold mb-2">Restricted Access</h1>
                        <p className="text-[var(--text-muted)] mb-4">You must be an admin to view this page.</p>
                        <Link href="/dashboard" className="text-[var(--accent)] hover:underline">Go to Dashboard</Link>
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
