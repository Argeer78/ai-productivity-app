'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Mic, Square, Download, MonitorPlay, FileText, Settings, X, Play, ChevronDown, Video, Bug } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { WindowPortal } from './WindowPortal';

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

const ROUTE_MAPPING: Record<string, string> = {
    'Dashboard': '/dashboard',
    'Planner': '/planner',
    'Calendar': '/calendar',
    'AI Chat': '/ai-chat',
    'Travel': '/travel',
    'Notes': '/notes',
    'Weekly History': '/weekly-history',
    'Settings': '/settings',
    'Intro': '/dashboard'
};

export default function GlobalScreenRecorder() {
    const router = useRouter();
    const currentPath = usePathname();

    // Core State
    const [isOpen, setIsOpen] = useState(false);
    const [isPopout, setIsPopout] = useState(false);
    // FORCE FRAME MODE DEFAULT TO TRUE for better UX
    const [isFrameMode, setIsFrameMode] = useState(true);

    const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [micStream, setMicStream] = useState<MediaStream | null>(null);
    const [micEnabled, setMicEnabled] = useState(false);

    // Debugging
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => {
        console.log(`[Recorder] ${msg}`);
        setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString().split(' ')[0]} ${msg}`]);
    };

    // Teleprompter
    const [teleprompterOpen, setTeleprompterOpen] = useState(true);
    const [scriptContent, setScriptContent] = useState('');
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScriptId, setSelectedScriptId] = useState('');
    const [scrollSpeed, setScrollSpeed] = useState(1);

    const sourceVideoRef = useRef<HTMLVideoElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const scrollerRef = useRef<HTMLTextAreaElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const processingFrameRef = useRef<number | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Iframe Safety Check
    const [isInsideIframe, setIsInsideIframe] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined' && window.self !== window.top) {
            setIsInsideIframe(true);
        }
    }, []);

    // Auto-Nav State
    const startTimeRef = useRef<number>(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Load Scripts
    useEffect(() => {
        fetch('/api/scripts')
            .then(res => res.json())
            .then(data => setScripts(data))
            .catch(err => addLog(`Failed to load scripts: ${err}`));
    }, []);

    // Hotkey to toggle Studio Mode (Ctrl + Shift + S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                setIsOpen(prev => !prev);
                // Ensure Frame Mode is ON when opening
                if (!isOpen) setIsFrameMode(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]); // Added dependency to logically toggle frame mode correctly

    // Frame Counter for Debug in UI
    const [frameCount, setFrameCount] = useState(0);

    // Wrap in useCallback to ensure we can use it in the effect dependency
    const checkNavigationPoints = React.useCallback((elapsedSeconds: number) => {
        const lines = scriptContent.split('\n');
        for (const line of lines) {
            // Regex: Relaxed to allow leading whitespace: [ 0:09 - PageName ]
            const match = line.match(/^\s*\[\s*(\d+):(\d+)\s*-\s*(.*?)\s*\]/);
            if (match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const pageName = match[3].trim();
                const targetTime = (min * 60) + sec;

                // Trigger navigation in 0.2s window
                if (Math.abs(elapsedSeconds - targetTime) < 0.15) {
                    const key = Object.keys(ROUTE_MAPPING).find(k => pageName.toLowerCase().includes(k.toLowerCase()));
                    if (key) {
                        const path = ROUTE_MAPPING[key];

                        addLog(`Nav -> ${path} (${pageName})`);

                        if (isFrameMode && iframeRef.current) {
                            // Navigate Iframe
                            if (iframeRef.current.contentWindow?.location.pathname !== path) {
                                iframeRef.current.src = path;
                            }
                        } else if (currentPath !== path) {
                            // Navigate Main Window
                            router.push(path);
                        }
                    }
                }
            }
        }

        // Auto-Stop Logic
        const matches = [...scriptContent.matchAll(/\[\s*(\d+):(\d+)\s*-\s*.*?\s*\]/g)];
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const lastTimestamp = (parseInt(lastMatch[1]) * 60) + parseInt(lastMatch[2]);
            if (elapsedSeconds > lastTimestamp + 5) {
                // Ensure we don't spam stop
                if (isRecording) {
                    addLog("Auto-Stop Triggered");
                    stopRecording();
                }
            }
        }
    }, [scriptContent, currentPath, isRecording, isFrameMode]); // Dependencies for the callback

    // Teleprompter Scrolling & Auto-Nav Logic
    useEffect(() => {
        const tick = () => {
            if (isRecording) {
                const now = Date.now();
                const elapsed = (now - startTimeRef.current) / 1000;
                setElapsedTime(elapsed);

                // Auto-Scroll
                if (scrollerRef.current && scrollSpeed > 0) {
                    scrollerRef.current.scrollTop += (scrollSpeed * 0.5);
                }

                // Auto-Nav Logic
                checkNavigationPoints(elapsed);

                animationFrameRef.current = requestAnimationFrame(tick);
            }
        };

        if (isRecording) {
            // Resume/Start: adjust start time to account for elapsed
            startTimeRef.current = Date.now() - (elapsedTime * 1000);
            animationFrameRef.current = requestAnimationFrame(tick);
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isRecording, scrollSpeed, checkNavigationPoints]); // checkNavigationPoints changes when currentPath changes

    // Handle Script Selection
    const handleScriptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedScriptId(id);
        const script = scripts.find(s => s.id === id);
        if (script) {
            setScriptContent(script.content);
            if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
            addLog(`Loaded Script: ${script.title}`);
        }
    };

    const startProcessingLoop = (sourceVideo: HTMLVideoElement, targetCanvas: HTMLCanvasElement) => {
        const ctx = targetCanvas.getContext('2d', { alpha: false }); // Optimize for no alpha
        if (!ctx) return;

        // High Quality Scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Perceptual Sharpening: Slight contrast/saturation boost to counteract upscaling blur
        // This brings back the "crystal" look losing during resampling.
        ctx.filter = 'contrast(102%) saturate(101%)';

        targetCanvas.width = selectedPreset.width;
        targetCanvas.height = selectedPreset.height;

        let frames = 0;
        const draw = () => {
            if (!sourceVideo.videoWidth || sourceVideo.ended || sourceVideo.paused) {
                if (!sourceVideo.ended) {
                    processingFrameRef.current = requestAnimationFrame(draw);
                }
                return;
            }
            const videoW = sourceVideo.videoWidth;
            const videoH = sourceVideo.videoHeight;

            // Calculate Crop
            let cropX = 0, cropY = 0, cropW = videoW, cropH = videoH;

            if (isFrameMode && iframeRef.current) {
                // Get Iframe Bounds relative to viewport
                const rect = iframeRef.current.getBoundingClientRect();

                // IMPORTANT: The video stream from getDisplayMedia usually matches the *screen* or *tab* resolution.
                // If it's the current tab, the coordinate system effectively matches window.innerWidth/Height scaled by devicePixelRatio.
                // However, the videoW/videoH tells                // Calculate Raw Scale based on Width (safest anchor)
                const scale = videoW / window.innerWidth;

                // Raw bounds of the iframe
                let rawCropX = rect.left * scale;
                let rawCropY = rect.top * scale;
                let rawCropW = rect.width * scale;
                let rawCropH = rect.height * scale;

                // Enforce Aspect Ratio on the Source Crop
                // We want to fill the target canvas (1920x1080) without stretching.
                // So we must ensure the source rectangle has the SAME aspect ratio as the target.
                const targetAspect = selectedPreset.width / selectedPreset.height;
                const sourceAspect = rawCropW / rawCropH;

                if (sourceAspect > targetAspect) {
                    // Source is wider than target: Crop the sides
                    const newWidth = rawCropH * targetAspect;
                    const diff = rawCropW - newWidth;
                    rawCropX += diff / 2;
                    rawCropW = newWidth;
                } else {
                    // Source is taller than target: Crop top/bottom
                    const newHeight = rawCropW / targetAspect;
                }

                // MICRO-CROP: Shrink by 2px to remove any edge-bleeding or sub-pixel borders
                const safetyMargin = 2; // px
                rawCropX += safetyMargin;
                rawCropY += safetyMargin;
                rawCropW -= (safetyMargin * 2);
                rawCropH -= (safetyMargin * 2);

                // PIXEL SNAPPING: Round to integers to prevent anti-aliasing blur (The "Shadowing" effect)
                cropX = Math.round(Math.max(0, rawCropX));
                cropY = Math.round(Math.max(0, rawCropY));
                cropW = Math.round(Math.min(rawCropW, videoW - cropX));
                cropH = Math.round(Math.min(rawCropH, videoH - cropY));

            } else {
                // ... (rest of standard crop logic is unchanged)
                // Standard Center Crop (Existing Logic refactored)
                const targetAspect = selectedPreset.width / selectedPreset.height;
                const srcAspect = videoW / videoH;

                if (srcAspect > targetAspect) {
                    cropH = videoH;
                    cropW = videoH * targetAspect;
                    cropX = (videoW - cropW) / 2;
                } else {
                    cropW = videoW;
                    cropH = videoW / targetAspect;
                    cropY = (videoH - cropH) / 2;
                }
            }

            // Draw
            ctx.drawImage(sourceVideo, cropX, cropY, cropW, cropH, 0, 0, selectedPreset.width, selectedPreset.height);

            // Updates UI every ~60 frames so we don't kill React performance
            frames++;
            if (frames % 60 === 0) setFrameCount(frames);

            processingFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
    };

    const startCapture = async () => {
        try {
            addLog("Requesting Display Media...");
            // @ts-ignore - preferCurrentTab is a non-standard but supported Chrome option
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: 60 },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
                systemAudio: 'include',
                surfaceSwitching: 'include',
                monitorTypeSurfaces: 'include'
            } as any);

            addLog("Display Media Acquired");

            if (!sourceVideoRef.current) {
                addLog("Error: Source Video Ref Missing");
                return;
            }

            const sourceVideo = sourceVideoRef.current;
            sourceVideo.srcObject = displayStream;
            // critical: allow playing even if hidden/background
            await sourceVideo.play();

            let finalStream = displayStream;

            // Audio Mixing Setup
            const audioContext = new AudioContext();
            const dest = audioContext.createMediaStreamDestination();
            let hasAudio = false;

            if (displayStream.getAudioTracks().length > 0) {
                const sysSource = audioContext.createMediaStreamSource(displayStream);
                sysSource.connect(dest);
                hasAudio = true;
                addLog("System Audio Connected");
            }

            if (micEnabled) {
                try {
                    const mic = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false,
                        }
                    });
                    setMicStream(mic);
                    const micSource = audioContext.createMediaStreamSource(mic);
                    micSource.connect(dest);
                    hasAudio = true;
                    addLog("Mic Audio Mixed");
                } catch (err) { addLog(`Mic Denied: ${err}`); }
            }

            if (canvasRef.current) {
                startProcessingLoop(sourceVideo, canvasRef.current);
                const canvasStream = canvasRef.current.captureStream(60); // 60fps capture

                // If we have mixed audio, add that track. Otherwise try to grab system audio directly?
                // Mixed is safer if it exists.
                if (hasAudio) {
                    canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
                } else if (displayStream.getAudioTracks().length > 0) {
                    canvasStream.addTrack(displayStream.getAudioTracks()[0]);
                }

                finalStream = canvasStream;
            } else {
                // No canvas (full screen mode?), but we still want mixed audio if we have it
                if (hasAudio) {
                    // Create a new stream with original video + mixed audio
                    finalStream = new MediaStream([
                        ...displayStream.getVideoTracks(),
                        dest.stream.getAudioTracks()[0]
                    ]);
                }
            }

            setMediaStream(finalStream);
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = finalStream;
                videoPreviewRef.current.muted = true; // prevent feedback
                videoPreviewRef.current.play();
            }

            displayStream.getVideoTracks()[0].onended = () => {
                addLog("Native Stop Event");
                stopRecording();
            };
            setPreviewUrl(null);

        } catch (err) { addLog(`Error Capture: ${err}`); }
    };

    const startRecording = () => {
        if (!mediaStream) return;
        addLog("Starting Recorder...");
        setPreviewUrl(null);
        setRecordedChunks([]);

        // High Bitrate for clear text
        const options = { mimeType: 'video/webm; codecs=vp9', bitsPerSecond: 8000000 };
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
        addLog(`MimeType: ${mimeType}`);

        const recorder = new MediaRecorder(mediaStream, { ...options, mimeType });
        mediaRecorderRef.current = recorder;

        // Critical: Use a local variable to capture data, 
        // because state updates might be async or batched
        const localChunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                localChunks.push(e.data);
            }
        };

        recorder.onstop = () => {
            addLog(`Recorder Stopped. Chunks: ${localChunks.length}`);
            setRecordedChunks([...localChunks]); // Update state
        };

        recorder.start(1000);
        setIsRecording(true);
        setElapsedTime(0);
        startTimeRef.current = Date.now();
    };

    const stopRecording = React.useCallback(() => {
        addLog("Stopping...");
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.requestData(); // Flush final data
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (processingFrameRef.current) cancelAnimationFrame(processingFrameRef.current);

        // (Cleanup of React Ref is automatic or needs reset)
        if (sourceVideoRef.current) {
            sourceVideoRef.current.pause();
            sourceVideoRef.current.srcObject = null;
        }

        mediaStream?.getTracks().forEach(track => track.stop());
        micStream?.getTracks().forEach(track => track.stop());
        setMediaStream(null);
    }, [mediaStream, micStream]);

    // Update preview url when chunks change (after stop)
    useEffect(() => {
        if (recordedChunks.length > 0 && !isRecording) {
            addLog(`Generating Preview (${recordedChunks.length} chunks)`);
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            addLog(`Preview Ready`);

            return () => URL.revokeObjectURL(url);
        }
    }, [recordedChunks, isRecording]);

    const downloadVideo = () => {
        if (!previewUrl) return;
        const a = document.createElement('a');
        a.href = previewUrl;
        a.download = `recording-${selectedPreset.id}-${new Date().getTime()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addLog("Download Triggered");
    };

    // Render Content Function (Reusable for Inline or Popout)
    const renderContent = () => {
        if (isFrameMode) {
            return (
                <div className="flex w-full h-full bg-slate-950 overflow-hidden relative">
                    {/* Emergency Escape Hatch */}
                    <button
                        onClick={() => { setIsFrameMode(false); setIsOpen(false); }}
                        className="absolute top-2 right-2 z-[9999] bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-2xl border border-white/20"
                        title="Emergency Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Left Sidebar: Teleprompter */}
                    <div className="w-80 flex-shrink-0 border-r border-slate-700 bg-slate-900 p-4 flex flex-col gap-4 z-50 relative shadow-2xl">
                        <div className="text-white font-bold flex items-center gap-2 text-base">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <span className="text-white">Prompter</span>
                        </div>
                        {/* Selector */}
                        <select
                            value={selectedScriptId}
                            onChange={handleScriptSelect}
                            className="bg-slate-800 text-white text-sm p-2 rounded border border-slate-600 focus:outline-none focus:border-indigo-500 w-full"
                        >
                            <option value="" className="text-slate-400">No Script (Type freely)</option>
                            {scripts.map(s => <option key={s.id} value={s.id} className="text-white">{s.title}</option>)}
                        </select>

                        <div className="flex-1 relative flex flex-col">
                            {/* Visual background for textarea to catch layout bugs */}
                            <textarea
                                ref={scrollerRef}
                                className="flex-1 w-full h-full bg-slate-800/50 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-slate-500 text-lg leading-relaxed font-serif"
                                placeholder="Paste your script here... Text will scroll when you verify recording."
                                value={scriptContent}
                                onChange={e => setScriptContent(e.target.value)}
                                style={{ color: 'white', backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                            />
                        </div>

                        {/* Speed Controls */}
                        <div className="flex items-center justify-between text-slate-300 text-sm bg-slate-800 p-2 rounded border border-slate-700">
                            <span className="font-semibold">Scroll Speed:</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setScrollSpeed(s => Math.max(0, s - 0.5))} className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white font-bold">-</button>
                                <span className="font-mono text-white w-8 text-center">{scrollSpeed}x</span>
                                <button onClick={() => setScrollSpeed(s => Math.min(5, s + 0.5))} className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Center: The Stage */}
                    <div className="flex-1 bg-black flex items-center justify-center relative p-2 z-0 overflow-hidden">
                        {/* Container */}
                        {/* This container defines the aspect ratio box */}
                        <div
                            // Remove shadows/rings when recording to prevent edge artifacts
                            className={`bg-white relative overflow-hidden transition-all ${isRecording ? '' : 'shadow-2xl ring-4 ring-indigo-500/20'}`}
                            style={{
                                aspectRatio: `${selectedPreset.width} / ${selectedPreset.height}`,
                                height: '96%',
                                width: 'auto'
                            }}
                        >
                            {/* PREVIEW MODE: Show video if we have one and not recording */}
                            {previewUrl && !isRecording ? (
                                <div className="w-full h-full bg-black relative group">
                                    <video
                                        src={previewUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                    <button
                                        onClick={() => setPreviewUrl(null)}
                                        className="absolute top-2 right-2 bg-slate-800/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700"
                                        title="Close Preview & Return to App"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                /* RECORDING MODE: Show Iframe */
                                <>
                                    <iframe
                                        ref={iframeRef}
                                        src={typeof window !== 'undefined' ? window.location.href : '/'}
                                        className="w-full h-full border-0 block"
                                    />

                                    {!isRecording && (
                                        <div className="absolute top-4 left-4 right-4 bg-indigo-600/90 text-white text-center p-2 rounded text-sm z-10 backdrop-blur pointer-events-none font-bold shadow-lg">
                                            Target Area: Recording will auto-crop to this box!
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Hidden Video Elements */}
                        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                            <video ref={sourceVideoRef} playsInline autoPlay muted />
                            <canvas ref={canvasRef} />
                        </div>
                    </div>

                    {/* Right Sidebar: Controls */}
                    <div className="w-72 flex-shrink-0 border-l border-slate-700 bg-slate-900 flex flex-col h-full overflow-hidden z-50 relative shadow-2xl">
                        {/* Header */}
                        <div className="p-4 flex-shrink-0 flex items-center justify-between border-b border-slate-700 bg-slate-900">
                            <h2 className="text-white font-bold flex items-center gap-2 text-base"><Video className="w-5 h-5 text-indigo-400" /> Studio</h2>
                            <button onClick={() => { setIsFrameMode(false); setIsOpen(false); }} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900">
                            {/* Mic */}
                            <label className="flex items-center justify-between text-white text-sm cursor-pointer p-3 rounded hover:bg-slate-800 border border-slate-700 bg-slate-800/50 transition-colors">
                                <span className="flex items-center gap-2 font-medium"><Mic className="w-4 h-4 text-indigo-400" /> Microhone</span>
                                <input type="checkbox" checked={micEnabled} onChange={e => setMicEnabled(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                            </label>

                            {/* Presets */}
                            <div className="space-y-2">
                                <label className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Canvas Size</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {PRESETS.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => !isRecording && setSelectedPreset(p)}
                                            className={`px-3 py-3 rounded-lg text-sm font-medium text-left transition-all ${selectedPreset.id === p.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'}`}
                                        >
                                            {p.label} <span className="text-xs opacity-50 float-right">({p.width}x{p.height})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Debug Logs */}
                            <div className="text-[10px] font-mono text-green-400 bg-black/80 p-3 rounded border border-green-900/50 max-h-32 overflow-y-auto">
                                <div className="mb-2 border-b border-green-900 pb-1 font-bold">System Logs</div>
                                {logs.slice(-5).map((l, i) => <div key={i} className="truncate">{l}</div>)}
                            </div>
                        </div>

                        {/* Fixed Footer Actions */}
                        <div className="p-4 border-t border-slate-700 bg-slate-900 flex-shrink-0 space-y-3 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
                            {!mediaStream ? (
                                <button onClick={startCapture} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]">
                                    Select Screen (Tab)
                                </button>
                            ) : !isRecording ? (
                                <button onClick={startRecording} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-base animate-pulse shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02]">
                                    Start Recording
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base border border-slate-500 transition-all hover:scale-[1.02]">
                                    Stop Recording
                                </button>
                            )}

                            {(previewUrl || recordedChunks.length > 0) && !isRecording && (
                                <button onClick={downloadVideo} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02]">
                                    <Download className="w-5 h-5" /> Download Video
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={`flex flex-col h-full bg-white dark:bg-slate-950 ${isPopout ? '' : 'rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800'}`}>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                            <Video className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Studio Mode</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                {isRecording && <span className="flex items-center gap-1 text-red-500 font-mono animate-pulse">● REC {elapsedTime.toFixed(1)}s</span>}
                                {isRecording && <span className="font-mono text-xs opacity-50 ml-2">FPS: {Math.round(frameCount / (elapsedTime || 1))}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isPopout && (
                            <div className="flex items-center gap-2">
                                {/* Frame Mode Button */}
                                <button
                                    onClick={() => setIsFrameMode(true)}
                                    className="px-3 py-1.5 text-xs font-bold bg-pink-600 text-white hover:bg-pink-700 rounded-lg shadow-md flex items-center gap-2"
                                    title="Wrap app in iframe for perfect isolation"
                                >
                                    <Square className="w-3 h-3" /> Frame Mode
                                </button>

                                <button
                                    onClick={() => setIsPopout(true)}
                                    className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-slate-800 dark:text-indigo-400 rounded-lg flex items-center gap-2"
                                >
                                    Popout
                                </button>
                            </div>
                        )}

                        <select
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm rounded-lg px-2 py-1.5 focus:outline-none"
                            value={selectedPreset.id}
                            onChange={(e) => !isRecording && setSelectedPreset(PRESETS.find(p => p.id === e.target.value) || PRESETS[0])}
                            disabled={isRecording}
                        >
                            {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>

                        <button onClick={() => { setIsOpen(false); setIsPopout(false); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Controls & Script */}
                    <div className="w-1/3 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-6 overflow-y-auto bg-slate-50 dark:bg-slate-950">

                        {/* Hidden Off-Screen Elements (Must remain in DOM tree) */}
                        {/* Note: In Popout, these are in the popout window. This is fine as getDisplayMedia is called from the context.
                             Wait! Videos need to be in the DOM. Logic runs in main thread. React Portal puts them in the other window.
                             They validly exist in the component tree. */}
                        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                            <video
                                ref={sourceVideoRef}
                                playsInline
                                autoPlay
                                muted
                                style={{ width: '1280px', height: '720px' }}
                            />
                            <canvas
                                ref={canvasRef}
                            />
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            {!mediaStream ? (
                                <button onClick={startCapture} className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                                    <MonitorPlay className="w-4 h-4" /> Select Screen
                                </button>
                            ) : !isRecording ? (
                                <button onClick={startRecording} className="col-span-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/20 animate-pulse flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-white" /> Start Recording
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="col-span-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                                    <Square className="w-4 h-4 fill-current" /> Stop
                                </button>
                            )}

                            {previewUrl && !isRecording && (
                                <button onClick={downloadVideo} className="col-span-2 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
                                    <Download className="w-4 h-4" /> Download
                                </button>
                            )}
                        </div>

                        {/* Mic Toggle */}
                        <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Mic className={`w-4 h-4 ${micEnabled ? 'text-indigo-500' : 'text-slate-400'}`} />
                                <span className="text-sm font-medium">Microphone</span>
                            </div>
                            <input type="checkbox" checked={micEnabled} onChange={e => setMicEnabled(e.target.checked)} className="toggle toggle-sm" />
                        </label>

                        {/* Teleprompter Section */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
                            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Teleprompter
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setScrollSpeed(s => Math.max(0, s - 0.5))} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">-</button>
                                        <span className="text-xs font-mono w-6 text-center">{scrollSpeed}x</span>
                                        <button onClick={() => setScrollSpeed(s => Math.min(5, s + 0.5))} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">+</button>
                                    </div>
                                </div>
                                <select
                                    value={selectedScriptId}
                                    onChange={handleScriptSelect}
                                    className="w-full text-xs p-1.5 rounded bg-slate-100 dark:bg-slate-800 border-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">Load Script...</option>
                                    {scripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                </select>
                            </div>
                            <textarea
                                ref={scrollerRef}
                                className="flex-1 p-4 bg-transparent resize-none focus:outline-none text-lg leading-relaxed font-serif"
                                placeholder="Script content..."
                                value={scriptContent}
                                onChange={e => setScriptContent(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="w-2/3 bg-black/95 relative flex items-center justify-center p-8">
                        {previewUrl && !isRecording && !mediaStream ? (
                            <div className="flex flex-col items-center gap-4 w-full h-full animate-in fade-in zoom-in-95 duration-300">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <video
                                    src={previewUrl}
                                    controls
                                    className={`max-h-full shadow-2xl ${selectedPreset.height > selectedPreset.width ? 'aspect-[9/16]' : 'aspect-video'} bg-black`}
                                />
                                <div className="text-white text-xs font-mono bg-indigo-600/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2">
                                    <Play className="w-3 h-3 fill-current" /> Reviewing Recording
                                </div>
                            </div>
                        ) : !mediaStream ? (
                            <div className="text-white/30 flex flex-col items-center gap-4">
                                <MonitorPlay className="w-16 h-16" />
                                <p>Preview Standby</p>
                            </div>
                        ) : (
                            <video
                                ref={videoPreviewRef}
                                autoPlay
                                muted
                                className={`max-h-full shadow-2xl ${selectedPreset.height > selectedPreset.width ? 'aspect-[9/16]' : 'aspect-video'} bg-black`}
                            />
                        )}

                        {/* Debug Logs in Popout */}
                        <div className="absolute top-4 left-4 bg-black/50 text-green-400 font-mono text-[10px] p-2 rounded max-h-32 overflow-y-auto opacity-50 hover:opacity-100 transition-opacity">
                            {logs.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Main Return
    if (isInsideIframe) return null; // Recursion protection (Safe)

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 right-20 z-50">
                <button
                    onClick={() => { setIsOpen(true); setIsFrameMode(true); }}
                    className="bg-black/50 hover:bg-black/80 text-white p-3 rounded-full shadow-lg backdrop-blur-sm transition-all"
                    title="Open Studio Recorder (Ctrl+Shift+S)"
                >
                    <Video className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <>
            {/* If Popout is active, render the portal. Otherwise render the modal overlay. */}
            {isPopout ? (
                <WindowPortal title="Studio Controller" onClose={() => { setIsPopout(false); setIsOpen(false); }}>
                    {renderContent()}
                </WindowPortal>
            ) : (
                <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/5">
                    <div className="pointer-events-auto bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-[90vw] max-w-5xl h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {renderContent()}
                    </div>
                </div>
            )}

            {/* If Popped Out, show a small reminder in main window (HIDDEN WHEN RECORDING) */}
            {isPopout && !isRecording && (
                <div className="fixed bottom-4 right-20 z-50 animate-pulse">
                    <button
                        onClick={() => setIsPopout(false)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm flex items-center gap-2"
                    >
                        <Video className="w-4 h-4" /> Controller Active
                    </button>
                </div>
            )}
        </>
    );
}
