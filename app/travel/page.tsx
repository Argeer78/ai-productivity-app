// app/travel/page.tsx
"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

import { useAuthGate } from "@/app/hooks/useAuthGate";
import AuthGateModal from "@/app/components/AuthGateModal";
import { useLanguage } from "@/app/components/LanguageProvider";
import Alive3DImage from "@/app/components/Alive3DImage";
import VoiceCaptureButton from "@/app/components/VoiceCaptureButton";
import WeatherOverview from "@/app/components/WeatherOverview";
import Confetti from "@/app/components/Confetti";
import { useSound } from "@/lib/sound";

const SUGGESTED_DESTINATIONS = []; // Assuming this should be an empty array or defined elsewhere
const BOOKING_AFFILIATE_ID = process.env.NEXT_PUBLIC_BOOKING_AID || "";
const FLIGHTS_AFFILIATE_ID = process.env.NEXT_PUBLIC_FLIGHTS_AID || "";
// Kept here if you want later; not directly used in current implementation
const CARS_AFFILIATE_ID = process.env.NEXT_PUBLIC_CARS_AID || "";

type FlightUrlOptions = {
  from: string;
  to: string;
  depart: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  children: number;
};

function buildFlightsUrl({
  from,
  to,
  depart,
  returnDate,
  adults,
  children,
}: FlightUrlOptions): string {
  const base = "https://www.google.com/travel/flights";
  const params = new URLSearchParams();

  params.set("q", `${from} to ${to} ${depart}`);
  if (returnDate) params.set("return", returnDate);
  params.set("adults", String(adults));
  params.set("children", String(children));

  if (FLIGHTS_AFFILIATE_ID) params.set("aff_id", FLIGHTS_AFFILIATE_ID);

  return `${base}?${params.toString()}`;
}

function buildBookingUrl(params: {
  destination: string;
  checkin: string;
  checkout: string;
  adults?: number;
  children?: number;
}) {
  const base = "https://www.booking.com/searchresults.html";
  const url = new URL(base);

  if (BOOKING_AFFILIATE_ID) url.searchParams.set("aid", BOOKING_AFFILIATE_ID);

  url.searchParams.set("ss", params.destination);
  url.searchParams.set("checkin", params.checkin);
  url.searchParams.set("checkout", params.checkout);

  if (params.adults) url.searchParams.set("group_adults", String(params.adults));
  if (params.children) url.searchParams.set("group_children", String(params.children));

  return url.toString();
}

function buildCarRentalUrl(params: {
  pickup: string;
  pickupDate: string;
  dropoffDate: string;
}) {
  const base = "https://www.booking.com/searchresults.html";
  const url = new URL(base);

  if (BOOKING_AFFILIATE_ID) url.searchParams.set("aid", BOOKING_AFFILIATE_ID);

  url.searchParams.set("ss", params.pickup);
  url.searchParams.set("checkin", params.pickupDate);
  url.searchParams.set("checkout", params.dropoffDate);
  url.searchParams.set("from_car_search", "1");

  return url.toString();
}

// --- Simple calendar date input with theme vars ---

