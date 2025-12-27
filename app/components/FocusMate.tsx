"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/lib/useT";
import { supabase } from "@/lib/supabaseClient";

/**
 * FocusMate: A proactive, friendly floating agent.
 *
 * Logic:
 * 1. Checks Energy Level (from DB/LocalStorage).
 * 2. Checks Time of Day.
 * 3. Offers a "Nudge" if energy is low or it's late.
 */
export default function FocusMate() {
    const { t } = useT();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState("");
    const [mood, setMood] = useState<"neutral" | "concerned" | "excited">("neutral");

    // Don't show on wizard or auth pages
    const isHidden =
        pathname?.startsWith("/onboarding") ||
        pathname?.startsWith("/auth") ||
        pathname === "/";

    useEffect(() => {
        if (isHidden) return;

        // Check every minute for a "context check"
        const checkContext = async () => {
            // 0. Check snooze
            const snoozeUntil = localStorage.getItem("mate_snooze_until");
            if (snoozeUntil && parseInt(snoozeUntil, 10) > Date.now()) {
                return;
            }

            // 1. Get Energy
            const today = new Date().toISOString().split("T")[0];
            let energy = 0;

            // Try local first for speed
            const local = localStorage.getItem(`energy_${today}`);
            if (local) energy = parseInt(local, 10);

            // (Optional) Could fetch from DB if local missing, but let's keep it lightweight for now

            // 2. Determine State
            const hour = new Date().getHours();

            // Rule 1: Late night work
            if (hour >= 22 || hour < 4) {
                setMood("concerned");
                setMessage(t("mate.late", "It's late! 🌙 Remember to rest so you can win tomorrow."));
                setVisible(true);
                return;
            }

            // Rule 2: Low energy afternoon slump (1pm - 4pm)
            if (energy > 0 && energy <= 3 && hour >= 13 && hour <= 16) {
                setMood("concerned");
                setMessage(t("mate.slump", "Energy is low directly. ☕ How about a 10m power nap?"));
                setVisible(true);
                return;
            }

            // Rule 3: Morning start (6am - 9am)
            if (hour >= 6 && hour <= 9 && !localStorage.getItem(`mate_morning_${today}`)) {
                setMood("excited");
                setMessage(t("mate.morning", "Good morning! ☀️ What's the #1 goal today?"));
                setVisible(true);
                localStorage.setItem(`mate_morning_${today}`, "1"); // Only show once
                return;
            }
        };

        // Run once on mount after a delay
        const timer = setTimeout(checkContext, 3000);
        return () => clearTimeout(timer);
    }, [pathname, t, isHidden]);

    // Auto-hide after 10s
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => setVisible(false), 10000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    function handleDismiss() {
        setVisible(false);
        // Snooze for 1 hour
        localStorage.setItem("mate_snooze_until", (Date.now() + 60 * 60 * 1000).toString());
    }

    if (isHidden || !visible) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-6 left-6 z-50 flex items-end gap-3 pointer-events-none"
                >
                    {/* Avatar Bubble */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl flex items-center justify-center text-2xl border-2 border-white/20 relative animate-bounce-slow">
                        {mood === "concerned" ? "🍵" : mood === "excited" ? "🚀" : "🤖"}

                        {/* Ping animation */}
                        <span className="absolute top-0 right-0 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                        </span>
                    </div>

                    {/* Message Bubble */}
                    <div className="pointer-events-auto bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-4 py-3 rounded-2xl rounded-bl-none shadow-xl max-w-xs text-sm font-medium text-[var(--text-main)] backdrop-blur-md">
                        {message}
                        <button
                            onClick={handleDismiss}
                            className="ml-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] underline"
                        >
                            {t("mate.dismiss", "Dismiss (1h)")}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
