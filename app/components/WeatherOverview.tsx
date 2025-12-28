
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/components/LanguageProvider";

type WeatherOverviewProps = {
    destination: string;
    checkin: string; // YYYY-MM-DD
    checkout: string; // YYYY-MM-DD
};

type DailyWeather = {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
};

function getWeatherEmoji(code: number): string {
    // WMO Weather interpretation codes (WW)
    // 0	Clear sky
    // 1, 2, 3	Mainly clear, partly cloudy, and overcast
    // 45, 48	Fog and depositing rime fog
    // 51, 53, 55	Drizzle: Light, moderate, and dense intensity
    // 61, 63, 65	Rain: Slight, moderate and heavy intensity
    // 80, 81, 82	Rain showers: Slight, moderate, and violent
    // 71, 73, 75	Snow fall: Slight, moderate, and heavy intensity
    // 95, 96, 99	Thunderstorm: Slight or moderate

    if (code === 0) return "☀️";
    if (code >= 1 && code <= 3) return "⛅";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 95) return "⚡";
    return "🌤️";
}

export default function WeatherOverview({ destination, checkin, checkout }: WeatherOverviewProps) {
    const { lang } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [daily, setDaily] = useState<DailyWeather | null>(null);
    const [city, setCity] = useState("");

    useEffect(() => {
        // Requirements: destination, valid dates
        if (!destination || !checkin || !checkout) {
            setDaily(null);
            setError("");
            return;
        }

        // Basic date validation (checkin < checkout)
        if (checkin > checkout) return;

        let mounted = true;

        async function fetchWeather() {
            if (!destination || !checkin || !checkout) return; // double check for safety

            setLoading(true);
            setError("");
            try {
                // Use current language for geocoding, default to 'en'
                // Open-Meteo expects 2-char codes usually, or standard codes.
                const currentLang = (lang || "en").split("-")[0];

                // 1. Geocode
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
                        destination
                    )}&count=1&language=${currentLang}&format=json`
                );
                const geoData = await geoRes.json();

                if (!geoData.results || geoData.results.length === 0) {
                    if (mounted) setError("Location not found");
                    return;
                }

                const { latitude, longitude, name, country } = geoData.results[0];
                if (mounted) setCity(`${name}, ${country}`);

                // 2. Weather Forecast
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&start_date=${checkin}&end_date=${checkout}&timezone=auto`;

                const wRes = await fetch(weatherUrl);
                const wData = await wRes.json();

                if (wData.error) {
                    if (mounted) setError("Weather unavailable for these dates");
                    return;
                }

                if (mounted && wData.daily) {
                    setDaily(wData.daily);
                }
            } catch (err) {
                if (mounted) setError("Could not load weather");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        const timeout = setTimeout(fetchWeather, 800); // Debounce typing
        return () => {
            mounted = false;
            clearTimeout(timeout);
        };
    }, [destination, checkin, checkout, lang]);

    if (!destination || !checkin || !checkout) return null;

    return (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-3 flex items-center justify-between">
                <span>Forecast: {city || destination}</span>
                {loading && <span className="text-[10px] opacity-70">Loading...</span>}
            </p>

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            {daily && !loading && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {daily.time.map((dateStr, i) => {
                        const date = new Date(dateStr);
                        const label = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
                        const emoji = getWeatherEmoji(daily.weathercode[i]);
                        const min = Math.round(daily.temperature_2m_min[i]);
                        const max = Math.round(daily.temperature_2m_max[i]);

                        return (
                            <div
                                key={dateStr}
                                className="flex-shrink-0 flex flex-col items-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-2 min-w-[60px]"
                            >
                                <span className="text-[10px] text-[var(--text-muted)] mb-1 whitespace-nowrap">{label}</span>
                                <span className="text-xl mb-1">{emoji}</span>
                                <span className="text-[10px] font-medium">
                                    {max}° <span className="text-[var(--text-muted)]">/ {min}°</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {!daily && !loading && !error && (
                <p className="text-[11px] text-[var(--text-muted)]">Select valid dates to see forecast.</p>
            )}

            <div className="text-[9px] text-[var(--text-muted)] mt-2 text-right opacity-60">
                Data by Open-Meteo.com
            </div>
        </div>
    );
}
