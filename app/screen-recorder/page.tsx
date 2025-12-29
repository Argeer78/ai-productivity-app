'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Mic, Square, Download, MonitorPlay, FileText, Settings, X, Play, ChevronDown } from 'lucide-react';

type Preset = {
    id: string;
    label: string;
    width: number;
    height: number;
    description: string;
};

type Script = {
    id: string;
    title: string;
    category: string;
    content: string;
};

const PRESETS: Preset[] = [
    { id: 'youtube', label: 'YouTube / Desktop', width: 1920, height: 1080, description: '16:9 Landscape' },
    { id: 'reels', label: 'Shorts / Reels', width: 1080, height: 1920, description: '9:16 Portrait' },
    { id: 'square', label: 'Square Post', width: 1080, height: 1080, description: '1:1 Square' },
];

export default function ScreenRecorderPage() {
    const { theme } = useTheme();
    const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [micStream, setMicStream] = useState<MediaStream | null>(null);
    const [micEnabled, setMicEnabled] = useState(false);

    // Teleprompter
    const [teleprompterOpen, setTeleprompterOpen] = useState(false);
    const [scriptContent, setScriptContent] = useState('');
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScriptId, setSelectedScriptId] = useState('');
    const [scrollSpeed, setScrollSpeed] = useState(1);
    const [isScrolling, setIsScrolling] = useState(false);

    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // To process frames
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const scrollerRef = useRef<HTMLTextAreaElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const processingFrameRef = useRef<number | null>(null);

    // Load Scripts
    useEffect(() => {
        fetch('/api/scripts')
            .then(res => res.json())
            .then(data => setScripts(data))
            .catch(err => console.error("Failed to load scripts", err));
    }, []);

    // Teleprompter Scrolling Logic
    useEffect(() => {
        const scroll = () => {
            if (scrollerRef.current && isScrolling && scrollSpeed > 0) {
                scrollerRef.current.scrollTop += (scrollSpeed * 0.5);
                animationFrameRef.current = requestAnimationFrame(scroll);
            }
        };

        if (isScrolling) {
            animationFrameRef.current = requestAnimationFrame(scroll);
        } else if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isScrolling, scrollSpeed]);

    // Handle Script Selection
    const handleScriptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedScriptId(id);
        const script = scripts.find(s => s.id === id);
        if (script) setScriptContent(script.content);
    };

    // Canvas Processing Loop (Crop & Draw)
    const startProcessingLoop = (sourceVideo: HTMLVideoElement, targetCanvas: HTMLCanvasElement) => {
        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to target preset
        targetCanvas.width = selectedPreset.width;
        targetCanvas.height = selectedPreset.height;

        const draw = () => {
            if (!sourceVideo.videoWidth) {
                processingFrameRef.current = requestAnimationFrame(draw);
                return;
            }

            // Calculate Crop (Center Crop Strategy)
            const srcW = sourceVideo.videoWidth;
            const srcH = sourceVideo.videoHeight;
            const targetW = selectedPreset.width;
            const targetH = selectedPreset.height;

            const srcAspect = srcW / srcH;
            const targetAspect = targetW / targetH;

            let renderW, renderH, offsetX, offsetY;

            // "Cover" fit logic (Crop to fill)
            if (srcAspect > targetAspect) {
                // Source is wider than target (e.g. 16:9 src -> 9:16 target)
                // Height matches, crop width
                renderH = srcH;
                renderW = srcH * targetAspect;
                offsetX = (srcW - renderW) / 2;
                offsetY = 0;
            } else {
                // Source is taller than target (rare on monitors)
                // Width matches, crop height
                renderW = srcW;
                renderH = srcW / targetAspect;
                offsetX = 0;
                offsetY = (srcH - renderH) / 2;
            }

            // Draw cropped portion to full canvas
            ctx.drawImage(sourceVideo, offsetX, offsetY, renderW, renderH, 0, 0, targetW, targetH);

            processingFrameRef.current = requestAnimationFrame(draw);
        };

        draw();
    };

    const startCapture = async () => {
        try {
            // 1. Capture Raw Screen (High Resolution)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 }, // Get max quality
                    height: { ideal: 1080 },
                    frameRate: 60
                },
                audio: true
            });

            // Create a hidden video element to act as source for the canvas
            const sourceVideo = document.createElement('video');
            sourceVideo.srcObject = displayStream;
            sourceVideo.play();
            sourceVideo.muted = true; // Don't echo audio

            // 2. Setup Canvas Processing
            // If we are just doing standard 16:9 and source is matches, we could skip canvas.
            // But for consistency let's use canvas if preset is different or if mixing is needed.
            // Actually, let's use the raw stream if preset matches aspect ratio to save performance?
            // No, for "Smart Crop" consistency, let's process it.

            let finalStream = displayStream;

            // If preset requires processing (e.g. 9:16)
            // Or we just want to burn in something? (Future: branding)

            if (canvasRef.current) {
                startProcessingLoop(sourceVideo, canvasRef.current);
                // 30 FPS for recording is safer for performance with canvas
                const canvasStream = canvasRef.current.captureStream(30);

                // Preserve audio tracks from original stream
                displayStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

                finalStream = canvasStream;
            }

            // 3. Audio Mixing (Mic)
            if (micEnabled) {
                try {
                    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setMicStream(mic);

                    // Add mic track to stream
                    // Note: multiple audio tracks might not mix automatically in all players
                    // Proper way is AudioContext, but simple way is adding tracks (MediaRecorder supports multiple tracks in container)
                    mic.getAudioTracks().forEach(track => finalStream.addTrack(track));
                } catch (err) {
                    console.error("Mic permission denied", err);
                }
            }

            setMediaStream(finalStream);

            // Update preview to show the FINAL processed stream (what is being recorded)
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = finalStream;
            }

            // Cleanup on stream end
            displayStream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

        } catch (err) {
            console.error("Error starting capture:", err);
        }
    };

    const startRecording = () => {
        if (!mediaStream) return;

        // 2.5MBps bitrate
        const options = { mimeType: 'video/webm; codecs=vp9', bitsPerSecond: 2500000 };
        // Fallback if vp9 not supported
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : 'video/webm';

        const recorder = new MediaRecorder(mediaStream, { ...options, mimeType });
        mediaRecorderRef.current = recorder;

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const type = recorder.mimeType || 'video/webm';
            const blob = new Blob(chunks, { type });
            setRecordedChunks(chunks);
        };

        recorder.start(1000); // chunk every second
        setIsRecording(true);
        if (teleprompterOpen && scrollSpeed > 0) setIsScrolling(true);
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        setIsScrolling(false);

        // Stop processing loop
        if (processingFrameRef.current) cancelAnimationFrame(processingFrameRef.current);

        // Stop tracks
        mediaStream?.getTracks().forEach(track => track.stop());
        micStream?.getTracks().forEach(track => track.stop());
        setMediaStream(null);
    };

    const downloadVideo = () => {
        if (recordedChunks.length === 0) return;
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Guess extension based on mimeType inside blob? Default webm
        a.download = `recording-${selectedPreset.id}-${new Date().getTime()}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 font-sans">
            <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Studio Recorder</h1>
                    <p className="text-slate-500 dark:text-slate-400">Create professional showcases & demos</p>
                </div>

                <div className="flex gap-4">
                    {/* Preset Selector */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => !isRecording && setSelectedPreset(preset)}
                                disabled={isRecording}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedPreset.id === preset.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Controls & Settings */}
                <div className="space-y-6">

                    {/* Status Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-indigo-500" />
                            Recording Settings
                        </h2>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-indigo-500 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${micEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <Mic className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Microphone</div>
                                        <div className="text-xs text-slate-500">Record voiceover</div>
                                    </div>
                                </div>
                                <input type="checkbox" className="toggle" checked={micEnabled} onChange={(e) => setMicEnabled(e.target.checked)} />
                            </label>

                            <button
                                onClick={() => setTeleprompterOpen(!teleprompterOpen)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${teleprompterOpen ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium">Teleprompter</div>
                                        <div className="text-xs text-slate-500">Script overlay</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Main Action Button */}
                    {!mediaStream ? (
                        <button
                            onClick={startCapture}
                            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                        >
                            <MonitorPlay className="w-6 h-6" />
                            Select Screen
                        </button>
                    ) : !isRecording ? (
                        <button
                            onClick={startRecording}
                            className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-lg shadow-lg shadow-red-500/20 flex items-center justify-center gap-3 animate-pulse"
                        >
                            <div className="w-4 h-4 rounded-full bg-white" />
                            Start Recording
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            Stop Recording
                        </button>
                    )}

                    {recordedChunks.length > 0 && !isRecording && (
                        <button
                            onClick={downloadVideo}
                            className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Download Video
                        </button>
                    )}

                </div>

                {/* Right Col: Preview Area */}
                <div className="lg:col-span-2 relative bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center aspect-video group">
                    {!mediaStream && !recordedChunks.length && (
                        <div className="text-slate-500 flex flex-col items-center gap-4">
                            <MonitorPlay className="w-16 h-16 opacity-50" />
                            <p>Preview will appear here</p>
                        </div>
                    )}

                    {/*
                   Hidden processing canvas.
                   We don't show this directly, we show the stream from it in the video element below.
                */}
                    <canvas ref={canvasRef} className="hidden" />

                    <video
                        ref={videoPreviewRef}
                        autoPlay
                        muted
                        // If vertical, we might want to change object-cover vs contain or set max-width
                        className={`h-full object-contain bg-black transition-all ${selectedPreset.height > selectedPreset.width ? 'max-w-[400px]' : 'w-full'}`}
                    />

                    {/* Teleprompter Overlay */}
                    {teleprompterOpen && (
                        <div className="absolute top-4 right-4 w-64 md:w-80 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-2xl z-20 transition-all">
                            <div className="flex flex-col gap-3 mb-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Teleprompter
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/70">Scroll:</span>
                                        <button onClick={() => setScrollSpeed(s => Math.max(0, s - 0.5))} className="text-white/50 hover:text-white px-1 font-bold">-</button>
                                        <span className="text-xs text-white font-mono w-6 text-center">{scrollSpeed}x</span>
                                        <button onClick={() => setScrollSpeed(s => Math.min(5, s + 0.5))} className="text-white/50 hover:text-white px-1 font-bold">+</button>
                                    </div>
                                </div>

                                {/* Script Selector */}
                                {scripts.length > 0 && (
                                    <div className="relative">
                                        <select
                                            value={selectedScriptId}
                                            onChange={handleScriptSelect}
                                            className="w-full bg-white/10 text-white text-xs p-2 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                        >
                                            <option value="" className="text-black">Load a promotional script...</option>
                                            {scripts.map(s => (
                                                <option key={s.id} value={s.id} className="text-black">
                                                    {s.title} ({s.category})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-white absolute right-2 top-2 pointer-events-none" />
                                    </div>
                                )}
                            </div>

                            <div className="h-48 overflow-y-auto relative mask-linear-fade scrollbar-hide" >
                                <textarea
                                    ref={scrollerRef}
                                    className="w-full h-full bg-transparent text-white text-lg font-medium leading-relaxed resize-none focus:outline-none placeholder-white/20 scrollbar-hide font-sans"
                                    placeholder="Paste script here or select one..."
                                    value={scriptContent}
                                    onChange={(e) => setScriptContent(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
