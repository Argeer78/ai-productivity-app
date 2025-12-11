// app/ai-task-creator/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

type SuggestedTask = {
  title: string;
  category?: string;
  size?: string; // "small" | "medium" | "big"
};

type PlanType = "free" | "pro" | "founder";

export default function AITaskCreatorPage() {
  const router = useRouter();
  const { t: translate } = useT("aiTaskCreator");

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [plan, setPlan] = useState<PlanType>("free");

  // Form fields
  const [gender, setGender] = useState<"male" | "female" | "other" | "skip">(
    "skip"
  );
  const [ageRange, setAgeRange] = useState<
    "under18" | "18-24" | "25-34" | "35-44" | "45plus"
  >("25-34");
  const [jobRole, setJobRole] = useState("");
  const [workType, setWorkType] = useState<
    "work" | "study" | "day-off" | "mixed"
  >("work");
  const [hobbies, setHobbies] = useState("");
  const [todayPlan, setTodayPlan] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [hoursAvailable, setHoursAvailable] = useState<
    "<1" | "1-2" | "2-4" | "4plus"
  >("2-4");
  const [energyLevel, setEnergyLevel] = useState(6); // 1–10
  const [intensity, setIntensity] = useState<
    "light" | "balanced" | "aggressive"
  >("balanced");

  // AI suggestions
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // 1) Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error(error);
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // 2) Load plan (optional, just for copy)
  useEffect(() => {
    if (!user) {
      setPlan("free");
      return;
    }

    async function loadPlan() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (error && (error as any).code !== "PGRST116") {
          console.error("[ai-task-creator] plan load error", error);
          return;
        }

        if (data?.plan === "pro" || data?.plan === "founder") {
          setPlan(data.plan as PlanType);
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadPlan();
  }, [user]);

  const isPro = plan === "pro" || plan === "founder";

  // 3) Ask API for AI task suggestions
  async function handleGenerateSuggestions(e: FormEvent) {
    e.preventDefault();
    setSuggestError("");
    setStatusMessage("");

    if (!user) {
      setSuggestError(
        translate("errors.loginRequired", "Log in to generate AI tasks.")
      );
      return;
    }

    if (!todayPlan.trim() && !mainGoal.trim()) {
      setSuggestError(
        translate(
          "errors.missingGoalOrPlan",
          "Tell the AI at least your main plan or goal for today."
        )
      );
      return;
    }

    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/ai-task-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          ageRange,
          jobRole,
          workType,
          hobbies,
          todayPlan,
          mainGoal,
          hoursAvailable,
          energyLevel,
          intensity,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("[ai-task-creator] suggestion error", data);
        setSuggestError(
          data?.error ||
            translate(
              "errors.generateFailed",
              "Could not generate tasks. Please try again."
            )
        );
        return;
      }

      const tasks = (data.tasks || []) as SuggestedTask[];
      setSuggestedTasks(tasks);
      if (tasks.length === 0) {
        setSuggestError(
          translate(
            "errors.noTasksReturned",
            "AI did not return any tasks. Try adding more detail."
          )
        );
      }
    } catch (err) {
      console.error("[ai-task-creator] suggest exception", err);
      setSuggestError(
        translate(
          "errors.networkGenerate",
          "Network error while generating tasks."
        )
      );
    } finally {
      setLoadingSuggestions(false);
    }
  }

  // 4) Create tasks in Supabase and go to /tasks
  async function handleCreateTasks() {
    if (!user) {
      setSuggestError(
        translate("errors.loginToCreate", "Log in to create tasks.")
      );
      return;
    }

    if (!suggestedTasks.length) {
      setSuggestError(
        translate(
          "errors.noTasksYet",
          "Generate tasks first, or add at least one task."
        )
      );
      return;
    }

    const cleaned = suggestedTasks
      .map((t) => ({ ...t, title: t.title.trim() }))
      .filter((t) => t.title.length > 0);

    if (!cleaned.length) {
      setSuggestError(
        translate("errors.emptyAfterClean", "Your task list is empty.")
      );
      return;
    }

    setCreatingTasks(true);
    setSuggestError("");
    setStatusMessage("");

    try {
      const rows = cleaned.map((t) => ({
        user_id: user.id,
        title: t.title,
        completed: false,
      }));

      const { error } = await supabase.from("tasks").insert(rows);
      if (error) {
        console.error("[ai-task-creator] insert error", error);
        setSuggestError(
          translate(
            "errors.insertFailed",
            "Failed to create tasks in your account."
          )
        );
        return;
      }

      setStatusMessage(
        translate(
          "status.created",
          "Tasks created! Redirecting to your Tasks…"
        )
      );
      router.push("/tasks");
    } catch (err) {
      console.error("[ai-task-creator] create exception", err);
      setSuggestError(
        translate(
          "errors.networkCreate",
          "Network error while creating tasks."
        )
      );
    } finally {
      setCreatingTasks(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          {translate("checkingSession", "Checking your session…")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="tasks" />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-3">
            {translate("title", "AI Task Creator")}
          </h1>
          <p className="text-[var(--text-muted)] mb-4 text-center max-w-sm text-sm">
            {translate(
              "loginPrompt",
              "Log in or create a free account to let AI generate a personalized task list for your day."
            )}
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm"
          >
            {translate("loginCta", "Go to login / signup")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="tasks" />
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {translate("title", "AI Task Creator")}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                {translate(
                  "subtitle",
                  "Answer a few quick questions and let AI build a realistic task list for today. Then one click to add them to your Tasks."
                )}
              </p>
            </div>
            <Link
              href="/tasks"
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs"
            >
              {translate("backToTasks", "← Back to Tasks")}
            </Link>
          </div>

          {!isPro && (
            <div className="mb-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3 text-[11px] text-[var(--accent)]">
              <p className="font-semibold mb-1">
                {translate(
                  "freeBanner.title",
                  "Works on Free – shines on Pro."
                )}
              </p>
              <p>
                {translate(
                  "freeBanner.body",
                  "AI task creation uses your daily AI limit. "
                )}
                <span className="font-semibold">
                  {translate(
                    "freeBanner.highlight",
                    "Pro gives you much higher limits and more automation"
                  )}
                </span>{" "}
                {translate(
                  "freeBanner.tail",
                  "for planning and weekly reports."
                )}
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard#pricing")}
                className="mt-2 inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-[11px]"
              >
                {translate("freeBanner.cta", "View Pro options")}
              </button>
            </div>
          )}

          {suggestError && (
            <p className="text-xs text-red-400 mb-2">{suggestError}</p>
          )}
          {statusMessage && (
            <p className="text-xs text-emerald-400 mb-2">
              {statusMessage}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT: Questionnaire */}
            <section className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2">
                {translate("form.heading", "Tell the AI about your day")}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {translate(
                  "form.subheading",
                  "The more realistic you are, the better the task suggestions."
                )}
              </p>

              <form
                onSubmit={handleGenerateSuggestions}
                className="space-y-3 text-[12px]"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      {translate("form.gender.label", "Gender (optional)")}
                    </label>
                    <select
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value as typeof gender)
                      }
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1.5"
                    >
                      <option value="skip">
                        {translate(
                          "form.gender.skip",
                          "Prefer not to say"
                        )}
                      </option>
                      <option value="male">
                        {translate("form.gender.male", "Male")}
                      </option>
                      <option value="female">
                        {translate("form.gender.female", "Female")}
                      </option>
                      <option value="other">
                        {translate("form.gender.other", "Other")}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      {translate("form.age.label", "Age range")}
                    </label>
                    <select
                      value={ageRange}
                      onChange={(e) =>
                        setAgeRange(e.target.value as typeof ageRange)
                      }
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1.5"
                    >
                      <option value="under18">
                        {translate("form.age.under18", "< 18")}
                      </option>
                      <option value="18-24">
                        {translate("form.age.18_24", "18–24")}
                      </option>
                      <option value="25-34">
                        {translate("form.age.25_34", "25–34")}
                      </option>
                      <option value="35-44">
                        {translate("form.age.35_44", "35–44")}
                      </option>
                      <option value="45plus">
                        {translate("form.age.45plus", "45+")}
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {translate(
                      "form.job.label",
                      "What do you mainly do?"
                    )}
                  </label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder={translate(
                      "form.job.placeholder",
                      "e.g. Software engineer, student, designer, freelancer"
                    )}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      {translate(
                        "form.workType.label",
                        "What kind of day is it?"
                      )}
                    </label>
                    <select
                      value={workType}
                      onChange={(e) =>
                        setWorkType(e.target.value as typeof workType)
                      }
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1.5"
                    >
                      <option value="work">
                        {translate("form.workType.work", "Work day")}
                      </option>
                      <option value="study">
                        {translate("form.workType.study", "Study day")}
                      </option>
                      <option value="mixed">
                        {translate("form.workType.mixed", "Mixed")}
                      </option>
                      <option value="day-off">
                        {translate("form.workType.dayOff", "Day off")}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      {translate(
                        "form.hours.label",
                        "Time available today"
                      )}
                    </label>
                    <select
                      value={hoursAvailable}
                      onChange={(e) =>
                        setHoursAvailable(
                          e.target.value as typeof hoursAvailable
                        )
                      }
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2 py-1.5"
                    >
                      <option value="<1">
                        {translate("form.hours.lt1", "< 1 hour")}
                      </option>
                      <option value="1-2">
                        {translate("form.hours.1_2", "1–2 hours")}
                      </option>
                      <option value="2-4">
                        {translate("form.hours.2_4", "2–4 hours")}
                      </option>
                      <option value="4plus">
                        {translate("form.hours.4plus", "4+ hours")}
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {translate(
                      "form.energy.label",
                      "Energy level right now"
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs w-6 text-right">
                      {energyLevel}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {translate(
                      "form.energy.help",
                      "1 = exhausted, 10 = full of energy."
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {translate(
                      "form.intensity.label",
                      "How intense should today be?"
                    )}
                  </label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setIntensity("light")}
                      className={`px-3 py-1.5 rounded-xl border ${
                        intensity === "light"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      {translate("form.intensity.light", "Light")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntensity("balanced")}
                      className={`px-3 py-1.5 rounded-xl border ${
                        intensity === "balanced"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      {translate("form.intensity.balanced", "Balanced")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntensity("aggressive")}
                      className={`px-3 py-1.5 rounded-xl border ${
                        intensity === "aggressive"
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      {translate("form.intensity.aggressive", "Deep push")}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {translate(
                      "form.todayPlan.label",
                      "What's your plan or context for today?"
                    )}
                  </label>
                  <textarea
                    value={todayPlan}
                    onChange={(e) => setTodayPlan(e.target.value)}
                    placeholder={translate(
                      "form.todayPlan.placeholder",
                      "Meetings, deadlines, errands, appointments, etc."
                    )}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-2 min-h-[70px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {translate(
                      "form.mainGoal.label",
                      "Main goal for today"
                    )}
                  </label>
                  <input
                    type="text"
                    value={mainGoal}
                    onChange={(e) => setMainGoal(e.target.value)}
                    placeholder={translate(
                      "form.mainGoal.placeholder",
                      "e.g. Finish draft, pass exam topic, clean the house"
                    )}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    {translate(
                      "form.hobbies.label",
                      "Hobbies or interests (optional)"
                    )}
                  </label>
                  <input
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder={translate(
                      "form.hobbies.placeholder",
                      "e.g. gym, reading, coding, gaming"
                    )}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {translate(
                      "form.hobbies.help",
                      "The AI can include 1–2 fun or restorative tasks if relevant."
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loadingSuggestions}
                  className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 disabled:opacity-60 text-xs"
                >
                  {loadingSuggestions
                    ? translate("buttons.thinking", "Thinking…")
                    : translate(
                        "buttons.generate",
                        "✨ AI: Suggest my tasks for today"
                      )}
                </button>
              </form>
            </section>

            {/* RIGHT: Suggested tasks + create button */}
            <section className="border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl p-4 flex flex-col">
              <h2 className="text-sm font-semibold mb-2">
                {translate("tasksSection.heading", "AI-suggested tasks")}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                {translate(
                  "tasksSection.subheading",
                  "Review, edit, or delete anything you don't like. Then click one button to create the tasks in your account."
                )}
              </p>

              {loadingSuggestions && (
                <p className="text-[12px] text-[var(--text-muted)] mb-2">
                  {translate(
                    "tasksSection.generating",
                    "Generating suggestions based on your answers…"
                  )}
                </p>
              )}

              {!loadingSuggestions && suggestedTasks.length === 0 && (
                <p className="text-[12px] text-[var(--text-muted)]">
                  {translate(
                    "tasksSection.empty",
                    'No tasks yet. Fill the form on the left and click "AI: Suggest my tasks".'
                  )}
                </p>
              )}

              {suggestedTasks.length > 0 && (
                <div className="flex-1 overflow-y-auto mb-3 space-y-2">
                  {suggestedTasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-[12px]"
                    >
                      <span className="mt-1 text-[var(--text-muted)] text-[11px]">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => {
                            const next = [...suggestedTasks];
                            next[idx] = {
                              ...next[idx],
                              title: e.target.value,
                            };
                            setSuggestedTasks(next);
                          }}
                          className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 mb-1"
                        />
                        <div className="flex gap-2 text-[10px] text-[var(--text-muted)]">
                          {task.category && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                              {task.category}
                            </span>
                          )}
                          {task.size && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] capitalize">
                              {task.size}{" "}
                              {translate(
                                "tasksSection.sizeSuffix",
                                "task"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-1 text-[11px] text-red-400 hover:text-red-300"
                        onClick={() =>
                          setSuggestedTasks((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        {translate("tasksSection.delete", "✕")}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={handleCreateTasks}
                  disabled={creatingTasks || suggestedTasks.length === 0}
                  className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-xs text-slate-950 font-semibold"
                >
                  {creatingTasks
                    ? translate("tasksSection.creating", "Creating tasks…")
                    : translate(
                        "tasksSection.createButton",
                        "✅ Auto-create these tasks and open Tasks"
                      )}
                </button>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  {translate(
                    "tasksSection.footerNote",
                    "Tasks will be added to your normal Tasks list. You can edit them later like any other task."
                  )}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
