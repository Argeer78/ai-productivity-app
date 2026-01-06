"use client";

import { useDemo } from "@/app/context/DemoContext";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DemoBanner() {
    const { isDemoMode, endDemo } = useDemo();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted || !isDemoMode) return null;

    return (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-md relative z-50">
            <div className="flex items-center gap-2">
                <span className="text-lg">🧪</span>
                <span>
                    <strong className="hidden md:inline">Demo Mode Active.</strong> Data is temporary and will be lost on exit.
                </span>
            </div>

            <div className="flex items-center gap-3">
                <Link
                    href="/auth?signup=true"
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                    Create Free Account
                </Link>
                <button
                    onClick={endDemo}
                    className="opacity-70 hover:opacity-100 text-[10px] underline ml-2"
                >
                    Exit
                </button>
            </div>
        </div>
    );
}
