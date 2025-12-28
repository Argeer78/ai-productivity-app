"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from "date-fns";
import AppHeader from "@/app/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import AuthGateModal from "@/app/components/AuthGateModal";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { useT } from "@/lib/useT";
import { getNamedaysForDate } from "@/lib/namedays";
import { calculateBioRhythm, getEnergyLevel } from "@/lib/biorhythm";
import { Battery, BatteryFull, BatteryMedium, BatteryLow } from "lucide-react";

type CalendarTask = {
    id: string;
    title: string;
    due_date: string | null;
    completed: boolean;
    priority: string | null;
};

type CalendarNote = {
    id: string;
    title: string | null;
    content: string | null;
    created_at: string;
    category?: string;
};

type CalendarThread = {
    id: string;
    title: string;
    category: string | null;
    updated_at: string;
    type: "hub" | "companion";
};

type Holiday = {
    date: string;
    localName: string;
    name: string;
    countryCode: string;
    fixed: boolean;
    global: boolean;
};

const COUNTRIES = [
    { code: "GR", name: "Greece" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "CA", name: "Canada" },
];

export default function CalendarPage() {
    const { t } = useT();
    const [user, setUser] = useState<any | null>(null);
    const [checkingUser, setCheckingUser] = useState(true);
    const { open: authOpen, authHref, copy: authCopy, close: closeAuth, requireAuth } = useAuthGate(user);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const [tasks, setTasks] = useState<CalendarTask[]>([]);
    const [notes, setNotes] = useState<CalendarNote[]>([]);
    const [threads, setThreads] = useState<CalendarThread[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(false);
    const [countryCode, setCountryCode] = useState("GR");
    const [birthDate, setBirthDate] = useState<Date | null>(null);

    // Load User & Birth Date
    useEffect(() => {
        async function getUser() {
            const { data } = await supabase.auth.getUser();
            setUser(data?.user ?? null);
            if (data?.user?.user_metadata?.birth_date) {
                setBirthDate(new Date(data.user.user_metadata.birth_date));
            }
            setCheckingUser(false);
        }
        getUser();
    }, []);

    // Fetch Data (Tasks + Notes + Threads)
    useEffect(() => {
        if (!user) return;

        async function fetchData() {
            setLoading(true);
            const start = startOfMonth(currentMonth).toISOString();
            const end = endOfMonth(currentMonth).toISOString();

            // 1. Tasks
            const { data: taskData } = await supabase
                .from("tasks")
                .select("id, title, due_date, completed, priority")
                .eq("user_id", user.id)
                .gte("due_date", start)
                .lte("due_date", end);

            // 2. Notes
            const { data: noteData } = await supabase
                .from("notes")
                .select("id, title, content, created_at, category")
                .eq("user_id", user.id)
                .gte("created_at", start)
                .lte("created_at", end);

            // 3. AI Hub Threads
            const { data: hubData } = await supabase
                .from("ai_chat_threads")
                .select("id, title, category, updated_at")
                .eq("user_id", user.id)
                .gte("updated_at", start)
                .lte("updated_at", end);

            // 4. Companion Threads
            const { data: companionData } = await supabase
                .from("ai_companion_threads")
                .select("id, title, category, updated_at")
                .eq("user_id", user.id)
                .gte("updated_at", start)
                .lte("updated_at", end);

            setTasks((taskData || []) as CalendarTask[]);

            // Cast notes to include category
            setNotes(((noteData || []) as any[]).map(n => ({
                id: n.id,
                title: n.title,
                content: n.content,
                created_at: n.created_at,
                category: n.category
            })) as CalendarNote[]);

            // Combine threads
            const combinedThreads: CalendarThread[] = [
                ...(hubData || []).map((t: any) => ({ ...t, type: "hub" } as CalendarThread)),
                ...(companionData || []).map((t: any) => ({ ...t, type: "companion" } as CalendarThread)),
            ];
            setThreads(combinedThreads);

            setLoading(false);
        }

        fetchData();
    }, [user, currentMonth]);

    // Fetch Holidays
    useEffect(() => {
        async function fetchHolidays() {
            try {
                const year = currentMonth.getFullYear();
                const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
                if (!res.ok) throw new Error("Failed to fetch holidays");
                const data = await res.json();
                setHolidays(data);
            } catch (e) {
                console.error("Holiday fetch error:", e);
                setHolidays([]);
            }
        }
        fetchHolidays();
    }, [currentMonth, countryCode]);

    // Calendar Grid Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    function getItemsForDay(day: Date) {
        const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day));
        const dayNotes = notes.filter(n => isSameDay(parseISO(n.created_at), day));

        // Filter threads by updated_at
        const dayThreads = threads.filter(t => isSameDay(parseISO(t.updated_at), day));

        // Holidays
        const dayHolidays = holidays.filter(h => isSameDay(parseISO(h.date), day));

        // Namedays (Local)
        const dayNamedays = getNamedaysForDate(day, countryCode);

        // BioRhythm
        let bioEnergy = null;
        let BioIcon = Battery;
        if (birthDate) {
            const { average } = calculateBioRhythm(day, birthDate);
            bioEnergy = getEnergyLevel(average);

            if (bioEnergy.label === "High") BioIcon = BatteryFull;
            else if (bioEnergy.label === "Moderate") BioIcon = BatteryMedium;
            else if (bioEnergy.label === "Low") BioIcon = BatteryLow;
            else BioIcon = Battery; // Critical
        }

        return { dayTasks, dayNotes, dayThreads, dayHolidays, dayNamedays, bioEnergy, BioIcon };
    }

    const selectedItems = selectedDate ? getItemsForDay(selectedDate) : { dayTasks: [], dayNotes: [], dayThreads: [], dayHolidays: [], dayNamedays: [], bioEnergy: null, BioIcon: Battery };

    if (checkingUser) {
        return <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center text-[var(--text-muted)] text-sm">Loading...</div>;
    }

    return (
        <main className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col">
            <AppHeader active="calendar" />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Calendar View */}
                <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)] overflow-y-auto">
                    {/* Calendar Header */}
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--border-subtle)]">
                        <h2 className="text-lg font-bold capitalize order-2 sm:order-1">
                            {format(currentMonth, "MMMM yyyy")}
                        </h2>

                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 focus:outline-none"
                            >
                                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                            <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1" />
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-sm"
                                >
                                    ←
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(new Date())}
                                    className="px-3 py-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] rounded-lg text-xs font-medium"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-sm"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)] py-2 bg-[var(--bg-elevated)]/50">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr min-h-[400px]">
                        {calendarDays.map((day, idx) => {
                            const { dayTasks, dayNotes, dayThreads, dayHolidays, dayNamedays, bioEnergy, BioIcon } = getItemsForDay(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isHoliday = dayHolidays.length > 0;

                            // Splitting threads types for counts
                            const hubThreads = dayThreads.filter(t => t.type === "hub");
                            const companionThreads = dayThreads.filter(t => t.type === "companion");

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                      border-b border-r border-[var(--border-subtle)] p-2 min-h-[80px] cursor-pointer transition-colors relative flex flex-col
                      ${!isCurrentMonth ? "bg-[var(--bg-subtle)] text-[var(--text-muted)]" : "bg-[var(--bg-card)]"}
                      ${isSelected ? "ring-2 ring-inset ring-[var(--accent)] z-10" : "hover:bg-[var(--bg-elevated)]"}
                   `}
                                >
                                    <div className={`text-xs font-medium mb-1 flex justify-between items-start`}>
                                        <span className={`${isToday(day) ? "bg-[var(--accent)]/10 text-[var(--accent)] px-1.5 py-0.5 rounded-full" : ""}`}>{format(day, "d")}</span>
                                        {/* Holiday Icon */}
                                        {isHoliday && <span title={dayHolidays[0].localName} className="text-[10px] select-none">🎉</span>}
                                        {/* BioRhythm Battery */}
                                        {bioEnergy && !isHoliday && (
                                            <div className={bioEnergy.color} title={`Energy: ${bioEnergy.label}`}>
                                                <BioIcon size={12} className="opacity-80" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1 mt-auto">
                                        {/* Namedays (Truncated) */}
                                        {dayNamedays.length > 0 && (
                                            <div className="text-[9px] text-[var(--text-muted)] truncate leading-tight opacity-80">
                                                {dayNamedays.slice(0, 2).join(", ")}{dayNamedays.length > 2 ? "..." : ""}
                                            </div>
                                        )}

                                        {/* Counts */}
                                        {dayTasks.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-600 px-1 rounded truncate w-fit max-w-full">
                                                <span>✓</span> {dayTasks.length}
                                            </div>
                                        )}
                                        {dayNotes.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-600 px-1 rounded truncate w-fit max-w-full">
                                                <span>📝</span> {dayNotes.length}
                                            </div>
                                        )}
                                        {/* Threads Indicators */}
                                        {hubThreads.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] bg-indigo-500/10 text-indigo-600 px-1 rounded truncate w-fit max-w-full">
                                                <span>🤖</span> {hubThreads.length}
                                            </div>
                                        )}
                                        {companionThreads.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] bg-rose-500/10 text-rose-600 px-1 rounded truncate w-fit max-w-full">
                                                <span>💛</span> {companionThreads.length}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Details Panel */}
                <div className="w-full lg:w-80 bg-[var(--bg-elevated)] border-l border-[var(--border-subtle)] flex flex-col h-[40vh] lg:h-auto overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col gap-1">
                        <h3 className="font-semibold text-sm">
                            {selectedDate ? format(selectedDate, "EEEE, MMMM do") : "Select a date"}
                        </h3>
                        {selectedDate && <p className="text-xs text-[var(--text-muted)]">{format(selectedDate, "yyyy")}</p>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {!selectedDate ? (
                            <p className="text-xs text-[var(--text-muted)]">Select a date to view items.</p>
                        ) : (
                            <>
                                {/* BioRhythm Section */}
                                {selectedItems.bioEnergy && (
                                    <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-wider mb-1">Energy Potential</div>
                                            <div className={`text-sm font-semibold flex items-center gap-1 ${selectedItems.bioEnergy.color}`}>
                                                <selectedItems.BioIcon size={16} /> {selectedItems.bioEnergy.label}
                                            </div>
                                        </div>
                                        <button
                                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] underline"
                                            onClick={() => {/* Maybe navigate to settings to change birthdate */ }}
                                        >
                                            Info
                                        </button>
                                    </div>
                                )}

                                {/* Holidays & Namedays */}
                                {(selectedItems.dayHolidays.length > 0 || selectedItems.dayNamedays.length > 0) && (
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 tracking-wider">Celebrations</h4>
                                        <div className="space-y-2">
                                            {selectedItems.dayHolidays.map((h, i) => (
                                                <div key={i} className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-2 rounded text-sm">
                                                    🎉 {h.localName}
                                                </div>
                                            ))}
                                            {selectedItems.dayNamedays.length > 0 && (
                                                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400 p-2 rounded text-sm">
                                                    🎈 <span className="font-medium">Nameday:</span> {selectedItems.dayNamedays.join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tasks Section */}
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 tracking-wider">Tasks</h4>
                                    {selectedItems.dayTasks.length === 0 ? (
                                        <p className="text-xs text-[var(--text-muted)] italic">No tasks due.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedItems.dayTasks.map(task => (
                                                <div key={task.id} className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-subtle)] text-sm flex gap-2">
                                                    <input type="checkbox" checked={task.completed} readOnly className="mt-1" />
                                                    <div className={task.completed ? "line-through text-[var(--text-muted)]" : ""}>
                                                        {task.title || "Untitled Task"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notes Section */}
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 tracking-wider">Notes & Journals</h4>
                                    {selectedItems.dayNotes.length === 0 ? (
                                        <p className="text-xs text-[var(--text-muted)] italic">No notes.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedItems.dayNotes.map(note => (
                                                <div key={note.id} className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border-subtle)] text-sm">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {/* Category badge */}
                                                        {note.category && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                                                {note.category}
                                                            </span>
                                                        )}
                                                        <span className="font-medium truncate flex-1">{note.title || "Untitled Note"}</span>
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)] line-clamp-2">{note.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* AI Threads Section */}
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 tracking-wider">AI Conversations</h4>
                                    {selectedItems.dayThreads.length === 0 ? (
                                        <p className="text-xs text-[var(--text-muted)] italic">No activity.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedItems.dayThreads.map(thread => (
                                                <div key={thread.id} className={`bg-[var(--bg-card)] p-2 rounded border border-[var(--border-subtle)] text-sm flex items-center gap-2 ${thread.type === 'companion' ? 'border-l-4 border-l-rose-400' : 'border-l-4 border-l-indigo-400'}`}>
                                                    <span className="text-lg">
                                                        {thread.type === 'companion' ? '💛' : '🤖'}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="font-medium truncate">{thread.title || "New Chat"}</div>
                                                        <div className="text-[10px] text-[var(--text-muted)]">
                                                            {thread.type === 'companion' ? 'AI Companion' : 'AI Hub'} • {format(parseISO(thread.updated_at), "HH:mm")}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <AuthGateModal open={authOpen} onClose={closeAuth} authHref={authHref} copy={authCopy} />
        </main>
    );
}
