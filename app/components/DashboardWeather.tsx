
"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/useT";
import { useLanguage } from "@/app/components/LanguageProvider";

type DailyWeather = {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    windspeed_10m_max: number[];
};

function getWeatherEmoji(code: number): string {
    if (code === 0) return "☀️";
    if (code >= 1 && code <= 3) return "⛅";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 95) return "⚡";
    return "🌤️";
}

function getProductivityTip(code: number, tempMax: number, t: (key: string, def: string) => string): string {
    if (code >= 95) return t("weather.tip.stormy", "Stormy vibes! ⚡ Perfect for deep focus indoors.");
    if (code >= 51) return t("weather.tip.rainy", "Rainy day? 🌧️ Great for clearing your inbox with a hot drink.");
    if (code === 0 || code === 1) return t("weather.tip.sunny", "Sunny & clear! ☀️ Go for a walk to recharge your creativity.");
    if (tempMax > 30) return t("weather.tip.hot", "It's hot out! 🥵 Stay hydrated and tackle hard tasks early.");
    if (tempMax < 5) return t("weather.tip.cold", "Chilly outside! ❄️ Wrap up warm and focus on big goals.");
    return t("weather.tip.stable", "Stable weather today. ☁️ Good day for steady progress.");
}

export default function DashboardWeather() {
    const { t } = useT();
    const { lang } = useLanguage();
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [daily, setDaily] = useState<DailyWeather | null>(null);
    const [loading, setLoading] = useState(true); // start loading immediately
    const [error, setError] = useState("");
    const [denied, setDenied] = useState(false);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("Geolocation not supported");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            },
            (err) => {
                console.error("Geo error", err);
                if (err.code === 1) setDenied(true); // Permission denied
                setLoading(false);
            }
        );
    }, []);

    useEffect(() => {
        if (!coords) return;

        async function fetchWeather() {
            setLoading(true);
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords!.lat}&longitude=${coords!.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max&timezone=auto&forecast_days=7`;

                const res = await fetch(url);
                const data = await res.json();

                if (data.daily) {
                    setDaily(data.daily);
                }
            } catch (err) {
                console.error("Weather load error", err);
                setError("Could not load weather");
            } finally {
                setLoading(false);
            }
        }

        fetchWeather();
    }, [coords]);

    if (denied) {
        return (
            <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[11px] text-center">
                <span className="opacity-70">📍 {t("weather.enableLocation", "Enable location for local weather")}</span>
            </div>
        );
    }

    if (loading && !daily) {
        return (
            <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[11px] text-center">
                {t("weather.loading", "Loading weather...")}
            </div>
        );
    }

    if (!daily) return null;

    const todayTip = getProductivityTip(daily.weathercode[0], daily.temperature_2m_max[0], t);

    return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 overflow-hidden relative">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    {t("weather.title", "Local Forecast")}
                </h3>
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                    {t("weather.days", "7 Days")}
                </span>
            </div>

            <div className="mb-4 flex items-start gap-2 p-2.5 rounded-xl bg-[var(--accent-soft)]/30 border border-[var(--accent)]/20">
                <span className="text-base">💡</span>
                <p className="text-xs text-[var(--text-main)] leading-relaxed">
                    <span className="font-semibold text-[var(--accent)]">{t("weather.tipPrefix", "Tip:")}</span> {todayTip}
                </p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {daily.time.map((tItem, i) => {
                    const date = new Date(tItem);
                    const dayName = i === 0 ? t("weather.today", "Today") : date.toLocaleDateString(lang, { weekday: "short" });
                    const emoji = getWeatherEmoji(daily.weathercode[i]);
                    const maxIdx = Math.round(daily.temperature_2m_max[i]);
                    const minIdx = Math.round(daily.temperature_2m_min[i]);
                    const wind = Math.round(daily.windspeed_10m_max[i]);

                    return (
                        <div key={tItem} className="flex-shrink-0 flex flex-col items-center min-w-[64px] p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                            <span className={`text-[10px] mb-1 whitespace-nowrap ${i === 0 ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                                {dayName}
                            </span>
                            <span className="text-2xl mb-1.5">{emoji}</span>
                            <div className="flex items-end gap-1 mb-1">
                                <span className="text-sm font-semibold">{maxIdx}°</span>
                                <span className="text-[10px] text-[var(--text-muted)] opacity-80">{minIdx}°</span>
                            </div>
                            <div className="flex items-center gap-1 mt-auto pt-1 border-t border-[var(--border-subtle)] w-full justify-center">
                                <span className="text-[9px] text-[var(--text-muted)]">💨 {wind}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="text-[9px] text-[var(--text-muted)] mt-2 text-right opacity-60">
                Data: Open-Meteo
            </div>
        </div>
    );
}
