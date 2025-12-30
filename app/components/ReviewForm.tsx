
"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { useT } from "@/lib/useT";
import { supabase } from "@/lib/supabaseClient";

type Props = {
    source?: string;
    onSuccess?: () => void;
    title?: string;
    subtitle?: string;
};

export default function ReviewForm({
    source = "page",
    onSuccess,
    title,
    subtitle,
}: Props) {
    const { t } = useT();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    // 🔹 Auth Check
    const [checkingUser, setCheckingUser] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Simple client-side check. 
        import("@/lib/supabaseClient").then(({ supabase }) => {
            supabase.auth.getSession().then(({ data }) => {
                setIsLoggedIn(!!data.session);
                setCheckingUser(false);
            });
        });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (rating === 0) return;

        setStatus("submitting");
        try {
            // Get the current session token to pass to the server
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            };

            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const res = await fetch("/api/reviews", {
                method: "POST",
                headers,
                body: JSON.stringify({ rating, comment, source }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("[ReviewForm] Submit failed:", res.status, res.statusText, errorData);
                throw new Error(errorData.error || "Failed to submit");
            }

            setStatus("success");
            if (onSuccess) {
                setTimeout(onSuccess, 2000);
            }
        } catch (err: any) {
            console.error("[ReviewForm] Error caught:", err);
            // Optionally set error message state to display to user
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                    <Star className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t("reviews.success.title", "Thank You!")}</h3>
                <p className="text-[var(--text-muted)] mb-6">
                    {t("reviews.success.subtitle", "We really appreciate your feedback.")}
                </p>

                {source === "page" && (
                    <a href="/dashboard" className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-sm font-medium">
                        {t("reviews.success.return", "Return to Dashboard")}
                    </a>
                )}
            </div>
        );
    }

    // Show Auth Gate if not logged in (and not loading)
    if (!checkingUser && !isLoggedIn) {
        return (
            <div className="text-center py-8">
                <div className="mb-4">
                    <Star className="w-12 h-12 text-gray-300 mx-auto" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("reviews.guest.title", "Login to Review")}</h2>
                <p className="text-[var(--text-muted)] mb-6 text-sm">
                    {t("reviews.guest.subtitle", "You need to be logged in to rate the app.")}
                </p>
                <a
                    href="/auth"
                    className="inline-block px-6 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90"
                >
                    {t("reviews.guest.button", "Go to Login")}
                </a>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-2 mb-6">
                <h2 className="text-2xl font-bold">
                    {title || t("reviews.form.title", "How are we doing?")}
                </h2>
                <p className="text-[var(--text-muted)] text-sm">
                    {subtitle || t("reviews.form.subtitle", "Your feedback helps us cover the bills and improve the app.")}
                </p>
            </div>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                    >
                        <Star
                            className={`w-8 h-8 md:w-10 md:h-10 transition-colors duration-200 ${star <= (hoverRating || rating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-[var(--border-strong)]"
                                }`}
                        />
                    </button>
                ))}
            </div>

            {/* Comment Area */}
            <div className={`space-y-3 transition-all duration-300 ${rating > 0 ? 'opacity-100 max-h-96' : 'opacity-50 max-h-96 blur-[1px]'}`}>
                <label className="block text-sm font-medium text-[var(--text-main)]">
                    {rating < 5
                        ? t("reviews.form.feedbackLabel", "What could be better?")
                        : t("reviews.form.wishlistLabel", "What else would you like to see?")}
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={rating === 0 || status === "submitting"}
                    placeholder={t("reviews.form.placeholder", "I'd love to see feature X...")}
                    className="w-full min-h-[100px] p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all resize-none"
                />
            </div>

            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={rating === 0 || status === "submitting"}
                    className="px-6 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {status === "submitting"
                        ? t("reviews.form.sending", "Sending...")
                        : t("reviews.form.submit", "Submit Review")}
                </button>
            </div>

            {status === "error" && (
                <p className="text-red-500 text-sm text-center">
                    {t("reviews.form.error", "Something went wrong. Please try again.")}
                </p>
            )}
        </form>
    );
}
