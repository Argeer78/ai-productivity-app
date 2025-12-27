"use client";

import {
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useLanguage } from "@/app/components/LanguageProvider";
import { supabase } from "@/lib/supabaseClient";

import SoundToggle from "@/app/components/SoundToggle";

const LS_ONBOARDING_DONE = "aihub_onboarding_done_v1";
const LS_ONBOARDING_USE_CASE = "aihub_onboarding_use_case";
const LS_ONBOARDING_WEEKLY_FOCUS = "aihub_onboarding_weekly_focus";
const LS_ONBOARDING_REMINDER = "aihub_onboarding_reminder";
const LS_PREF_LANG = "aihub_pref_lang";

type Step = 1 | 2 | 3;

const USE_CASE_OPTIONS = [
  "Personal productivity & habits",
  "Work / freelance planning",
  "Studying & learning",
  "Side projects & content",
  "Travel & life admin",
];

const REMINDER_OPTIONS: {
  id: "none" | "daily" | "weekly";
  label: string;
  hint: string;
}[] = [
    {
      id: "daily",
      label: "Daily nudge",
      hint: "Best if you want a gentle check-in every day.",
    },
    {
      id: "weekly",
      label: "Weekly review",
      hint: "Great if you just want a weekly recap and reset.",
    },
    {
      id: "none",
      label: "No reminders (for now)",
      hint: "You can always turn these on later in Settings.",
    },
  ];

