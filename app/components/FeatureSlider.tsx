
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useT } from "@/lib/useT";

type Slide = {
    id: string;
    image: string;
    title: string;
    description: string;
};

// Placeholder data - User should replace images in public/screenshots/
const DEFAULT_SLIDES: Slide[] = [
    {
        id: "1",
        image: "/images/features/dashboard.png",
        title: "Smart Dashboard",
        description: "Get a clear daily overview with weather, focus stats, and your bio-rhythm.",
    },
    {
        id: "2",
        image: "/images/features/planner.png",
        title: "AI Planner",
        description: "Let AI organize your day based on your goals and energy levels.",
    },
    {
        id: "3",
        image: "/images/features/reports.png",
        title: "Weekly Reports",
        description: "Receive insightful weekly summaries of your productivity and achievements.",
    },
    {
        id: "4",
        image: "/images/features/travel.png",
        title: "Travel Mode",
        description: "Plan entire trips with AI suggestions for flights, hotels, and itineraries.",
    },
    {
        id: "5",
        image: "/images/features/focus.png",
        title: "Focus Mode",
        description: "Eliminate distractions with our built-in focus timer and ambient sounds.",
    }
];

export default function FeatureSlider() {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const { t } = useT();

    const slides = DEFAULT_SLIDES;

    // Auto-play
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isPaused, slides.length]);

    const nextSlide = () => setIndex((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length);

    return (
        <section className="py-20 overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-main)] to-[var(--text-muted)]">
                        {t("slider.title", "Experience the Future")}
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
                        {t("slider.subtitle", "A tour of the productivity tools that verify the hype.")}
                    </p>
                </div>

                {/* 3D Slider Container */}
                <div
                    className="relative h-[300px] md:h-[500px] flex items-center justify-center perspective-[1000px]"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <AnimatePresence initial={false} mode="popLayout">
                        {slides.map((slide, i) => {
                            // Calculate relative position to active index
                            // We want to show standard carousel: prev, active, next
                            // But handle wrapping logic is complex for 3D stack.
                            // Easier to just render active and let others fade out or standard stack?

                            // Let's use a smarter layout: only render active, previous, and next?
                            // Or render all but position them based on distance from index.

                            const offset = (i - index + slides.length) % slides.length;
                            // offset 0 = active
                            // offset 1 = next
                            // offset 4 (length-1) = prev

                            // Simplification for 3D stack:
                            // Just use absolute positioning state based on `i === index`

                            let position = "hidden";
                            let zIndex = 0;
                            let opacity = 0;
                            let x = 0;
                            let scale = 0.8;
                            let rotateY = 0;

                            if (i === index) {
                                position = "active";
                                zIndex = 10;
                                opacity = 1;
                                x = 0;
                                scale = 1;
                                rotateY = 0;
                            } else if (i === (index + 1) % slides.length) {
                                position = "next";
                                zIndex = 5;
                                opacity = 0.6;
                                x = 300; // Desktop
                                scale = 0.8;
                                rotateY = -15;
                            } else if (i === (index - 1 + slides.length) % slides.length) {
                                position = "prev";
                                zIndex = 5;
                                opacity = 0.6;
                                x = -300;
                                scale = 0.8;
                                rotateY = 15;
                            } else {
                                // Hidden deep behind
                                zIndex = 0;
                                opacity = 0;
                                scale = 0.5;
                            }

                            // Adjust for mobile
                            // On mobile, maybe just x translate without 3D rotation or smaller offsets

                            return (
                                <motion.div
                                    key={slide.id}
                                    className="absolute rounded-xl shadow-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                                    initial={false}
                                    animate={{
                                        opacity,
                                        zIndex,
                                        x: position === "hidden" ? 0 : x,
                                        scale,
                                        rotateY
                                    }}
                                    transition={{
                                        duration: 0.6,
                                        ease: "easeInOut"
                                    }}
                                    style={{
                                        width: "80%", // responsive width
                                        maxWidth: "800px",
                                        aspectRatio: "16/9",
                                        transformStyle: "preserve-3d", // important for 3D
                                    }}
                                >
                                    <div className="relative w-full h-full bg-slate-900/50 flex items-center justify-center">
                                        {/* Fallback pattern if image is missing */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-body)] flex items-center justify-center text-[var(--text-muted)]">
                                            <span className="text-4xl opacity-20 font-bold">{i + 1}</span>
                                        </div>

                                        <Image
                                            src={slide.image}
                                            alt={slide.title}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                            onError={(e) => {
                                                // Hide broken image icon if possible, or just let the fallback div show behind it
                                                e.currentTarget.style.opacity = "0";
                                            }}
                                        />

                                        {/* Overlay gradient for text readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                                        {position === "active" && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFullscreenImage(slide.image);
                                                }}
                                                className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur rounded-full text-white/70 hover:text-white transition z-20"
                                            >
                                                <Maximize2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Controls - Overlaid on sides */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 md:left-10 z-20 p-3 rounded-full bg-[var(--bg-elevated)]/80 backdrop-blur border border-[var(--border-subtle)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] transition shadow-lg"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-4 md:right-10 z-20 p-3 rounded-full bg-[var(--bg-elevated)]/80 backdrop-blur border border-[var(--border-subtle)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] transition shadow-lg"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Text Description - Syncs with active index */}
                <div className="mt-8 text-center h-24 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0"
                        >
                            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">
                                {slides[index].title}
                            </h3>
                            <p className="text-[var(--text-muted)] max-w-lg mx-auto">
                                {slides[index].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center gap-2 mt-4">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-[var(--accent)]" : "bg-[var(--border-strong)] hover:bg-[var(--text-muted)]"
                                }`}
                        />
                    ))}
                </div>
                {/* Lightbox Modal */}
                <AnimatePresence>
                    {fullscreenImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setFullscreenImage(null)}
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                        >
                            <button
                                onClick={() => setFullscreenImage(null)}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                            >
                                <X className="w-8 h-8" />
                            </button>

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black"
                            >
                                <Image
                                    src={fullscreenImage}
                                    alt="Full view"
                                    fill
                                    unoptimized
                                    className="object-contain"
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
