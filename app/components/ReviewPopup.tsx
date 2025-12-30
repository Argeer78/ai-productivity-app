
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ReviewForm from "@/app/components/ReviewForm";
import { useT } from "@/lib/useT";

// Trigger logic constants
const STORAGE_KEY = "has_reviewed_app";
const SESSION_COUNT_KEY = "app_session_count";
const MIN_SESSIONS_TO_SHOW = 3;

// Simple hook to track active usage and showing popup
export function useReviewPopupTrigger() {
    const [show, setShow] = useState(false);
    const [checkedServer, setCheckedServer] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        // 1. Check if already reviewed (Local Storage)
        const hasReviewedLocal = localStorage.getItem(STORAGE_KEY);
        if (hasReviewedLocal) return;

        // 2. Check server-side (for cross-device or lost local storage) - triggers once
        if (!checkedServer) {
            fetch("/api/reviews/check")
                .then(res => res.json())
                .then(data => {
                    if (data.hasReviewed) {
                        localStorage.setItem(STORAGE_KEY, "true");
                    } else {
                        // Only proceed with session counting if NOT reviewed on server either
                        checkSessionLogic();
                    }
                    setCheckedServer(true);
                })
                .catch(() => {
                    // On error, proceed with standard logic
                    checkSessionLogic();
                    setCheckedServer(true);
                });
        }

        function checkSessionLogic() {
            // Re-check local just in case async fetch set it
            if (localStorage.getItem(STORAGE_KEY)) return;

            // 3. Increment session/usage count
            const currentSessions = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || "0");
            const newCount = currentSessions + 1;
            localStorage.setItem(SESSION_COUNT_KEY, newCount.toString());

            // 4. Trigger condition: 
            // - User has visited dashboard > 3 times
            if ([3, 10, 25, 50].includes(newCount)) {
                // Delay slightly so it doesn't pop immediately on load
                const timer = setTimeout(() => {
                    setShow(true);
                }, 5000);
                return () => clearTimeout(timer);
            }
        }

    }, [checkedServer]);

    const markAsReviewed = () => {
        setShow(false);
        localStorage.setItem(STORAGE_KEY, "true");
    };

    const closeForNow = () => {
        setShow(false);
    };

    return { show, markAsReviewed, closeForNow };
}

export default function ReviewPopup() {
    const { show, markAsReviewed, closeForNow } = useReviewPopupTrigger();
    const { t } = useT();

    if (!show) return null;

    return (
        <div
            onClick={(e) => {
                // Confirm it's the backdrop, not a child
                if (e.target === e.currentTarget) closeForNow();
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
        >
            <div className="relative w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300 cursor-default">

                <button
                    onClick={closeForNow}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-surface)] text-[var(--text-muted)] transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <ReviewForm
                    source="popup"
                    onSuccess={markAsReviewed}
                    title={t("reviews.popup.title", "Enjoying the app?")}
                    subtitle={t("reviews.popup.subtitle", "Take a moment to rate us and tell us what features you want next.")}
                />
            </div>
        </div>
    );
}
