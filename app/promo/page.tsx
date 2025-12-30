
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Play, Pause, Square, Smartphone, Monitor, Instagram, Youtube, Facebook, RefreshCw, Video, Download, X, Save } from "lucide-react";

// The screenshots to use (original UI)
const SLIDES = [
    {
        id: "1",
        image: "/screenshots/screen1.png",
        title: "Your Daily Command Center",
        subtitle: "Everything you need to win the day",
        color: "from-blue-500 to-cyan-500"
    },
    {
        id: "2",
        image: "/screenshots/screen2.png",
        title: "AI-Powered Planning",
        subtitle: "Let AI organize your schedule instantly",
        color: "from-purple-500 to-pink-500"
    },
    {
        id: "3",
        image: "/screenshots/screen3.png",
        title: "Visualize Success",
        subtitle: "Weekly reports and deep insights",
        color: "from-amber-400 to-orange-500"
    },
    {
        id: "4",
        image: "/screenshots/screen4.png",
        title: "Travel Smart",
        subtitle: "Itineraries, flights, and hotels in one tap",
        color: "from-emerald-400 to-teal-500"
    },
    {
        id: "5",
        image: "/screenshots/screen5.png",
        title: "Focus Mode",
        description: "Block distractions and enter flow state", // Note: irregular key 'description' -> 'subtitle' mapping logic needed or strict type
        subtitle: "Block distractions and enter flow state",
        color: "from-indigo-500 to-blue-600"
    }
];

type AspectRatio = "16:9" | "9:16" | "1:1";

