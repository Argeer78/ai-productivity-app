"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";
import { Loader2, Check, Sparkles, ChevronRight, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

type Task = {
    title: string;
    category?: string;
    size?: string;
};

const STORAGE_KEY_WIZARD_COMPLETED = "aph_wizard_completed";
const STORAGE_KEY_WIZARD_DATA = "aph_wizard_data";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export default function GuidedWelcomeWizard({ isOpen, onClose }: Props) {
    const { t } = useT();
    const router = useRouter();

    const [step, setStep] = useState<"intent" | "generating" | "result" | "personalization" | "auth">("intent");

    // Data
    const [intent, setIntent] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tone, setTone] = useState<string>("balanced");

    // Auth State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        // Auto-open logic: If not logged in & not seen wizard
        const checkUser = async () => {
            const { data } = await supabase.auth.getSession();
            const hasSeen = localStorage.getItem(STORAGE_KEY_WIZARD_COMPLETED);

            if (!data.session && !hasSeen) {
                // Simple delay to not jar the user immediately
                setTimeout(() => setIsOpen(true), 1500);
            }
        };
        checkUser();
    }, []);

    const handleIntentSubmit = async () => {
        if (!intent.trim()) return;
        setStep("generating");

        try {
            // Call AI endpoint similar to Task Creator
            // We'll reuse the same endpoint but might need to adapt the body
            const res = await fetch("/api/ai-task-creator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: "guest", // Explicitly guest
                    todayPlan: intent, // Map intent to todayPlan
                    mainGoal: intent, // Map intent to mainGoal
                    // Defaults
                    gender: "skip",
                    ageRange: "25-34",
                    hoursAvailable: "2-4",
                    energyLevel: 7,
                    intensity: "balanced"
                }),
            });

            const data = await res.json();
            if (data?.ok && data?.tasks) {
                setTasks(data.tasks);
                setStep("result");
            } else {
                // Fallback if failed
                setTasks([
                    { title: "Define clear goals for " + intent, category: "planning", size: "small" },
                    { title: "Break down " + intent + " into steps", category: "planning", size: "medium" },
                    { title: "Schedule first block of work", category: "scheduling", size: "small" }
                ]);
                setStep("result");
            }
        } catch (e) {
            console.error(e);
            setStep("result"); // Fail forward
            setTasks([{ title: "Get started with " + intent, category: "general", size: "medium" }]);
        }
    };

    const handleToneSelect = (selectedTone: string) => {
        setTone(selectedTone);
        setStep("auth");
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError("");

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        ai_tone: tone, // We can maybe save this to metadata? Or sync later.
                        onboarding_use_case: intent,
                    }
                }
            });

            if (error) {
                // If user exists, try login? Or just show error
                if (error.message.includes("already registered")) {
                    setAuthError("Account exists. Please log in normally.");
                } else {
                    setAuthError(error.message);
                }
                return;
            }

            if (data.session) {
                // Success!
                // 1. Save tasks to DB or session for post-login handler
                // Since we are now logged in, we can try to insert directly?
                // BUT - RLS might depend on profile creation triggers etc. which happen async.
                // Safest: Save to sessionStorage and let Dashboard hydrate them.

                sessionStorage.setItem("aph_wizard_pending_tasks", JSON.stringify(tasks));
                sessionStorage.setItem("aph_wizard_tone", tone);

                localStorage.setItem(STORAGE_KEY_WIZARD_COMPLETED, "true");

                confetti();

                // Redirect to dashboard
                router.push("/dashboard?wizard_success=true");
                onClose();
            } else {
                // Confirmation email sent case
                setAuthError("Check your email to confirm signup!");
            }

        } catch (err: any) {
            setAuthError(err.message || "Something went wrong.");
        } finally {
            setAuthLoading(false);
        }
    };

    const closeWizard = () => {
        onClose();
        localStorage.setItem(STORAGE_KEY_WIZARD_COMPLETED, "true");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={closeWizard}
                    className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] z-10"
                >
                    ✕
                </button>

                {/* Progress Bar (Optional) */}
                <div className="h-1 w-full bg-[var(--bg-elevated)]">
                    <div
                        className="h-full bg-[var(--accent)] transition-all duration-500"
                        style={{ width: step === "intent" ? "25%" : step === "generating" ? "50%" : step === "result" ? "60%" : step === "personalization" ? "75%" : "100%" }}
                    />
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 flex flex-col">

                    {/* STEP 1: INTENT */}
                    {step === "intent" && (
                        <div className="flex flex-col h-full justify-center animate-in slide-in-from-right-4 fade-in duration-300">
                            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                                What do you want to work on right now?
                            </h2>

                            <div className="relative mb-8">
                                <textarea
                                    autoFocus
                                    value={intent}
                                    onChange={(e) => setIntent(e.target.value)}
                                    placeholder="e.g. Finish my side project, Plan my week, Reduce stress..."
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl p-4 text-lg focus:ring-2 focus:ring-[var(--accent)] outline-none resize-none min-h-[120px]"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleIntentSubmit();
                                        }
                                    }}
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] text-[var(--text-muted)]">
                                    Press Enter
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-6">
                                {["Finish project", "Plan week", "Reduce stress", "Organize tasks"].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setIntent(s)}
                                        className="text-xs px-3 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--accent-soft)] border border-[var(--border-subtle)] text-left truncate"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleIntentSubmit}
                                disabled={!intent.trim()}
                                className="w-full py-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                Continue <ArrowRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: GENERATING */}
                    {step === "generating" && (
                        <div className="flex flex-col h-full items-center justify-center animate-in fade-in duration-500 py-12">
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 border-4 border-[var(--border-subtle)] rounded-full opactiy-30"></div>
                                <div className="absolute inset-0 border-4 border-[var(--accent)] rounded-full border-t-transparent animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto text-[var(--accent)]" size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-center mb-2">Creating your plan...</h3>
                            <p className="text-[var(--text-muted)] text-sm text-center">Analysing "{intent}"</p>
                        </div>
                    )}

                    {/* STEP 3: RESULT */}
                    {step === "result" && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="flex items-center gap-2 mb-2 text-[var(--accent)]">
                                <Sparkles size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">First Draft</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold mb-1">
                                Here’s a plan for you
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mb-6">
                                Based on "{intent}"
                            </p>

                            <div className="flex-1 overflow-y-auto mb-6 pr-2">
                                <div className="space-y-3">
                                    {tasks.map((t, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                                            <div className="mt-1 w-5 h-5 rounded-full border-2 border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-main)]">{t.title}</p>
                                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-1">{t.category || "General"} • {t.size || "Normal"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("personalization")}
                                className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold hover:opacity-90 flex items-center justify-center gap-2"
                            >
                                Looks good, continue <ArrowRight size={18} />
                            </button>
                            <button
                                onClick={() => setStep("intent")}
                                className="w-full mt-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            >
                                Back / Edit
                            </button>
                        </div>
                    )}

                    {/* STEP 4: PERSONALIZATION */}
                    {step === "personalization" && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                            <h2 className="text-2xl font-bold mb-2">How should AI help?</h2>
                            <p className="text-sm text-[var(--text-muted)] mb-8">
                                Choosing this helps us personalize your experience.
                            </p>

                            <div className="grid gap-3 mb-8">
                                {[{ id: "balanced", label: "⚖️  Break things down (Balanced)" }, { id: "motivational", label: "🔥  Keep me motivated" }, { id: "direct", label: "🎯  Keep it simple & direct" }, { id: "friendly", label: "😊  Be encouraging" }].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleToneSelect(opt.id)}
                                        className={`p-4 rounded-xl border text-left transition-all ${tone === opt.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]"}`}
                                    >
                                        <span className="font-medium text-sm">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: AUTH */}
                    {step === "auth" && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                            <h2 className="text-2xl font-bold mb-2">Save this plan</h2>
                            <p className="text-sm text-[var(--text-muted)] mb-6">
                                Create a free account to save your {tasks.length} tasks and track progress.
                            </p>

                            {authError && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    {authError}
                                </div>
                            )}

                            <form onSubmit={handleAuthSubmit} className="space-y-4 mb-4">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                                        required
                                    />
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {authLoading ? <Loader2 className="animate-spin" /> : "Save & Continue"}
                                </button>
                            </form>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-subtle)]"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[var(--bg-card)] px-2 text-[var(--text-muted)]">Or</span></div>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } });
                                }}
                                className="w-full py-3 rounded-xl border border-[var(--border-subtle)] bg-white text-black font-semibold hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24-2.24-2.84z" fill="#FBBC05" />
                                    <path d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.16-3.16C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>

                            <p className="mt-6 text-center text-[10px] text-[var(--text-muted)]">
                                Free plan • No credit card required
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
