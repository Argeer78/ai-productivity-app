"use client";

import { useState } from "react";
import AppHeader from "@/app/components/AppHeader";

const BOOKING_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_BOOKING_AID || "";
const FLIGHTS_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_FLIGHTS_AID || "";
const CARS_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_CARS_AID || "";

// ---------- Helpers ----------

type FlightUrlOptions = {
  from: string;
  to: string;
  depart: string; // YYYY-MM-DD from your date input
  returnDate?: string; // optional return date
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
  // TODO: Replace this with your real flights affiliate URL & params
  let base = "https://www.google.com/travel/flights";

  // Example: if you ever get a FLIGHTS_AFFILIATE_ID:
  if (FLIGHTS_AFFILIATE_ID) {
    // some providers support ?aid=... etc
    // base = `https://example-flights.com/search?aid=${FLIGHTS_AFFILIATE_ID}`;
  }

  const url = new URL(base);
  const params = url.searchParams;

  // These query params are just placeholders – you’ll adjust once you know
  // what your affiliate program expects.
  params.set("from", from);
  params.set("to", to);
  params.set("depart", depart);
  if (returnDate) {
    params.set("return", returnDate);
  }
  params.set("adults", String(adults));
  params.set("children", String(children));

  return url.toString();
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
  // Simple: use Booking's car rental search with your AID if present.
  const base = "https://www.booking.com/searchresults.html";
  const url = new URL(base);

  if (BOOKING_AFFILIATE_ID) {
    url.searchParams.set("aid", BOOKING_AFFILIATE_ID);
  }

  url.searchParams.set("ss", params.pickup);
  url.searchParams.set("checkin", params.pickupDate);
  url.searchParams.set("checkout", params.dropoffDate);
  url.searchParams.set("from_car_search", "1");

  // Later you can switch to Rentalcars.com and use CARS_AFFILIATE_ID.
  return url.toString();
}

// ---------- Page component ----------

export default function TravelPage() {
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
      console.error(err);
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
      <AppHeader active="planner" />
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Travel Planner (beta)
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Let AI help you plan your trip, then book stays via Booking.com.
              </p>
            </div>
          </div>

          {/* Flights & Car rental row */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                    onChange={(e) => setDepartureCity(e.target.value)}
                    placeholder="e.g. Athens, London"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    If you leave this blank, we’ll use your destination as a fallback.
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
                    window.open(url, "_blank", "noreferrer");
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                >
                  Search flights →
                </button>

                <p className="text-[10px] text-slate-500">
                  For now this opens a generic flights search page. You can plug in a
                  proper affiliate URL once you have it.
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
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Airport, city name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    If empty, we’ll use your destination as pickup location.
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
                    window.open(url, "_blank", "noreferrer");
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-xs md:text-sm disabled:opacity-60"
                >
                  Search rental cars →
                </button>

                <p className="text-[10px] text-slate-500">
                  Car rental search opens on Booking.com. If your affiliate ID is set,
                  it’s passed via <code>aid</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Trip + AI plan */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                    <input
                      type="date"
                      value={checkin}
                      onChange={(e) => setCheckin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Check-out
                    </label>
                    <input
                      type="date"
                      value={checkout}
                      onChange={(e) => setCheckout(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
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
                        setAdults(Math.max(1, Number(e.target.value) || 1))
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
                        setChildren(Math.max(0, Number(e.target.value) || 0))
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
                  Booking links may be affiliate links. They help support the app at
                  no extra cost to you.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-400 mb-1">
                AI itinerary
              </p>
              {planText ? (
                <div className="text-[12px] text-slate-100 whitespace-pre-wrap">
                  {planText}
                </div>
              ) : (
                <p className="text-[12px] text-slate-400">
                  Fill in your trip details and click{" "}
                  <span className="font-semibold">Generate AI trip plan</span>{" "}
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