export default function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [useCase, setUseCase] = useState<string | null>(null);
  const [weeklyFocus, setWeeklyFocus] = useState("");
  const [reminder, setReminder] = useState<"none" | "daily" | "weekly">(
    "none"
  );

  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const [hasMounted, setHasMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { lang, setLang } = useLanguage();

  // Decide whether to show onboarding + load user / profile
  useEffect(() => {
    setHasMounted(true);
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function init() {
      try {
        // 1) Get logged-in user (if any)
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        if (!cancelled) {
          setUserId(user?.id ?? null);
        }

        // 2) Try to load profile onboarding fields if user exists
        let dbCompleted = false;
        if (user?.id) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select(
              "onboarding_use_case, onboarding_weekly_focus, onboarding_reminder, onboarding_completed"
            )
            .eq("id", user.id)
            .maybeSingle();

          if (!cancelled) {
            if (!error && profile) {
              if (profile.onboarding_completed) dbCompleted = true; // ✅ Respect DB status

              if (profile.onboarding_use_case) {
                setUseCase(profile.onboarding_use_case);
              }
              if (profile.onboarding_weekly_focus) {
                setWeeklyFocus(profile.onboarding_weekly_focus);
              }
              if (
                profile.onboarding_reminder === "none" ||
                profile.onboarding_reminder === "daily" ||
                profile.onboarding_reminder === "weekly"
              ) {
                setReminder(profile.onboarding_reminder);
              }
            }
            setProfileLoaded(true);
          }
        } else {
          if (!cancelled) setProfileLoaded(true);
        }

        // 3) LocalStorage gating (only show once per browser)
        const localDone = window.localStorage.getItem(LS_ONBOARDING_DONE);
        const done = localDone || dbCompleted; // ✅ Unified check

        // Also preload local saved answers if any (for anonymous visitors)
        const savedUseCase =
          window.localStorage.getItem(LS_ONBOARDING_USE_CASE) || "";
        const savedFocus =
          window.localStorage.getItem(LS_ONBOARDING_WEEKLY_FOCUS) || "";
        const savedReminder =
          (window.localStorage.getItem(LS_ONBOARDING_REMINDER) as
            | "none"
            | "daily"
            | "weekly"
            | null) || null;
        const savedLang = window.localStorage.getItem(LS_PREF_LANG);

        if (!useCase && savedUseCase) setUseCase(savedUseCase);
        if (!weeklyFocus && savedFocus) setWeeklyFocus(savedFocus);
        if (savedReminder && reminder === "none") setReminder(savedReminder);
        if (savedLang) {
          setLang(savedLang as any);
        }

        if (!done && !cancelled) {
          setOpen(true);
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          setPosition({
            top: vh * 0.15,
            left: vw / 2,
          });
        }
      } catch (err) {
        console.error("[Onboarding] init error", err);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag logic
  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      if (!dragStart) return;

      setPosition((prev) => ({
        top: prev.top + (e.clientY - dragStart.y),
        left: prev.left + (e.clientX - dragStart.x),
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    }

    function handleMouseUp() {
      setDragging(false);
      setDragStart(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dragStart]);

  function startDrag(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  async function markDoneAndClose() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_ONBOARDING_DONE, "1");
      if (useCase) {
        window.localStorage.setItem(LS_ONBOARDING_USE_CASE, useCase);
      }
      if (weeklyFocus.trim()) {
        window.localStorage.setItem(
          LS_ONBOARDING_WEEKLY_FOCUS,
          weeklyFocus.trim()
        );
      }
      window.localStorage.setItem(LS_ONBOARDING_REMINDER, reminder);
      window.localStorage.setItem(LS_PREF_LANG, lang);
    }

    // Write to Supabase profile if user is logged in
    if (userId) {
      try {
        const payload: {
          onboarding_use_case?: string | null;
          onboarding_weekly_focus?: string | null;
          onboarding_reminder?: "none" | "daily" | "weekly";
        } = {};

        if (useCase) payload.onboarding_use_case = useCase;
        if (weeklyFocus.trim())
          payload.onboarding_weekly_focus = weeklyFocus.trim();
        payload.onboarding_reminder = reminder;

        if (Object.keys(payload).length > 0) {
          const { error } = await supabase
            .from("profiles")
            .update(payload)
            .eq("id", userId);

          if (error) {
            console.error("[Onboarding] profile update error", error);
          }
        }
      } catch (err) {
        console.error("[Onboarding] profile update exception", err);
      }
    }

    setOpen(false);
  }

  function handleSkip() {
    void markDoneAndClose();
  }

  function handleNext() {
    if (step === 3) {
      void markDoneAndClose();
    } else {
      setStep((s) => (s + 1) as Step);
    }
  }

  function handleBack() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  if (!hasMounted || !profileLoaded) return null;
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60"
      data-translate-modal="1"
    >
      <div
        className="fixed w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
        style={{
          top: position.top,
          left: position.left,
          transform: "translateX(-50%)",
        }}
      >
        {/* Header (draggable) */}
        <div
          className="cursor-move flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/80 rounded-t-2xl"
          onMouseDown={startDrag}
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-xs font-semibold text-slate-100">
                Welcome to AI Productivity Hub
              </p>
              <p className="text-[10px] text-slate-400">
                3 quick questions to personalize your workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-800"
          >
            Skip
          </button>
          <div className="ml-2 pl-2 border-l border-slate-800">
            <SoundToggle className="scale-75 origin-right" />
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-4 text-xs">
          {/* Step indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Step {step} of 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 w-6 rounded-full ${s <= step ? "bg-indigo-500" : "bg-slate-700"
                    }`}
                />
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-100">
                What do you mainly want to use this for?
              </p>
              <p className="text-[11px] text-slate-400 mb-1">
                This helps us prioritize the right parts of the app for you.
              </p>
              <div className="space-y-1.5">
                {USE_CASE_OPTIONS.map((opt) => {
                  const selected = useCase === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setUseCase(opt)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] ${selected
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-100"
                        : "border-slate-800 bg-slate-950/80 text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-100">
                What&apos;s your main focus this week?
              </p>
              <p className="text-[11px] text-slate-400 mb-1">
                A sentence is enough. We&apos;ll surface this in your planner
                and reports later.
              </p>
              <textarea
                value={weeklyFocus}
                onChange={(e) => setWeeklyFocus(e.target.value)}
                placeholder="Example: Ship landing page, finish course module 3, and walk 5k steps a day."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-2 min-h-[80px] text-[11px] text-slate-200 resize-vertical"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-100 mb-1">
                  Do you want email reminders from your AI Hub?
                </p>
                <p className="text-[11px] text-slate-400 mb-2">
                  We&apos;ll use this preference when we roll out digests and
                  weekly reports. You can change it anytime in Settings.
                </p>
                <div className="space-y-1.5">
                  {REMINDER_OPTIONS.map((opt) => {
                    const selected = reminder === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReminder(opt.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] ${selected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-100"
                          : "border-slate-800 bg-slate-950/80 text-slate-200 hover:bg-slate-900"
                          }`}
                      >
                        <span className="block font-medium">{opt.label}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-1">
                  Current app language:{" "}
                  <span className="text-slate-100 font-medium uppercase">
                    {lang}
                  </span>
                </p>
                <p className="text-[10px] text-slate-500">
                  You can change language anytime from the header using the
                  translator or future language settings.
                </p>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1"
            >
              Skip for now
            </button>
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900 text-[11px] text-slate-200"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-[11px] font-medium text-slate-950"
              >
                {step === 3 ? "Finish" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