export default function PromoStudioPage() {
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Sequence Timer & Auto-Stop Recording
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= SLIDES.length - 1) {
                    setIsPlaying(false);
                    if (isRecording) {
                        stopRecording();
                    }
                    return 0;
                }
                return prev + 1;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [isPlaying, isRecording]);

    const startRecording = async () => {
        try {
            // Prompt user to select screen - suggest "This Tab"
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 60 } as any,
                audio: true
            });

            const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                setRecordedVideoUrl(url); // Trigger Preview Modal

                setIsRecording(false);
                setIsPlaying(false);

                // Stop all tracks to clear the sharing indicator
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setCurrentIndex(0); // Reset
            setIsPlaying(true); // Start Playing

        } catch (err) {
            console.error("Recording cancelled or failed", err);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    };

    const saveVideo = () => {
        if (!recordedVideoUrl) return;
        const a = document.createElement("a");
        a.href = recordedVideoUrl;
        a.download = `promo-video-${new Date().getTime()}.webm`;
        a.click();
        setRecordedVideoUrl(null); // Close modal after save
    };

    const discardVideo = () => {
        setRecordedVideoUrl(null);
    };

    const reset = () => {
        setIsPlaying(false);
        setCurrentIndex(0);
    };

    // Container sizing based on Aspect Ratio
    const getContainerStyle = () => {
        switch (aspectRatio) {
            case "16:9": return "w-[800px] h-[450px]";
            case "9:16": return "w-[400px] h-[711px]"; // roughly 9:16
            case "1:1": return "w-[600px] h-[600px]";
            default: return "w-[800px] h-[450px]";
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-10">

            {/* TOOLBAR */}
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl mr-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Promo Studio</h1>

                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setAspectRatio("16:9")}
                            className={`p-2 rounded-md transition ${aspectRatio === "16:9" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                            title="YouTube / Web (16:9)"
                        >
                            <Youtube className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setAspectRatio("9:16")}
                            className={`p-2 rounded-md transition ${aspectRatio === "9:16" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                            title="TikTok / Reels / Shorts (9:16)"
                        >
                            <Smartphone className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setAspectRatio("1:1")}
                            className={`p-2 rounded-md transition ${aspectRatio === "1:1" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                            title="Instagram Post (1:1)"
                        >
                            <Instagram className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={reset}
                        className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition"
                        title="Reset"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            className="px-6 py-2 rounded-full font-bold flex items-center gap-2 transition bg-white text-black hover:bg-gray-200"
                            title="Record & Download Video"
                        >
                            <Download className="w-5 h-5" />
                            Record & Save
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="px-6 py-2 rounded-full font-bold flex items-center gap-2 transition bg-red-600 text-white animate-pulse"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            Recording...
                        </button>
                    )}

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition ${isPlaying ? "bg-slate-700 text-slate-300" : "bg-emerald-500 hover:bg-emerald-600"
                            }`}
                    >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        {isPlaying ? "Pause" : "Preview"}
                    </button>
                </div>
            </div>

            {/* STAGE */}
            <div className="flex-1 flex items-center justify-center p-10 bg-grid-slate-800/[0.2] overflow-hidden w-full relative">

                {/* SAFE ZONE BORDER (Visual guide for recording) */}
                <div
                    className={`${getContainerStyle()} relative bg-black shadow-2xl overflow-hidden transition-all duration-500 ring-4 ring-slate-800`}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0"
                        >
                            {/* Background Gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${SLIDES[currentIndex].color} opacity-20`} />

                            {/* Content Layout */}
                            <div className={`relative w-full h-full flex ${aspectRatio === "9:16" ? "flex-col items-center justify-end pb-8" : "flex-row items-center justify-between px-16"}`}>

                                {/* Text Content */}
                                <div className={`${aspectRatio === "9:16" ? "text-center mb-8 px-8 order-2 z-10" : "max-w-xs z-10"}`}>
                                    <motion.h2
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className={`font-black uppercase tracking-tighter text-white drop-shadow-lg ${aspectRatio === "9:16" ? "text-4xl mb-4" : "text-5xl mb-6"}`}
                                    >
                                        {SLIDES[currentIndex].title}
                                    </motion.h2>
                                    <motion.p
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-lg text-white/90 font-medium bg-black/30 backdrop-blur-sm p-3 rounded-xl inline-block"
                                    >
                                        {SLIDES[currentIndex].subtitle}
                                    </motion.p>
                                </div>

                                {/* Phone Frame Mockup */}
                                <motion.div
                                    initial={{ x: 100, opacity: 0, rotateY: 15 }}
                                    animate={{ x: 0, opacity: 1, rotateY: -5 }}
                                    transition={{ type: "spring", damping: 20 }}
                                    className={`relative z-0 ${aspectRatio === "9:16" ? "h-[85%] aspect-[9/19.5] mb-4" : "h-[90%] aspect-[9/19.5]"}`}
                                >
                                    <div className="absolute inset-0 bg-black rounded-[2.5rem] border-8 border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/20">
                                        {/* Notch */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20" />

                                        {/* Screen */}
                                        <div className="w-full h-full relative bg-slate-900">
                                            <Image
                                                src={SLIDES[currentIndex].image}
                                                alt="Screen"
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>
                                    {/* Reflection */}
                                    <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-10" />
                                </motion.div>

                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Persistent Logo Watermark */}
                    <div className="absolute top-6 left-6 flex items-center gap-3 z-50">
                        <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                            <Image src="/logo-rounded.png" width={24} height={24} alt="Logo" unoptimized className="rounded" />
                        </div>
                        <span className="font-bold tracking-wide text-sm opacity-80 backdrop-blur-md px-2 py-1 rounded bg-black/20">AIPRoductivity.app</span>
                    </div>
                </div>

                <div className="absolute bottom-4 text-slate-500 text-xs">
                    * Use screen recording software (OBS/QuickTime) to capture the viewport above.
                </div>
            </div>
            {/* PREVIEW MODAL */}
            <AnimatePresence>
                {recordedVideoUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-4xl w-full flex flex-col items-center">
                            <h2 className="text-2xl font-bold mb-4">Preview Recording</h2>

                            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 border border-slate-700">
                                <video
                                    src={recordedVideoUrl}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={discardVideo}
                                    className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition bg-slate-800 text-white hover:bg-slate-700 hover:text-red-400"
                                >
                                    <X className="w-5 h-5" />
                                    Discard
                                </button>
                                <button
                                    onClick={saveVideo}
                                    className="px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/20"
                                >
                                    <Save className="w-5 h-5" />
                                    Save Video
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
