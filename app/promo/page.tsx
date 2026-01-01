
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Play, Pause, Square, Smartphone, Monitor, Instagram, Youtube, Facebook, RefreshCw, Video, Download, X, Save, Music, Upload, Music2, Layers, MousePointer2 } from "lucide-react";

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
    const mimeTypeRef = useRef<string>("video/webm"); // Default fallback

    // Demo Mode State
    const [demoMode, setDemoMode] = useState<"slides" | "live">("slides");

    // Audio State
    const [musicTrack, setMusicTrack] = useState<string | null>(null);
    const [musicName, setMusicName] = useState<string>("No Audio");
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Coding Refs for Cropping
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const sourceStreamRef = useRef<MediaStream | null>(null);

    // Sequence Timer & Auto-Stop Recording
    useEffect(() => {
        if (!isPlaying || demoMode === "live") return;

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
        return () => clearInterval(interval);
    }, [isPlaying, isRecording]);

    // Audio Sync Effect
    useEffect(() => {
        if (isPlaying && musicTrack && audioRef.current) {
            audioRef.current.volume = 1.0;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        } else if (!isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [isPlaying, musicTrack]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setMusicTrack(url);
            setMusicName(file.name.substring(0, 15) + "...");
        }
    };

    const startRecording = async () => {
        try {
            // 1. Capture the Tab (Best effort to get current tab)
            // 1. Capture the Tab (Best effort to get current tab)
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "browser",
                    frameRate: 30, // Reduced to 30fps to prevent audio/video desync and CPU overload
                } as any,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                },
                preferCurrentTab: true, // Experimental hint
            } as any);

            // 2. Play the raw stream in a hidden video element to "decode" it for the canvas
            const video = document.createElement("video");
            video.srcObject = stream;
            video.muted = true;
            await video.play();

            // 3. Set up the Canvas for Cropping
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { alpha: false }); // optimization
            if (!ctx) throw new Error("No canvas context");

            // We need to calculate the crop area based on the DOM element
            const updateCanvasDrawing = () => {
                if (!containerRef.current || video.ended || video.paused) return;

                const rect = containerRef.current.getBoundingClientRect();

                // Set canvas size to the *output* size (the container size)
                // We do this once or dynamically? Dynamically if window resizes, but let's assume static for recording.
                if (canvas.width !== rect.width || canvas.height !== rect.height) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                }

                // Calculate scale in case screen capture assumes high-DPI or different zoom
                // "video.videoWidth" is the actual stream resolution
                // "window.innerWidth" is the DOM viewport resolution
                // Usually stream matches viewport, but let's be safe:
                const scaleX = video.videoWidth / window.innerWidth;
                const scaleY = video.videoHeight / window.innerHeight;

                // Crop!
                // source x/y = rect.x * scale
                // source w/h = rect.width * scale
                // dest x/y = 0, 0
                // dest w/h = rect.width, rect.height

                try {
                    ctx.drawImage(
                        video,
                        rect.x * scaleX, rect.y * scaleY, rect.width * scaleX, rect.height * scaleY, // Source (Crop)
                        0, 0, rect.width, rect.height // Destination (Full Canvas)
                    );
                } catch (e) {
                    // ignore occasional draw errors
                }

                animationFrameRef.current = requestAnimationFrame(updateCanvasDrawing);
            };

            // Start the loop
            updateCanvasDrawing();

            // 4. Create a stream from the canvas
            const canvasStream = canvas.captureStream(30);

            // 5. Merge Audio from the original stream (if any)
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log(`Adding ${audioTracks.length} audio tracks to recording.`);
            } else {
                console.warn("No audio tracks found in source stream. Recording will be silent.");
            }

            // Combine into a single stream explicitly
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioTracks
            ]);

            sourceStreamRef.current = stream;

            // 6. Start Recording the COMBINED stream
            // Detect best format
            const mimeType = [
                "video/mp4;codecs=avc1,mp4a.40.2",
                "video/mp4",
                "video/webm;codecs=vp9,opus"
            ].find(type => MediaRecorder.isTypeSupported(type)) || "video/webm";

            mimeTypeRef.current = mimeType;

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 5000000,
                audioBitsPerSecond: 192000 // 192kbps High Quality Audio
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
                const url = URL.createObjectURL(blob);
                setRecordedVideoUrl(url);

                stopRecording(); // Cleanup refs
            };

            // Detect if user clicks "Stop Sharing" on the browser native bar
            stream.getVideoTracks()[0].onended = () => {
                if (isRecording) stopRecording();
            };

            // Start Audio immediately (before recorder) to ensure sync
            if (musicTrack && audioRef.current) {
                audioRef.current.currentTime = 0;
                await audioRef.current.play().catch(e => console.error("Pre-start audio play failed", e));
            }

            mediaRecorder.start();
            setIsRecording(true);

            // Only force slide reset if we are in slide mode
            if (demoMode === "slides") {
                setCurrentIndex(0);
            }

            setIsPlaying(true);

        } catch (err) {
            console.error("Recording cancelled or failed", err);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setIsPlaying(false);

        // Stop the recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        // Cancel frame loop
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Stop the source stream strictly (removes "Sharing" bar)
        if (sourceStreamRef.current) {
            sourceStreamRef.current.getTracks().forEach(track => track.stop());
            sourceStreamRef.current = null;
        }
    };

    const saveVideo = () => {
        if (!recordedVideoUrl) return;
        const a = document.createElement("a");
        a.href = recordedVideoUrl;
        const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
        a.download = `promo-video-${new Date().getTime()}.${ext}`;
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

                    {/* MODE TOGGLE */}
                    <div className="flex bg-slate-800 rounded-lg p-1 items-center">
                        <button
                            onClick={() => setDemoMode("slides")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${demoMode === "slides" ? "bg-slate-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Slides
                        </button>
                        <button
                            onClick={() => setDemoMode("live")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${demoMode === "live" ? "bg-red-500/20 text-red-200 border border-red-500/30" : "text-slate-400 hover:text-white"}`}
                        >
                            <MousePointer2 className="w-3.5 h-3.5" />
                            Live App
                        </button>
                    </div>

                    {/* MUSIC SELECTOR */}
                    <div className="flex bg-slate-800 rounded-lg p-1 items-center gap-2 px-2">
                        <Music2 className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-300 w-24 truncate">{musicName}</span>

                        <div className="h-4 w-[1px] bg-slate-700 mx-1" />

                        <button
                            onClick={() => { setMusicTrack(null); setMusicName("No Audio"); }}
                            className={`text-[10px] px-2 py-1 rounded ${!musicTrack ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`}
                        >
                            Off
                        </button>
                        <button
                            onClick={() => { setMusicTrack("/sounds/rain.ogg"); setMusicName("Ambience: Rain"); }}
                            className={`text-[10px] px-2 py-1 rounded ${musicName.includes("Rain") ? "bg-blue-900/50 text-blue-200" : "text-slate-400 hover:text-white"}`}
                        >
                            Rain
                        </button>
                        <button
                            onClick={() => { setMusicTrack("/sounds/river.ogg"); setMusicName("Ambience: River"); }}
                            className={`text-[10px] px-2 py-1 rounded ${musicName.includes("River") ? "bg-emerald-900/50 text-emerald-200" : "text-slate-400 hover:text-white"}`}
                        >
                            River
                        </button>

                        <label className="cursor-pointer text-slate-400 hover:text-white transition p-1 hover:bg-slate-700 rounded is-clickable flex items-center gap-1" title="Upload custom music (MP3)">
                            <Upload className="w-3 h-3" />
                            <span className="text-[10px]">Upload</span>
                            <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        </label>
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
                    ref={containerRef}
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
                                        {demoMode === "live" ? "Live Demo" : SLIDES[currentIndex].title}
                                    </motion.h2>
                                    <motion.p
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-lg text-white/90 font-medium bg-black/30 backdrop-blur-sm p-3 rounded-xl inline-block"
                                    >
                                        {demoMode === "live" ? "Experience AI Productivity in real-time" : SLIDES[currentIndex].subtitle}
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
                                            {demoMode === "live" ? (
                                                <iframe
                                                    src="/dashboard?promo_mode=true"
                                                    className="w-full h-full border-none bg-slate-900"
                                                    title="Live Preview"
                                                />
                                            ) : (
                                                <Image
                                                    src={SLIDES[currentIndex].image}
                                                    alt="Screen"
                                                    fill
                                                    unoptimized
                                                    className="object-cover"
                                                />
                                            )}
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

            {/* HIDDEN AUDIO PLAYER */}
            <audio ref={audioRef} src={musicTrack || ""} loop className="hidden" />
        </div>
    );
}
