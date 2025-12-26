// app/my-trips/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/useT";

type Trip = {
  id: string;
  destination: string;
  checkin_date: string;
  checkout_date: string;
  adults: number | null;
  children: number | null;
  min_budget: number | null;
  max_budget: number | null;
  plan_text: string | null;
  created_at?: string | null;
};

export default function MyTripsPage() {
  // ✅ Notes-style: always build full keys myTrips.*
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(`myTrips.${key}`, fallback);

  const [user, setUser] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) console.error("[my-trips] auth error", error);
        setUser(data?.user ?? null);
      } catch (err) {
        console.error("[my-trips] auth err", err);
      } finally {
        setCheckingUser(false);
      }
    }
    loadUser();
  }, []);

  // Load saved trips
  useEffect(() => {
    if (!user) return;

    async function loadTrips() {
      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("travel_plans")
          .select(
            "id, destination, checkin_date, checkout_date, adults, children, min_budget, max_budget, plan_text, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[my-trips] load trips error", error);
          setError(t("errors.loadTrips", "Failed to load your trips."));
          return;
        }

        setTrips((data || []) as Trip[]);
      } catch (err) {
        console.error(err);
        setError(t("errors.loadTrips", "Failed to load your trips."));
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [user]);

  if (checkingUser) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">
          {t("status.checkingSession", "Checking your session...")}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
        <AppHeader active="my-trips" />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-sm relative overflow-hidden">

          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 text-center shadow-xl relative z-10">

            <div className="w-32 h-32 mx-auto mb-6 relative">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[var(--border-subtle)] bg-white rotate-3">
                <img src="/images/trips-hero.png" alt="Trips" className="w-full h-full object-cover" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-3">
              {t("title", "My Trips")}
            </h1>
            <p className="text-[var(--text-muted)] mb-6 text-center max-w-sm">
              {t(
                "unauth.message",
                "Log in or create a free account to save and view your AI travel plans."
              )}
            </p>
            <Link
              href="/auth"
              className="inline-block px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-sm font-semibold shadow-lg shadow-indigo-500/20"
            >
              {t("unauth.cta", "Go to login / signup")}
            </Link>
          </div>

          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
      <AppHeader active="my-trips" />
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10 text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t("title", "My Trips")}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)]">
                {t(
                  "subtitle",
                  "All the trips you've planned with the Travel Planner."
                )}
              </p>
            </div>
            <Link
              href="/travel"
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs"
            >
              {t("backToTravel", "← Back to Travel Planner")}
            </Link>
          </div>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

          {loading ? (
            <p className="text-[var(--text-muted)] text-sm">
              {t("status.loadingTrips", "Loading your trips...")}
            </p>
          ) : trips.length === 0 ? (
            <div className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-4 text-sm">
              <p className="text-[var(--text-main)] mb-2">
                {t("empty.title", "You don't have any saved trips yet.")}
              </p>
              <p className="text-[var(--text-muted)] text-[13px] mb-3">
                {t(
                  "empty.subtitle",
                  'Use the Travel Planner to generate an AI itinerary, then tap "Save this trip to my account".'
                )}
              </p>
              <Link
                href="/travel"
                className="inline-block px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-body)] hover:opacity-90 text-xs"
              >
                {t("planATrip", "Plan a trip →")}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => {
                const checkin = trip.checkin_date
                  ? new Date(trip.checkin_date).toLocaleDateString()
                  : "—";
                const checkout = trip.checkout_date
                  ? new Date(trip.checkout_date).toLocaleDateString()
                  : "—";

                const nights =
                  trip.checkin_date && trip.checkout_date
                    ? Math.max(
                      1,
                      Math.round(
                        (new Date(trip.checkout_date).getTime() -
                          new Date(trip.checkin_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                      )
                    )
                    : null;

                const isExpanded = expandedId === trip.id;

                return (
                  <div
                    key={trip.id}
                    className="border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold mb-1">
                          {trip.destination || t("trip.unnamed", "Unnamed trip")}
                        </p>
                        <p className="text-[12px] text-[var(--text-muted)]">
                          {checkin} → {checkout}
                          {nights
                            ? ` · ${nights} ${t(
                              nights > 1
                                ? "trip.nightsPlural"
                                : "trip.nightsSingular",
                              nights > 1 ? "nights" : "night"
                            )}`
                            : ""}
                        </p>
                        <p className="text-[12px] text-[var(--text-muted)] mt-1">
                          {trip.adults ?? 0}{" "}
                          {t(
                            (trip.adults ?? 0) === 1
                              ? "trip.adultSingular"
                              : "trip.adultPlural",
                            (trip.adults ?? 0) === 1 ? "adult" : "adults"
                          )}
                          {typeof trip.children === "number" &&
                            ` · ${trip.children} ${t(
                              trip.children === 1
                                ? "trip.childSingular"
                                : "trip.childPlural",
                              trip.children === 1 ? "child" : "children"
                            )}`}
                        </p>

                        {(trip.min_budget || trip.max_budget) && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">
                            {t("trip.budgetLabel", "Budget")}{" "}
                            {trip.min_budget
                              ? t("trip.budgetFrom", "from") + ` €${trip.min_budget}`
                              : ""}
                            {trip.min_budget &&
                              trip.max_budget &&
                              ` ${t("trip.budgetSeparator", "–")} `}
                            {trip.max_budget
                              ? t("trip.budgetTo", "up to") + ` €${trip.max_budget}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : trip.id)
                        }
                        className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[11px]"
                      >
                        {isExpanded
                          ? t("trip.hideDetails", "Hide details")
                          : t("trip.viewDetails", "View details")}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                        <p className="text-[11px] text-[var(--text-muted)] mb-1">
                          {t("trip.savedItineraryLabel", "Saved AI itinerary")}
                        </p>
                        <div className="text-[12px] whitespace-pre-wrap">
                          {trip.plan_text || t("trip.noPlanText", "(no plan text saved)")}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
