"use client";

import { motion } from "framer-motion";

export default function BreathingCircle({ isPaused }: { isPaused: boolean }) {
    if (isPaused) {
        return (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="w-[600px] h-[600px] rounded-full bg-[var(--accent)] opacity-5 blur-[100px] transition-all duration-1000" />
            </div>
        )
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {/* Outer Ring */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[var(--accent)] to-indigo-400 blur-[120px]"
            />

            {/* Inner Breathing Core */}
            <motion.div
                animate={{
                    scale: [1, 1.35, 1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut", // 4s inhale, 4s exhale roughly
                }}
                className="w-[500px] h-[500px] rounded-full bg-[var(--accent)] blur-[80px]"
            />

            {/* Text Helper (Optional - can be distracting, I'll keep it purely visual for Zen) */}
        </div>
    );
}
