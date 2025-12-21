"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/useT";
import { useLanguage } from "@/app/components/LanguageProvider";

/* ================= TYPES ================= */

type StructuredResult = {
  note?: string;
  note_category?: string;
  actions?: string[];
  tasks?: {
    title: string;
    due_natural?: string | null;
    due_iso?: string | null;
    priority?: "low" | "medium" | "high" | null;
  }[];
  reminder?: {
    time_natural?: string | null;
    time_iso?: string | null;
    reason?: string | null;
  };
  summary?: string;

  // optional fields
  reflection?: string | null;
  note_title?: string | null;
};

type Props = {
  userId: string;
  mode: "review" | "autosave" | "psych";
  resetKey?: number;
  onResult?: (payload: {
    rawText: string | null;
    structured: StructuredResult | null;
  }) => void;

  variant?: "default" | "compact" | "icon";
  size?: "sm" | "md";

  /**
   * "hold": press-and-hold
   * "toggle": click once to record, click again to stop (tasks/notes)
   */
  interaction?: "hold" | "toggle";

  className?: string;
};

const MAX_RECORDING_MS = 90_000;

// Emit chunks periodically to avoid "no data" issues on some browsers
const TIMESLICE_MS = 1000;

/* ================= COMPONENT ================= */

export default function VoiceCaptureButton({
  userId,
  mode,
  resetKey,
  onResult,
  variant = "default",
  size = "md",
  interaction,
  className,
}: Props) {
  const { t: rawT } = useT("");
  const t = (k: string, f: string) => rawT(k, f);

  const { lang } = useLanguage();
  const intlLocale = lang || "en";

  /* ================= STATE ================= */

  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (not shown in icon UI, but used by parent via onResult)
  const [rawText, setRawText] = useState<string | null>(null);
  const [structured, setStructured] = useState<StructuredResult | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const audioPreviewUrlRef = useRef<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("");

  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Keep preview ref synced + cleanup old URL
  useEffect(() => {
    if (audioPreviewUrlRef.current && audioPreviewUrlRef.current !== audioPreviewUrl) {
      try {
        URL.revokeObjectURL(audioPreviewUrlRef.current);
      } catch {}
    }
    audioPreviewUrlRef.current = audioPreviewUrl;
  }, [audioPreviewUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      } catch {}
      try {
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      try {
        if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
      } catch {}
    };
  }, []);

  function clearStopTimer() {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  function softHaptic(ms = 12) {
    try {
      (navigator as any).vibrate?.(ms);
    } catch {}
  }

  function chooseMimeType(): string {
    if (typeof window === "undefined") return "";
    const MR = (window as any).MediaRecorder;
    if (!MR?.isTypeSupported) return "";
    if (MR.isTypeSupported("audio/webm")) return "audio/webm";
    if (MR.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "";
  }

  function getTimeZone() {
    try {
      return Intl.DateTimeFormat(intlLocale).resolvedOptions().timeZone || "Europe/Athens";
    } catch {
      return "Europe/Athens";
    }
  }

  /* ================= RECORDING ================= */

  async function startRecording() {
    if (recordingRef.current || loading) return;

    setError(null);
    setRawText(null);
    setStructured(null);
    setSavedNoteId(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t("notes.voice.errors.noGetUserMedia", "Your browser does not support microphone recording."));
      return;
    }
    if (typeof (window as any).MediaRecorder === "undefined") {
      setError(t("notes.voice.errors.noMediaRecorder", "This browser does not support audio recording."));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        } as MediaTrackConstraints,
      });

      const mimeType = chooseMimeType();
      mimeTypeRef.current = mimeType || "audio/webm";

      const MR = (window as any).MediaRecorder as typeof MediaRecorder;
      const recorder = mimeType ? new MR(stream, { mimeType }) : new MR(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearStopTimer();
        setRecording(false);
        recordingRef.current = false;

        const finalType = mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });

        // stop tracks
        try {
          recorder.stream.getTracks().forEach((t) => t.stop());
        } catch {}

        if (blob.size < 2000) {
          setError(t("notes.voice.errors.tooShort", "We barely captured any audio. Try again."));
          return;
        }

        // preview (optional)
        try {
          const url = URL.createObjectURL(blob);
          setAudioPreviewUrl(url);
        } catch {}

        setLoading(true);

        try {
          const fd = new FormData();

          // ✅ IMPORTANT: filename + extension
          const ext = finalType.includes("mp4") ? "mp4" : "webm";
          fd.append("file", blob, `voice-note.${ext}`);

          fd.append("userId", userId);
          fd.append("mode", mode);
          fd.append("tz", getTimeZone());

          const res = await fetch("/api/voice/capture", { method: "POST", body: fd });

          let json: any = null;
          try {
            json = await res.json();
          } catch {
            json = null;
          }

          if (!res.ok || !json?.ok) {
            setError(json?.error || "Server error");
            return;
          }

          const rt = json.rawText || null;
          const st = (json.structured || null) as StructuredResult | null;

          // ✅ If server returned "ok" but no payload, show an error so it doesn't look like "nothing happened"
          if (!rt && !st) {
            setError(t("notes.voice.errors.emptyResult", "No transcript returned. Try again."));
            return;
          }

          setRawText(rt);
          setStructured(st);
          setSavedNoteId(json.noteId || null);

          onResultRef.current?.({ rawText: rt, structured: st });
        } catch (e: any) {
          setError(e?.message || "Failed to send audio.");
        } finally {
          setLoading(false);
        }
      };

      // ✅ Start with timeslice to ensure chunks are emitted reliably
      recorder.start(TIMESLICE_MS);

      mediaRecorderRef.current = recorder;
      recordingRef.current = true;
      setRecording(true);
      softHaptic();

      clearStopTimer();
      stopTimerRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch (err: any) {
      const name = err?.name || "UnknownError";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(t("notes.voice.errors.permissionBlocked", "Microphone permission was blocked. Enable it in site settings."));
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError(t("notes.voice.errors.noMicFound", "No microphone was found on this device."));
      } else if (name === "NotReadableError") {
        setError(t("notes.voice.errors.micInUse", "Your microphone is already in use by another app."));
      } else {
        setError(t("notes.voice.errors.couldNotAccess", "Microphone access failed."));
      }
    }
  }

  function stopRecording() {
    if (!recordingRef.current) return;

    clearStopTimer();

    try {
      // ✅ Flush final chunk if supported
      const mr: any = mediaRecorderRef.current;
      if (mr?.requestData) {
        try {
          mr.requestData();
        } catch {}
      }

      // stop triggers onstop (upload)
      mediaRecorderRef.current?.stop();
    } catch {
      // Force reset if stop throws
      setRecording(false);
      recordingRef.current = false;
      try {
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  }

  function toggleRecording() {
    if (recordingRef.current) stopRecording();
    else startRecording();
  }

  /* ================= RESET ================= */

  useEffect(() => {
    if (resetKey === undefined) return;

    stopRecording();

    setRawText(null);
    setStructured(null);
    setSavedNoteId(null);
    setError(null);
  }, [resetKey]);

  /* ================= VARIANT BEHAVIOR ================= */

  const effectiveInteraction: "hold" | "toggle" =
    interaction || (variant === "default" ? "hold" : "hold"); // compact/icon hold unless explicitly set to toggle

  /* ================= COMPACT / ICON ================= */

  if (variant === "compact" || variant === "icon") {
    const btnSize = size === "sm" ? "h-9 w-9" : "h-10 w-10";
    const iconSize = size === "sm" ? "text-[16px]" : "text-[18px]";
    const isToggle = effectiveInteraction === "toggle";

    return (
      <div className={className}>
        <button
          type="button"
          disabled={loading}
          aria-label={recording ? "Stop recording" : "Start recording"}
          title={
            loading
              ? t("notes.voice.status.processing", "Processing…")
              : isToggle
              ? recording
                ? t("notes.voice.button.stop", "Stop")
                : t("notes.voice.button.start", "Record")
              : recording
              ? t("notes.voice.button.holdRecording", "Recording… release to send")
              : t("notes.voice.button.holdToTalk", "Hold to talk")
          }
          onClick={isToggle ? toggleRecording : undefined}
          onPointerDown={
            !isToggle
              ? (e) => {
                  e.preventDefault();
                  if (recording || loading) return;
                  (e.currentTarget as any).setPointerCapture?.(e.pointerId);
                  startRecording();
                }
              : undefined
          }
          onPointerUp={
            !isToggle
              ? (e) => {
                  e.preventDefault();
                  if (!recording) return;
                  stopRecording();
                }
              : undefined
          }
          onPointerLeave={!isToggle ? () => (recording ? stopRecording() : null) : undefined}
          onPointerCancel={!isToggle ? () => (recording ? stopRecording() : null) : undefined}
          className={`${btnSize} rounded-full flex items-center justify-center border border-[var(--border-subtle)]
            ${recording ? "bg-red-500 text-white" : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]"}
            disabled:opacity-60`}
        >
          <span className={iconSize}>{recording ? "⏹" : "🎤"}</span>
        </button>

        {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
        {loading && (
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {t("notes.voice.status.processing", "Processing…")}
          </p>
        )}
      </div>
    );
  }

  /* ================= DEFAULT (HOLD) ================= */

  return (
    <div className={`rounded-2xl border p-4 ${className || ""}`}>
      <button
        type="button"
        disabled={loading}
        onPointerDown={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        onPointerLeave={() => stopRecording()}
        onPointerCancel={() => stopRecording()}
        className={`px-4 py-2 rounded-full ${recording ? "bg-red-500" : "bg-indigo-500"} text-white disabled:opacity-60`}
      >
        {recording ? t("notes.voice.button.holdRecording", "Recording… release") : t("notes.voice.button.holdToTalk", "Hold to talk")}
      </button>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {loading && <p className="text-xs text-[var(--text-muted)] mt-2">{t("notes.voice.status.processing", "Processing…")}</p>}
    </div>
  );
}
