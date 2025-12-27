"use client";

import { useEffect, useState } from "react";
import { useSound } from "@/lib/sound";

export default function SoundToggle({ className = "" }: { className?: string }) {
    const sound = useSound();
    const [enabled, setEnabled] = useState(true);

    // Sync with global state on mount
    useEffect(() => {
        setEnabled(sound.isEnabled());
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.checked;
        setEnabled(val);
        sound.toggle(val);
        if (val) sound.play("toggle");
    };

    return (
        <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
            <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={handleChange}
            />
            <div className="w-9 h-5 bg-[var(--border-subtle)] border border-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:after:bg-white peer-checked:after:border-white"></div>
        </label>
    );
}
