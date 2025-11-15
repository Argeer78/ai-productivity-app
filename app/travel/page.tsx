// app/travel/page.tsx
"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const BOOKING_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_BOOKING_AID || "";
const FLIGHTS_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_FLIGHTS_AID || "";
const CARS_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_CARS_AID || "";

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
  // Placeholder flights URL – swap later for your actual affiliate link
  const base = "https://www.google.com/travel/flights";
  const params = new URLSearchParams();

  params.set("q", `${from} to ${to} ${depart}`);
  if (returnDate) {
    params.set("return", returnDate);
  }
  params.set("adults", String(adults));
  params.set("children", String(children));

  if (FLIGHTS_AFFILIATE_ID) {
    params.set("aff_id", FLIGHTS_AFFILIATE_ID);
  }

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

  if (BOOKING_AFFILIATE_ID) {
    url.searchParams.set("aid", BOOKING_AFFILIATE_ID);
  }

  url.searchParams.set("ss", params.destination);
  url.searchParams.set("checkin", params.checkin);
  url.searchParams.set("checkout", params.checkout);

  if (params.adults) {
    url.searchParams.set("group_adults", String(params.adults));
  }
  if (params.children) {
    url.searchParams.set("group_children", String(params.children));
  }

  return url.toString();
}

function buildCarRentalUrl(params: {
  pickup: string;
  pickupDate: string;
  dropoffDate: string;
}) {
  const base = "https://www.booking.com/searchresults.html";
  const url = new URL(base);

  if (BOOKING_AFFILIATE_ID) {
    url.searchParams.set("aid", BOOKING_AFFILIATE_ID);
  }

  url.searchParams.set("ss", params.pickup);
  url.searchParams.set("checkin", params.pickupDate);
  url.searchParams.set("checkout", params.dropoffDate);
  url.searchParams.set("from_car_search", "1");

  return url.toString();
}

// --- Simple calendar date input ---

