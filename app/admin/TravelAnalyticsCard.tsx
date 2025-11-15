// app/admin/TravelAnalyticsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TravelStats = {
  totalClicks7d: number;
  stayClicks7d: number;
  flightClicks7d: number;
  carClicks7d: number;
  topDestinations7d: { destination: string; count: number }[];
};

export default function TravelAnalyticsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState<TravelStats | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const fromISO = sevenDaysAgo.toISOString();

        const { data, error } = await supabase
          .from("travel_clicks")
          .select("click_type, destination, created_at")
          .gte("created_at", fromISO);

        if (error) {
          console.error("[admin/travel] load error", error);
          setError("Failed to load travel analytics.");
          setLoading(false);
          return;
        }

        const rows =
          (data || []) as {
            click_type: "stay" | "flight" | "car" | string | null;
            destination: string | null;
            created_at: string;
          }[];

        const totalClicks7d = rows.length;

        let stayClicks7d = 0;
        let flightClicks7d = 0;
        let carClicks7d = 0;

        const destCounts: Record<string, number> = {};

        for (const r of rows) {
          const type = r.click_type || "";
          if (type === "stay") stayClicks7d++;
          else if (type === "flight") flightClicks7d++;
          else if (type === "car") carClicks7d++;

          const dest = (r.destination || "").trim();
          if (dest) {
            destCounts[dest] = (destCounts[dest] || 0) + 1;
          }
        }

        const topDestinations7d = Object.entries(destCounts)
          .map(([destination, count]) => ({ destination, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setStats({
          totalClicks7d,
          stayClicks7d,
          flightClicks7d,
          carClicks7d,
          topDestinations7d,
        });
      } catch (err) {
        console.error("[admin/travel] unexpected error", err);
        setError("Failed to load travel analytics.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-slate-400">
          TRAVEL ANALYTICS (7 DAYS)
        </p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          beta
        </span>
      </div>

      {loading ? (
        <p className="text-[12px] text-slate-300">Loading travel data…</p>
      ) : error ? (
        <p className="text-[12px] text-red-400">{error}</p>
      ) : !stats || stats.totalClicks7d === 0 ? (
        <p className="text-[12px] text-slate-400">
          No travel clicks tracked in the last 7 days.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3 text-[12px]">
            <div>
              <p className="text-slate-400 text-[11px] mb-0.5">
                Total clicks
              </p>
              <p className="text-base font-semibold">
                {stats.totalClicks7d}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] mb-0.5">
                Stays / Flights
              </p>
              <p className="text-base font-semibold">
                {stats.stayClicks7d} / {stats.flightClicks7d}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] mb-0.5">
                Car rentals
              </p>
              <p className="text-base font-semibold">
                {stats.carClicks7d}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 mt-1">
            <p className="text-[11px] text-slate-400 mb-1">
              Top destinations (7d)
            </p>
            {stats.topDestinations7d.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No destinations recorded yet.
              </p>
            ) : (
              <ul className="space-y-1 text-[11px] text-slate-200">
                {stats.topDestinations7d.map((d) => (
                  <li
                    key={d.destination}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate max-w-[140px]">
                      {d.destination}
                    </span>
                    <span className="text-slate-400">× {d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
