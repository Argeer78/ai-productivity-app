"use client";

// ⬇️ add these
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";

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

function buildFlightsUrl({
  from,
  to,
  depart,
  returnDate,
  adults,
  children,
}: FlightUrlOptions): string {
  // Placeholder: Google Flights. Later you can replace with a real affiliate deep link.
  const base = "https://www.google.com/travel/flights";
  const url = new URL(base);

  // Google Flights mostly reads query params from the UI,
  // so we just pass some helpful text for the user.
  url.searchParams.set(
    "q",
    `${from} to ${to} on ${depart}${
      returnDate ? ` returning ${returnDate}` : ""
    } for ${adults} adults${children ? ` and ${children} children` : ""}`
  );

  // If you ever get a proper flights affiliate URL, change logic above.
  return url.toString();
}

function buildCarRentalUrl(params: {
  pickup: string;
  pickupDate: string;
  dropoffDate: string;
}) {
  // Use Booking.com car search with your AID if present.
  const base = "https://www.booking.com/searchresults.html";
  const url = new URL(base);

  if (BOOKING_AFFILIATE_ID) {
    url.searchParams.set("aid", BOOKING_AFFILIATE_ID);
  }

  url.searchParams.set("ss", params.pickup);
  url.searchParams.set("checkin", params.pickupDate);
  url.searchParams.set("checkout", params.dropoffDate);
  url.searchParams.set("from_car_search", "1");

  // Later you could swap to Rentalcars.com + CARS_AFFILIATE_ID
  return url.toString();
}

export default function TravelPage() {
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

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

  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planText, setPlanText] = useState("");

  // Load current user to allow "save trip plan" if logged in
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[travel] auth.getUser error", error);
        }
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("[travel] loadUser error", err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  async function generatePlan() {
    setPlanError("");
    setPlanText("");

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
      console.error("[travel] generatePlan error", err);
      setPlanError("Network error while generating travel plan.");
    } finally {
      setPlanning(false);
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* We don't mark any tab as active here, it's its own section */}
      <AppHeader />

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Travel Planner (beta)
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Let AI help you plan your trip, then book stays via Booking.com.
              </p>
            </div>

            {!loadingUser && !user && (
              <div className="text-[11px] text-slate-300 max-w-xs md:text-right">
                <p className="mb-1">
                  You can use the planner and Booking links without an
                  account.
                </p>
                <p>
                  Create a free account to{" "}
                  <span className="font-semibold">
                    save your trip plan into Notes
                  </span>{" "}
                  and reuse it later.
                </p>
              </div>
            )}
          </div>

          {/* Main layout */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Left column: trip details + flights & car rental */}
            <div className="space-y-4">
              {/* Trip details card */}
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
    <label className="block text-[11px] text-slate-400 mb-1">
      Check-in
    </label>
    <DatePicker
      selected={checkin ? new Date(checkin) : null}
      onChange={(date: Date | null) => {
        setCheckin(date ? date.toISOString().split("T")[0] : "");
      }}
      dateFormat="yyyy-MM-dd"
      placeholderText="Select check-in date"
      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100"
      calendarStartDay={1}
    />
  </div>

  <div className="flex-1">
    <label className="block text-[11px] text-slate-400 mb-1">
      Check-out
    </label>
    <DatePicker
      selected={checkout ? new Date(checkout) : null}
      onChange={(date: Date | null) => {
        setCheckout(date ? date.toISOString().split("T")[0] : "");
      }}
      dateFormat="yyyy-MM-dd"
      placeholderText="Select check-out date"
      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100"
      calendarStartDay={1}
      minDate={checkin ? new Date(checkin) : undefined}
    />
  </div>
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
                      {planning
                        ? "Generating..."
                        : "Generate AI trip plan"}
                    </button>

                    {bookingUrl && (
                      <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm"
                      >
                        Search stays on Booking.com →
                      </a>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Booking links may be affiliate links. They help support
                    the app at no extra cost to you.
                  </p>
                </div>
              </div>

              {/* Flights & car rental card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3">
                  Flights & car rental
                </p>

                <div className="space-y-4">
                  {/* Flights */}
                  <div>
                    <p className="text-[11px] text-slate-300 mb-2 font-semibold">
                      Flights
                    </p>
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
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm mb-1"
                    />
                    <p className="text-[10px] text-slate-500 mb-2">
                      If you leave this blank, we’ll use your destination
                      as a fallback.
                    </p>

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
                        window.open(url, "_blank", "noreferrer");
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                    >
                      Search flights →
                    </button>

                    <p className="text-[10px] text-slate-500 mt-1">
                      We currently send you to Google Flights. You can swap
                      this later for a proper affiliate flights link.
                    </p>
                  </div>

                  {/* Car rental */}
                  <div>
                    <p className="text-[11px] text-slate-300 mb-2 font-semibold">
                      Car rental
                    </p>
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
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm mb-1"
                    />
                    <p className="text-[10px] text-slate-500 mb-2">
                      If empty, we’ll use your destination as pickup
                      location.
                    </p>

                    <button
                      type="button"
                      disabled={!destination || !checkin || !checkout}
                      onClick={() => {
                        const pickup =
                          pickupLocation || destination;
                        const url = buildCarRentalUrl({
                          pickup,
                          pickupDate: checkin,
                          dropoffDate: checkout,
                        });
                        window.open(url, "_blank", "noreferrer");
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                    >
                      Search rental cars →
                    </button>

                    <p className="text-[10px] text-slate-500 mt-1">
                      Car rental search opens on Booking.com. If your{" "}
                      <code>aid</code> is set, it will be tracked.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: AI itinerary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-400 mb-1">
                AI itinerary
              </p>

              {planText ? (
                <>
                  <div className="text-[12px] text-slate-100 whitespace-pre-wrap">
                    {planText}
                  </div>

                  {user && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await supabase.from("notes").insert([
                            {
                              user_id: user.id,
                              title: `Trip to ${destination} (${checkin} → ${checkout})`,
                              content: planText,
                            },
                          ]);
                          alert("Trip plan saved to your notes!");
                        } catch (err) {
                          console.error(
                            "[travel] save trip plan error",
                            err
                          );
                          alert(
                            "Could not save trip plan. Please try again."
                          );
                        }
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs md:text-sm text-slate-900 font-medium"
                    >
                      Save trip plan as a note →
                    </button>
                  )}

                  {!user && !loadingUser && (
                    <p className="mt-3 text-[11px] text-slate-400">
                      Want to save this plan?{" "}
                      <a
                        href="/auth"
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                      >
                        Create a free account
                      </a>{" "}
                      and you’ll be able to store it in your Notes.
                    </p>
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
          </div>
        </div>
      </div>
    </main>
  );
}