type CalendarInputProps = {
  label: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  min?: string; // optional min date "YYYY-MM-DD"
};

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CalendarInput({ label, value, onChange, min }: CalendarInputProps) {
  const [open, setOpen] = useState(false);
  const baseDate = value
    ? new Date(value + "T00:00:00")
    : new Date();

  const [viewYear, setViewYear] = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth()); // 0-11

  const viewDate = new Date(viewYear, viewMonth, 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = viewDate.getDay(); // 0=Sun

  const todayStr = toISODateString(new Date());

  function handleDayClick(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const picked = toISODateString(d);

    if (min && picked < min) {
      return; // don't allow before min
    }

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

  // Build grid: array of length up to 42 (6 weeks)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="relative">
      <label className="block text-[11px] text-slate-400 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm flex items-center justify-between"
      >
        <span className={value ? "text-slate-100" : "text-slate-500"}>
          {value || "Select date"}
        </span>
        <span className="text-[11px] text-slate-400">📅</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:bg-slate-900"
            >
              ◀
            </button>
            <span className="text-xs font-semibold text-slate-100">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:bg-slate-900"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1 text-slate-400">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={idx} className="h-7" />;
              }

              const d = new Date(viewYear, viewMonth, day);
              const dStr = toISODateString(d);
              const isToday = dStr === todayStr;
              const isSelected = dStr === value;
              const isDisabled = min && dStr < min;

              let classes =
                "h-7 rounded-lg flex items-center justify-center cursor-pointer ";
              if (isDisabled) {
                classes += "text-slate-600 cursor-not-allowed";
              } else if (isSelected) {
                classes += "bg-indigo-600 text-white";
              } else if (isToday) {
                classes += "border border-indigo-500 text-slate-100";
              } else {
                classes += "text-slate-200 hover:bg-slate-900";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={!!isDisabled}
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
  // Auth (for saving trips)
  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error("[travel] auth error", error);
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("[travel] auth error", err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Today string for min date
  const todayStr = new Date().toISOString().split("T")[0];

  // Main form state
  const [destination, setDestination] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
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

  // Mini planning assistant
  const [assistantStep, setAssistantStep] = useState<1 | 2 | 3>(1);
  const [assistantDestination, setAssistantDestination] = useState("");
  const [assistantDays, setAssistantDays] = useState(4);
  const [assistantAdults, setAssistantAdults] = useState(2);
  const [assistantChildren, setAssistantChildren] = useState(0);

  // --- click logging helper ---
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
          adults,
          children,
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
      const outStr = out.toISOString().split("T")[0];
      setCheckout(outStr);
    }
  }

  function applyPreset(days: number) {
    const baseStart = checkin
      ? new Date(checkin)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 7); // default: starting next week
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
      setPlanError("Please fill destination and dates first.");
      return;
    }

    setPlanning(true);
    try {
      const res = await fetch("/api/ai-travel-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          checkin,
          checkout,
          adults,
          children,
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
        setPlanError("Server returned an invalid response.");
        return;
      }

      if (!res.ok || !data.plan) {
        setPlanError(data.error || "Failed to generate travel plan.");
        return;
      }

      setPlanText(data.plan);
    } catch (err) {
      console.error(err);
      setPlanError("Network error while generating travel plan.");
    } finally {
      setPlanning(false);
    }
  }

  async function saveTripPlan() {
    if (!user) return;
    if (!destination || !checkin || !checkout || !planText) {
      setSaveMessage("Fill destination, dates and generate a plan first.");
      return;
    }

    setSavingTrip(true);
    setSaveMessage("");
    try {
      const { error } = await supabase.from("travel_plans").insert([
        {
          user_id: user.id,
          destination,
          checkin_date: checkin,
          checkout_date: checkout,
          adults,
          children,
          min_budget: minBudget ? Number(minBudget) : null,
          max_budget: maxBudget ? Number(maxBudget) : null,
          plan_text: planText,
        },
      ]);

      if (error) {
        console.error("[travel] save trip error", error);
        setSaveMessage("Could not save trip. Please try again.");
        return;
      }

      setSaveMessage("Trip saved to your account ✅");
    } catch (err) {
      console.error(err);
      setSaveMessage("Network error while saving trip.");
    } finally {
      setSavingTrip(false);
    }
  }

  const bookingUrl =
    destination && checkin && checkout
      ? buildBookingUrl({
          destination,
          checkin,
          checkout,
          adults,
          children,
        })
      : null;

  const encodedDest = destination
    ? encodeURIComponent(destination.trim())
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Still using planner active to avoid TS changes */}
      <AppHeader active="planner" />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 text-sm">
          {/* Hero / Intro */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Travel Planner (beta)
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                Let AI help you plan your trip – then book your stay via
                Booking.com. Open to everyone, no login needed. Log in if
                you want to save your trip.
              </p>
            </div>

            {/* Auth hint */}
            <div className="text-[11px] text-slate-300">
              {checkingUser ? (
                <span>Checking account…</span>
              ) : user ? (
                <span>
                  Logged in as{" "}
                  <span className="font-semibold">{user.email}</span>
                </span>
              ) : (
                <span>
                  You&apos;re browsing as guest.{" "}
                  <a
                    href="/auth"
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    Create a free account
                  </a>{" "}
                  to save trips.
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* LEFT COLUMN – Trip details & booking links */}
            <div className="space-y-5">
              {/* Trip details */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3">
                  Trip details
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Athens, Barcelona, London"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <CalendarInput
                        label="Check-in"
                        value={checkin}
                        onChange={(val) => {
                          setCheckin(val);
                          if (checkout && checkout < val) {
                            setCheckout("");
                          }
                        }}
                        min={todayStr}
                      />
                    </div>
                    <div className="flex-1">
                      <CalendarInput
                        label="Check-out"
                        value={checkout}
                        onChange={setCheckout}
                        min={checkin || todayStr}
                      />
                    </div>
                  </div>

                  {/* Date presets */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset(2)}
                      className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] hover:bg-slate-900"
                    >
                      Weekend trip (2 nights)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(6)}
                      className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] hover:bg-slate-900"
                    >
                      1 week (6 nights)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(3)}
                      className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] hover:bg-slate-900"
                    >
                      3–4 day city break
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Adults
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={adults}
                        onChange={(e) =>
                          setAdults(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Children
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={children}
                        onChange={(e) =>
                          setChildren(
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Min budget (optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={minBudget}
                        onChange={(e) => setMinBudget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Max budget (optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                      />
                    </div>
                  </div>

                  {planError && (
                    <p className="text-[11px] text-red-400">{planError}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={generatePlan}
                      disabled={planning}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs md:text-sm disabled:opacity-60"
                    >
                      {planning ? "Generating..." : "Generate AI trip plan"}
                    </button>

                    {bookingUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          logTravelClick({
                            clickType: "stay",
                            provider: "booking",
                          });
                          window.open(bookingUrl, "_blank", "noreferrer");
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm"
                      >
                        Search stays on Booking.com →
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Booking links may be affiliate links. They help support
                    the app at no extra cost to you.
                  </p>
                </div>
              </div>

              {/* Flights & Car rental */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Flights */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-3">
                    Flights
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Departure city
                      </label>
                      <input
                        type="text"
                        value={departureCity}
                        onChange={(e) =>
                          setDepartureCity(e.target.value)
                        }
                        placeholder="e.g. Athens, London"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        If empty, we’ll use your destination as a fallback.
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
                          adults,
                          children,
                        });

                        logTravelClick({
                          clickType: "flight",
                          provider: "google-flights",
                        });

                        window.open(url, "_blank", "noreferrer");
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                    >
                      Search flights →
                    </button>

                    <p className="text-[10px] text-slate-500">
                      We send you to a flights search page (for now Google
                      Flights). You can hook in a proper affiliate link
                      later.
                    </p>
                  </div>
                </div>

                {/* Car rental */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-3">
                    Car rental
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Pickup location
                      </label>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) =>
                          setPickupLocation(e.target.value)
                        }
                        placeholder="e.g. Airport, city name"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        If empty, we’ll use your destination as pickup
                        location.
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

                        logTravelClick({
                          clickType: "car",
                          provider: "booking-cars",
                        });

                        window.open(url, "_blank", "noreferrer");
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                    >
                      Search rental cars →
                    </button>

                    <p className="text-[10px] text-slate-500">
                      Car rental search opens on Booking.com. If your
                      affiliate ID is set, it will be tracked via your{" "}
                      <code>aid</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN – AI itinerary + assistant */}
            <div className="space-y-5">
              {/* Destination images */}
              {encodedDest && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    Destination preview
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <div className="relative overflow-hidden rounded-xl h-32 md:h-40">
                        <img
                          src={`https://source.unsplash.com/featured/640x360/?${encodedDest},city`}
                          alt={destination}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="h-20 rounded-xl overflow-hidden">
                      <img
                        src={`https://source.unsplash.com/featured/320x240/?${encodedDest},landmark`}
                        alt={destination}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="h-20 rounded-xl overflow-hidden">
                      <img
                        src={`https://source.unsplash.com/featured/320x240/?${encodedDest},food`}
                        alt={destination}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="h-20 rounded-xl overflow-hidden">
                      <img
                        src={`https://source.unsplash.com/featured/320x240/?${encodedDest},night`}
                        alt={destination}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Photos from Unsplash-style sources. Actual stay and
                    exact views may differ.
                  </p>
                </div>
              )}

              {/* AI itinerary */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  AI itinerary
                </p>
                {planText ? (
                  <>
                    <div className="text-[12px] text-slate-100 whitespace-pre-wrap mb-3">
                      {planText}
                    </div>
                    {user ? (
                      <>
                        <button
                          type="button"
                          onClick={saveTripPlan}
                          disabled={savingTrip}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs md:text-sm disabled:opacity-60"
                        >
                          {savingTrip
                            ? "Saving trip..."
                            : "Save this trip to my account"}
                        </button>
                        {saveMessage && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            {saveMessage}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-400">
                        <p className="mb-1">
                          Want to save this trip and access it later?
                        </p>
                        <a
                          href="/auth"
                          className="inline-block mt-1 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-900"
                        >
                          Create a free account / Log in
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[12px] text-slate-400">
                    Fill in your trip details and click{" "}
                    <span className="font-semibold">
                      Generate AI trip plan
                    </span>{" "}
                    to get a structured itinerary and suggestions.
                  </p>
                )}
              </div>

              {/* Planning Assistant */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">
                  Planning assistant
                </p>
                {assistantStep === 1 && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-slate-300">
                      1/3 – Where do you want to go?
                    </p>
                    <input
                      type="text"
                      value={assistantDestination}
                      onChange={(e) =>
                        setAssistantDestination(e.target.value)
                      }
                      placeholder="e.g. Rome, Paris, Prague"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAssistantDestination("Barcelona")}
                        className="px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-900"
                      >
                        Barcelona
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantDestination("London")}
                        className="px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-900"
                      >
                        London
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantDestination("Athens")}
                        className="px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-900"
                      >
                        Athens
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!assistantDestination.trim()}
                      onClick={() => {
                        setDestination(assistantDestination.trim());
                        setAssistantStep(2);
                      }}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs disabled:opacity-60"
                    >
                      Next: How many days?
                    </button>
                  </div>
                )}

                {assistantStep === 2 && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-slate-300">
                      2/3 – How many days do you want to stay?
                    </p>
                    <input
                      type="number"
                      min={2}
                      value={assistantDays}
                      onChange={(e) =>
                        setAssistantDays(
                          Math.max(2, Number(e.target.value) || 2)
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAssistantDays(3)}
                        className="px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-900"
                      >
                        3 days
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantDays(5)}
                        className="px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-900"
                      >
                        5 days
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantDays(7)}
                        className="px-3 py-1.5 rounded-full border border-slate-700 hover:bg-slate-900"
                      >
                        7 days
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const start = new Date();
                          start.setDate(start.getDate() + 14);
                          const startStr =
                            start.toISOString().split("T")[0];
                          const out = new Date(start);
                          out.setDate(out.getDate() + assistantDays);
                          const outStr =
                            out.toISOString().split("T")[0];

                          setCheckin(startStr);
                          setCheckout(outStr);
                          setAssistantStep(3);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs"
                      >
                        Next: Who’s going?
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantStep(1)}
                        className="text-[11px] text-slate-400"
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                )}

                {assistantStep === 3 && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-slate-300">
                      3/3 – Who&apos;s going?
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Adults
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={assistantAdults}
                          onChange={(e) =>
                            setAssistantAdults(
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Children
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={assistantChildren}
                          onChange={(e) =>
                            setAssistantChildren(
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
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
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs"
                      >
                        Apply to form & use AI
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantStep(2)}
                        className="text-[11px] text-slate-400"
                      >
                        ← Back
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Once applied, just hit{" "}
                      <span className="font-semibold">
                        Generate AI trip plan
                      </span>{" "}
                      to get your itinerary.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom CTA for guests */}
          {!user && !checkingUser && (
            <div className="rounded-2xl border border-indigo-500/60 bg-indigo-950/40 p-4 text-xs max-w-xl">
              <p className="text-indigo-100 font-semibold mb-1">
                Want to save your trips and access them later?
              </p>
              <p className="text-indigo-100 mb-3">
                Create a free account to save your AI-generated itineraries,
                sync them with your productivity dashboard, and get weekly
                summaries.
              </p>
              <a
                href="/auth"
                className="px-4 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-900 font-medium inline-block"
              >
                Create free account / Log in
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