type CalendarInputProps = {
  label: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  min?: string; // optional min date "YYYY-MM-DD"
  placeholder: string;
  t: (key: string, fallback: string) => string;
};

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CalendarInput({
  label,
  value,
  onChange,
  min,
  placeholder,
  t,
}: CalendarInputProps) {
  const [open, setOpen] = useState(false);
  const baseDate = value ? new Date(value + "T00:00:00") : new Date();

  const [viewYear, setViewYear] = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth()); // 0-11

  const viewDate = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = viewDate.getDay(); // 0=Sun
  const todayStr = toISODateString(new Date());

  function handleDayClick(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const picked = toISODateString(d);

    if (min && picked < min) return;

    onChange(picked);
    setOpen(false);
  }

  function prevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Build grid: up to 42 cells (6 weeks)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="relative">
      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm flex items-center justify-between"
      >
        <span className={value ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}>
          {value || placeholder}
        </span>

        <span className="text-[11px] text-[var(--text-muted)]">
          {t("travelPage.calendar.icon", "📅")}
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              aria-label={t("travelPage.calendar.prevMonth", "Previous month")}
            >
              {t("travelPage.calendar.prevArrow", "◀")}
            </button>

            <span className="text-xs font-semibold text-[var(--text-main)]">{monthLabel}</span>

            <button
              type="button"
              onClick={nextMonth}
              className="px-2 py-1 rounded-lg text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              aria-label={t("travelPage.calendar.nextMonth", "Next month")}
            >
              {t("travelPage.calendar.nextArrow", "▶")}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1 text-[var(--text-muted)]">
            <div>{t("travelPage.calendar.weekday.su", "Su")}</div>
            <div>{t("travelPage.calendar.weekday.mo", "Mo")}</div>
            <div>{t("travelPage.calendar.weekday.tu", "Tu")}</div>
            <div>{t("travelPage.calendar.weekday.we", "We")}</div>
            <div>{t("travelPage.calendar.weekday.th", "Th")}</div>
            <div>{t("travelPage.calendar.weekday.fr", "Fr")}</div>
            <div>{t("travelPage.calendar.weekday.sa", "Sa")}</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="h-7" />;

              const d = new Date(viewYear, viewMonth, day);
              const dStr = toISODateString(d);

              const isToday = dStr === todayStr;
              const isSelected = dStr === value;
              const isDisabled = !!(min && dStr < min);

              let classes =
                "h-7 rounded-lg flex items-center justify-center cursor-pointer transition ";
              if (isDisabled) {
                classes += "text-[var(--text-muted)] opacity-40 cursor-not-allowed";
              } else if (isSelected) {
                classes += "bg-[var(--accent)] text-[var(--bg-body)]";
              } else if (isToday) {
                classes += "border border-[var(--accent)] text-[var(--text-main)]";
              } else {
                classes += "text-[var(--text-main)] hover:bg-[var(--bg-elevated)]";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={isDisabled}
                  className={classes}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TravelPage() {
  // ✅ Notes-style wiring: fully-qualified keys stored in DB
  const { t } = useT("travelPage");

  // Auth (only required for saving trips)
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const gate = useAuthGate(user);

  // ✅ session-safe auth init (avoids AuthSessionMissingError)
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setUser(data.session?.user ?? null);
      setCheckingUser(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      });

      return () => sub.subscription.unsubscribe();
    }

    let cleanup: undefined | (() => void);
    init().then((fn) => (cleanup = fn));

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  // Today string for min date
  const todayStr = new Date().toISOString().split("T")[0];

  // Main form state
  const [destination, setDestination] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState<number | string>(2);
  const [children, setChildren] = useState<number | string>(0);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  // Flights & car rental
  const [departureCity, setDepartureCity] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");

  // AI plan
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planText, setPlanText] = useState("");

  // Save trip
  const [savingTrip, setSavingTrip] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState("");
  const { play } = useSound();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleGenerateTasks() {
    if (!planText.trim()) return;
    play("pop");

    if (!user) {
      gate.openGate({
        title: t("auth.tasks.title", "Log in to create tasks"),
        subtitle: t("auth.tasks.subtitle", "Save this plan directly to your tasks.")
      });
      return;
    }

    setGeneratingTasks(true);

    try {
      const res = await fetch("/api/ai/note-to-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: planText }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("[travel] generate-tasks error:", data);
        alert(data?.error || t("tasks.error", "Failed to generate tasks."));
        return;
      }

      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (tasks.length === 0) {
        alert(t("tasks.empty", "AI couldn't find actionable tasks in this plan."));
        return;
      }

      const rows = tasks.map((tItem: any) => ({
        user_id: user.id,
        title: typeof tItem.title === "string" ? tItem.title.trim() : "",
        completed: false,
        category: "travel"
      })).filter((r: any) => r.title.length > 0);

      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        console.error("[travel] tasks insert error:", insertError);
        alert(t("tasks.saveError", "Failed to save tasks."));
        return;
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      showToast(t("tasks.success", `Created ${rows.length} travel tasks! ✅`));

    } catch (err) {
      console.error("[travel] unexpected:", err);
      alert(t("tasks.networkError", "Unexpected error."));
    } finally {
      setGeneratingTasks(false);
    }
  }

  // Mini planning assistant
  const [assistantStep, setAssistantStep] = useState<1 | 2 | 3>(1);
  const [assistantDestination, setAssistantDestination] = useState("");
  const [assistantDays, setAssistantDays] = useState(4);
  const [assistantAdults, setAssistantAdults] = useState(2);
  const [assistantChildren, setAssistantChildren] = useState(0);

  // ✅ Voice Handler
  function handleTravelVoice(payload: { rawText: string | null; structured: any | null }) {
    const travel = payload.structured?.travel;

    if (travel) {
      // Apply structured fields
      if (travel.destination) setDestination(travel.destination);
      if (travel.checkin) setCheckin(travel.checkin);
      if (travel.checkout) setCheckout(travel.checkout);

      if (typeof travel.adults === 'number') setAdults(travel.adults);
      if (typeof travel.children === 'number') setChildren(travel.children);

      if (travel.budget_min) setMinBudget(String(travel.budget_min));
      if (travel.budget_max) setMaxBudget(String(travel.budget_max));
    } else if (payload.rawText) {
      // Fallback if no structured data found
      setDestination(payload.rawText);
    }
  }

  async function logTravelClick(payload: {
    clickType: "stay" | "flight" | "car";
    provider: string;
  }) {
    try {
      await fetch("/api/travel-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          userId: user?.id || null,
          destination: destination || null,
          fromCity: departureCity || null,
          checkin: checkin || null,
          checkout: checkout || null,
          adults: Number(adults) || 1,
          children: Number(children) || 0,
        }),
      });
    } catch {
      // don't block UX if logging fails
    }
  }

  function applyAutoCheckout(newCheckin: string) {
    setCheckin(newCheckin);
    if (!newCheckin) return;

    const start = new Date(newCheckin);
    const currentCheckout = checkout ? new Date(checkout) : null;

    if (!currentCheckout || currentCheckout <= start) {
      const out = new Date(start);
      out.setDate(out.getDate() + 3);
      setCheckout(out.toISOString().split("T")[0]);
    }
  }

  function applyPreset(days: number) {
    const baseStart = checkin
      ? new Date(checkin)
      : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
      })();

    const startStr = baseStart.toISOString().split("T")[0];
    const out = new Date(baseStart);
    out.setDate(out.getDate() + days);
    const outStr = out.toISOString().split("T")[0];

    setCheckin(startStr);
    setCheckout(outStr);
  }

  async function generatePlan() {
    setPlanError("");
    setPlanText("");
    setSaveMessage("");

    if (!destination || !checkin || !checkout) {
      setPlanError(t("error.missingFields", "Please fill destination and dates first."));
      return;
    }

    // ✅ AI call: require auth so we can count usage
    if (
      !gate.requireAuth(undefined, {
        title: t("auth.aiTitle", "Log in to generate an AI trip plan"),
        subtitle: t("auth.aiSubtitle", "AI trip planning uses your daily AI limit and is linked to your account."),
      })
    ) {
      return;
    }
    if (!user?.id) return;

    setPlanning(true);
    try {
      const res = await fetch("/api/ai-travel-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id, // ✅ must be present for counting
          destination,
          checkin,
          checkout,
          adults: Number(adults) || 1,
          children: Number(children) || 0,
          minBudget,
          maxBudget,
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non-JSON travel response:", text);
        setPlanError(t("error.invalidResponse", "Server returned an invalid response."));
        return;
      }

      if (!res.ok || !data.plan) {
        setPlanError(data.error || t("error.generateFailed", "Failed to generate travel plan."));
        return;
      }

      setPlanText(data.plan);
    } catch (err) {
      console.error(err);
      setPlanError(t("error.network", "Network error while generating travel plan."));
    } finally {
      setPlanning(false);
    }
  }

  async function saveTripPlan() {
    setSaveMessage("");

    // ✅ gate save (opens modal) instead of silently failing / locking page
    if (
      !gate.requireAuth(undefined, {
        title: t("auth.saveTitle", "Log in to save this trip"),
        subtitle: t("auth.saveSubtitle", "Saved trips are stored in your account so you can access them later."),
      })
    ) {
      return;
    }
    if (!user?.id) return;

    if (!destination || !checkin || !checkout || !planText) {
      setSaveMessage(t("save.missingFields", "Fill destination, dates and generate a plan first."));
      return;
    }

    setSavingTrip(true);
    try {
      const { error } = await supabase.from("travel_plans").insert([
        {
          user_id: user.id,
          destination,
          checkin_date: checkin,
          checkout_date: checkout,
          adults: Number(adults) || 1,
          children: Number(children) || 0,
          min_budget: minBudget ? Number(minBudget) : null,
          max_budget: maxBudget ? Number(maxBudget) : null,
          plan_text: planText,
        },
      ]);

      if (error) {
        console.error("[travel] save trip error", error);
        setSaveMessage(t("save.error", "Could not save trip. Please try again."));
        return;
      }

      setSaveMessage(t("save.success", "Trip saved to your account ✅"));
    } catch (err) {
      console.error(err);
      setSaveMessage(t("save.networkError", "Network error while saving trip."));
    } finally {
      setSavingTrip(false);
    }
  }

  const bookingUrl =
    destination && checkin && checkout
      ? buildBookingUrl({ destination, checkin, checkout, adults: Number(adults) || 1, children: Number(children) || 0 })
      : null;

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="travel" />

      {/* ✅ Always mounted (like Settings) */}
      <AuthGateModal open={gate.open} onClose={gate.close} copy={gate.copy} authHref={gate.authHref} />
      {showConfetti && <Confetti />}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur px-4 py-2 text-xs shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">

            <div className="flex-1 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-semibold mb-3">
                BETA FEATURE
              </span>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("title", "Travel Planner")}</h1>
              <p className="text-sm text-[var(--text-muted)] max-w-lg leading-relaxed mb-4">
                {t(
                  "subtitle",
                  "Let AI design your perfect trip itinerary in seconds. Then easily book your stay and flights."
                )}
              </p>

              <div className="text-[11px] text-[var(--text-muted)]">
                {checkingUser ? (
                  <span>{t("checkingAccount", "Checking account…")}</span>
                ) : user ? (
                  <span>
                    {t("loggedInAs", "Logged in as")}{" "}
                    <span className="font-semibold text-[var(--text-main)]">{user.email}</span>
                  </span>
                ) : (
                  <span>
                    {t("guestBrowsing", "You're browsing as guest.")}{" "}
                    <button
                      type="button"
                      onClick={() =>
                        gate.openGate({
                          title: t("auth.title", "Create an account to save trips"),
                          subtitle: t("auth.subtitle", "Saving trips requires an account."),
                        })
                      }
                      className="text-[var(--accent)] hover:opacity-90 underline underline-offset-2"
                    >
                      {t("createAccountLink", "Create a free account")}
                    </button>{" "}
                    {t("saveTripsHint", "to save trips.")}
                  </span>
                )}
              </div>
            </div>

            <div className="w-40 h-40 relative z-10 block">
              {/* 3D Illustration */}
              <div className="w-full max-w-[400px] h-[400px] relative pointer-events-none">
                <Alive3DImage src="/images/travel-hero.png" alt="Travel" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* LEFT COLUMN – Trip details & booking links */}
            <div className="space-y-5">
              {/* Trip details */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                  {t("section.tripDetails", "Trip details")}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                      {t("destination.label", "Destination")}
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder={t("destination.placeholder", "e.g. Athens, Barcelona, London")}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <CalendarInput
                        label={t("checkIn.label", "Check-in")}
                        value={checkin}
                        onChange={(val) => applyAutoCheckout(val)}
                        min={todayStr}
                        placeholder={t("checkIn.placeholder", "Select date")}
                        t={t}
                      />
                    </div>
                    <div className="flex-1">
                      <CalendarInput
                        label={t("checkOut.label", "Check-out")}
                        value={checkout}
                        onChange={setCheckout}
                        min={checkin || todayStr}
                        placeholder={t("checkOut.placeholder", "Select date")}
                        t={t}
                      />
                    </div>
                  </div>

                  {/* Date presets */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset(2)}
                      className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-[11px] hover:bg-[var(--bg-elevated)]"
                    >
                      {t("quickOption.weekend", "Weekend trip (2 nights)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(6)}
                      className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-[11px] hover:bg-[var(--bg-elevated)]"
                    >
                      {t("quickOption.week", "1 week (6 nights)")}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(3)}
                      className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-[11px] hover:bg-[var(--bg-elevated)]"
                    >
                      {t("quickOption.cityBreak", "3–4 day city break")}
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                        {t("adults.label", "Adults")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={adults}
                        onChange={(e) => setAdults(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value)))}
                        onBlur={() => setAdults((prev) => (!prev || Number(prev) < 1 ? 1 : Number(prev)))}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                        {t("children.label", "Children")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={children}
                        onChange={(e) => setChildren(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value)))}
                        onBlur={() => setChildren((prev) => (prev === "" ? 0 : Number(prev)))}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                        {t("budgetMin.label", "Min budget (optional)")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={minBudget}
                        onChange={(e) => setMinBudget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                        {t("budgetMax.label", "Max budget (optional)")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                    </div>
                  </div>

                  {planError && <p className="text-[11px] text-red-400">{planError}</p>}

                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <VoiceCaptureButton
                      userId={user?.id || ""}
                      mode="travel"
                      variant="icon"
                      size="sm"
                      interaction="hold"
                      onResult={handleTravelVoice}
                    />

                    <button
                      type="button"
                      onClick={generatePlan}
                      disabled={planning}
                      className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-xs md:text-sm disabled:opacity-60"
                    >
                      {planning ? t("buttons.generating", "Generating...") : t("generateButton", "Generate AI trip plan")}
                    </button>

                    {bookingUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          logTravelClick({ clickType: "stay", provider: "booking" });
                          if (typeof window !== "undefined") window.open(bookingUrl, "_blank", "noreferrer");
                        }}
                        className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs md:text-sm"
                      >
                        {t("buttons.searchStays", "Search stays on Booking.com →")}
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {t("bookingNote", "Booking links may be affiliate links. They help support the app at no extra cost to you.")}
                  </p>
                </div>
              </div>

              {/* Flights & Car rental */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Flights */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                    {t("section.flights", "Flights")}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                        {t("flights.departureCity.label", "Departure city")}
                      </label>
                      <input
                        type="text"
                        value={departureCity}
                        onChange={(e) => setDepartureCity(e.target.value)}
                        placeholder={t("flights.departureCity.placeholder", "e.g. Athens, London")}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {t("flights.departureCity.helper", "If empty, we'll use your destination as a fallback.")}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!destination || !checkin}
                      onClick={() => {
                        const from = departureCity || destination;
                        const to = destination;
                        const url = buildFlightsUrl({
                          from,
                          to,
                          depart: checkin,
                          returnDate: checkout || undefined,
                          adults: Number(adults) || 1,
                          children: Number(children) || 0,
                        });

                        logTravelClick({ clickType: "flight", provider: "google-flights" });

                        if (typeof window !== "undefined") window.open(url, "_blank", "noreferrer");
                      }}
                      className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs md:text-sm disabled:opacity-60"
                    >
                      {t("flights.searchButton", "Search flights →")}
                    </button>

                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t("flights.note", "We send you to a flights search page (for now Google Flights). You can hook in a proper affiliate link later.")}
                    </p>
                  </div>
                </div>

                {/* Car rental */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                    {t("section.carRental", "Car rental")}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                        {t("carRental.pickup.label", "Pickup location")}
                      </label>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder={t("carRental.pickup.placeholder", "e.g. Airport, city name")}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {t("carRental.pickup.helper", "If empty, we'll use your destination as pickup location.")}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!destination || !checkin || !checkout}
                      onClick={() => {
                        const pickup = pickupLocation || destination;
                        const url = buildCarRentalUrl({
                          pickup,
                          pickupDate: checkin,
                          dropoffDate: checkout,
                        });

                        logTravelClick({ clickType: "car", provider: "booking-cars" });

                        if (typeof window !== "undefined") window.open(url, "_blank", "noreferrer");
                      }}
                      className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs md:text-sm disabled:opacity-60"
                    >
                      {t("carRental.searchButton", "Search rental cars →")}
                    </button>

                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t("carRental.note", "Car rental search opens on Booking.com. If your affiliate ID is set, it will be tracked via your aid.")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN – AI itinerary + assistant */}
            <div className="space-y-5">
              {/* Weather Widget */}
              <WeatherOverview destination={destination} checkin={checkin} checkout={checkout} />

              {/* AI itinerary */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                  {t("section.aiItinerary", "AI itinerary")}
                </p>

                {planText ? (
                  <div className="text-[12px] text-[var(--text-main)] whitespace-pre-wrap mb-3">{planText}</div>
                ) : (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {t("aiItinerary.helper", "Fill in your trip details and click Generate AI trip plan to get a structured itinerary and suggestions.")}
                  </p>
                )}

                {planText && (
                  <>
                    <button
                      type="button"
                      onClick={saveTripPlan}
                      disabled={savingTrip}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs md:text-sm text-white disabled:opacity-60"
                    >
                      {savingTrip ? t("save.buttonSaving", "Saving trip...") : t("save.button", "Save this trip to my account")}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateTasks}
                      disabled={generatingTasks}
                      className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs md:text-sm disabled:opacity-60"
                    >
                      {generatingTasks ? t("tasks.creating", "Creating...") : t("tasks.convertToTasks", "⚡ Convert to Tasks")}
                    </button>

                    {saveMessage && (
                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">{saveMessage}</p>
                    )}

                    {!user && (
                      <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                        <p className="mb-1">{t("itinerary.guestSavePrompt", "Want to save this trip and access it later?")}</p>
                        <button
                          type="button"
                          onClick={() =>
                            gate.openGate({
                              title: t("auth.saveTitle", "Log in to save this trip"),
                              subtitle: t("auth.saveSubtitle", "Saved trips are stored in your account so you can access them later."),
                            })
                          }
                          className="inline-block mt-1 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                        >
                          {t("itinerary.guestSaveButton", "Create a free account / Log in")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Planning Assistant */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                  {t("section.planningAssistant", "Planning assistant")}
                </p>

                {assistantStep === 1 && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[var(--text-main)]">{t("assistant.step1.title", "1/3 – Where do you want to go?")}</p>
                    <input
                      type="text"
                      value={assistantDestination}
                      onChange={(e) => setAssistantDestination(e.target.value)}
                      placeholder={t("assistant.step1.placeholder", "e.g. Rome, Paris, Prague")}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                    />

                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAssistantDestination(t("assistant.step1.suggestion.barcelona", "Barcelona"))}
                        className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                      >
                        {t("assistant.step1.suggestion.barcelona", "Barcelona")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantDestination(t("assistant.step1.suggestion.london", "London"))}
                        className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                      >
                        {t("assistant.step1.suggestion.london", "London")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantDestination(t("assistant.step1.suggestion.athens", "Athens"))}
                        className="px-3 py-1.5 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                      >
                        {t("assistant.step1.suggestion.athens", "Athens")}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!assistantDestination.trim()}
                      onClick={() => {
                        setDestination(assistantDestination.trim());
                        setAssistantStep(2);
                      }}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs disabled:opacity-60"
                    >
                      {t("assistant.step1.next", "Next: How many days?")}
                    </button>
                  </div>
                )}

                {assistantStep === 2 && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[var(--text-main)]">{t("assistant.step2.title", "2/3 – How many days do you want to stay?")}</p>
                    <input
                      type="number"
                      min={2}
                      value={assistantDays}
                      onChange={(e) => setAssistantDays(Math.max(2, Number(e.target.value) || 2))}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date();
                          start.setDate(start.getDate() + 14);
                          const startStr = start.toISOString().split("T")[0];

                          const out = new Date(start);
                          out.setDate(out.getDate() + assistantDays);
                          const outStr = out.toISOString().split("T")[0];

                          setCheckin(startStr);
                          setCheckout(outStr);
                          setAssistantStep(3);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs"
                      >
                        {t("assistant.step2.next", "Next: Who’s going?")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantStep(1)}
                        className="text-[11px] text-[var(--text-muted)]"
                      >
                        {t("assistant.back", "← Back")}
                      </button>
                    </div>
                  </div>
                )}

                {assistantStep === 3 && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-[var(--text-main)]">{t("assistant.step3.title", "3/3 – Who's going?")}</p>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] text-[var(--text-muted)] mb-1">{t("adults.label", "Adults")}</label>
                        <input
                          type="number"
                          min={1}
                          value={assistantAdults}
                          onChange={(e) => setAssistantAdults(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-[11px] text-[var(--text-muted)] mb-1">{t("children.label", "Children")}</label>
                        <input
                          type="number"
                          min={0}
                          value={assistantChildren}
                          onChange={(e) => setAssistantChildren(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAdults(assistantAdults);
                          setChildren(assistantChildren);
                          setAssistantStep(1);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] text-xs"
                      >
                        {t("assistant.apply", "Apply to form & use AI")}
                      </button>

                      <button type="button" onClick={() => setAssistantStep(2)} className="text-[11px] text-[var(--text-muted)]">
                        {t("assistant.back", "← Back")}
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      {t("assistant.finalHint", "Once applied, just hit Generate AI trip plan to get your itinerary.")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom CTA for guests */}
          {!user && !checkingUser && (
            <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">
                    {t("guestCta.kicker", "SAVE YOUR TRIPS")}
                  </p>

                  <h3 className="text-base font-semibold text-[var(--text-main)] mb-1">
                    {t("guestCta.title", "Want to save your trips and access them later?")}
                  </h3>

                  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                    {t(
                      "guestCta.body",
                      "Create a free account to save your AI-generated itineraries, sync them with your productivity dashboard, and get weekly summaries."
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      gate.openGate({
                        title: t("auth.title", "Create a free account"),
                        subtitle: t("auth.subtitle", "Log in to save trips and access them later."),
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-sm font-medium text-[var(--accent-contrast)]"
                  >
                    {t("guestCta.button", "Create free account / Log in")}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  {t("guestCta.perk1", "💾 Save itineraries")}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  {t("guestCta.perk2", "📊 Sync with dashboard")}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  {t("guestCta.perk3", "📩 Weekly summaries")}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
