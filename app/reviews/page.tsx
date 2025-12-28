"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";
import ReviewForm from "@/app/components/ReviewForm";
import { useT } from "@/lib/useT";
import { Star } from "lucide-react";

type Review = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user_id: string | null;
};

export default function ReviewPage() {
    const { t } = useT();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await fetch("/api/reviews");
            const data = await res.json();
            if (data?.reviews) {
                setReviews(data.reviews);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    return (
        <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
            <AppHeader />

            <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 grid md:grid-cols-2 gap-8 md:gap-12 items-start">

                {/* Left: Submit Form */}
                <div className="order-2 md:order-1 sticky top-24">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-6 md:p-8 shadow-xl">
                        <ReviewForm
                            source="review_page"
                            onSuccess={fetchReviews} /* Refresh list after submit */
                            title={t("reviews.page.title", "Rate Your Experience")}
                            subtitle={t("reviews.page.subtitle", "Your honest feedback helps us build a better tool for you.")}
                        />
                    </div>
                </div>

                {/* Right: Reviews List */}
                <div className="order-1 md:order-2 space-y-6">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-2">{t("reviews.community.title", "Community Reviews")}</h1>
                        <p className="text-[var(--text-muted)]">
                            {t("reviews.community.subtitle", "See what others are saying about the app.")}
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 opacity-50">Loading reviews...</div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((r) => (
                                <div key={r.id} className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${star <= r.rating ? "fill-amber-400 text-amber-400" : "text-[var(--border-strong)]"}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {r.comment && (
                                        <p className="text-sm leading-relaxed mb-2">"{r.comment}"</p>
                                    )}
                                    <div className="text-xs text-[var(--text-muted)] font-mono opacity-70">
                                        — {r.user_id ? "Verified User" : "Guest"}
                                    </div>
                                </div>
                            ))}
                            {reviews.length === 0 && (
                                <div className="p-8 text-center text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] border-dashed">
                                    No reviews yet. Be the first!
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}
