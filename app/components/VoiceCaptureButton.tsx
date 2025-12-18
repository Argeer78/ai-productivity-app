"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/useT";
import { useLanguage } from "@/app/components/LanguageProvider";

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

  // optional fields (harmless if backend doesn't send them)
  reflection?: string | null;
  note_title?: string | null;
};

type Props = {
  userId: string;
  mode: "review" | "autosave" | "psych";
  resetKey?: number;
  onResult?: (payload: { rawText: string | null; structured: StructuredResult | null }) => void;
};

// Safety: auto-stop after N seconds (prevents stuck recording)
const MAX_RECORDING_MS = 90_000;

export default function VoiceCaptureButton({ userId, mode, resetKey, onResult }: Props) {
  const { t: rawT } = useT("");
  const t = (key: string, fallback: string) => rawT(key, fallback);

  const { lang: appLang } = useLanguage();
  const intlLocale = appLang || "en";

  function formatDateTime(input: string | number | Date) {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (Number.isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch {
      return "";
    }
  }

  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [structured, setStructured] = useState<StructuredResult | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // 🔊 device selection
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | "auto">("auto");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>("");
  const stopTimerRef = useRef<number | null>(null);
  const audioPreviewUrlRef = useRef<string | null>(null); // avoid stale closures
  const onResultRef = useRef<Props["onResult"]>(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Keep ref synced
  useEffect(() => {
    audioPreviewUrlRef.current = audioPreviewUrl;
  }, [audioPreviewUrl]);

  function clearStopTimer() {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  function softHaptic(ms = 12) {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as any).vibrate(ms);
      }
    } catch {
      // ignore
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearStopTimer();
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((trk) => trk.stop());
        } catch {}
      }
      if (audioPreviewUrlRef.current) {
        try {
          URL.revokeObjectURL(audioPreviewUrlRef.current);
        } catch {}
      }
    };
  }, []);

  // Reset when parent changes resetKey (e.g. after note save)
  useEffect(() => {
    if (resetKey === undefined) return;

    setRawText(null);
    setStructured(null);
    setSavedNoteId(null);
    setError(null);

    if (audioPreviewUrlRef.current) {
      try {
        URL.revokeObjectURL(audioPreviewUrlRef.current);
      } catch {}
      audioPreviewUrlRef.current = null;
      setAudioPreviewUrl(null);
    }
  }, [resetKey]);

  function getSupportError(): string | null {
    if (typeof window === "undefined") {
      return t("notes.voice.errors.notBrowser", "Not in a browser environment.");
    }

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
      return t(
        "notes.voice.errors.noGetUserMedia",
        "Your browser does not support microphone recording. Try updating your browser."
      );
    }

    const hasMediaRecorder = typeof (window as any).MediaRecorder !== "undefined";
    if (!hasMediaRecorder) {
      return t(
        "notes.voice.errors.noMediaRecorder",
        "This browser does not support audio recording. On mobile, try the latest Chrome or Safari."
      );
    }

    return null;
  }

  function chooseMimeType(): string | "" {
    if (typeof window === "undefined") return "";

    const MR = (window as any).MediaRecorder;
    if (!MR || typeof MR.isTypeSupported !== "function") return "";

    if (MR.isTypeSupported("audio/webm")) return "audio/webm";
    if (MR.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "";
  }

  function getClientTimeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Athens";
    } catch {
      return "Europe/Athens";
    }
  }

  // 🔍 Load available audio inputs after permission is granted
  async function loadAudioInputs() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    try {
      const tmpStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioIns = devices.filter((d) => d.kind === "audioinput");

      setAudioInputs(audioIns);
      setDevicesLoaded(true);

      tmpStream.getTracks().forEach((trk) => trk.stop());

      if (selectedDeviceId === "auto" && audioIns.length > 0) {
        const preferred =
          audioIns.find((d) => /built-in|microphone|mic|phone/i.test(d.label)) || audioIns[0];
        setSelectedDeviceId(preferred.deviceId);
      }
    } catch (err) {
      console.error("[VoiceCapture] loadAudioInputs error:", err);
    }
  }

  // Preload device list once (nice UX)
  useEffect(() => {
    // don’t spam permissions; only attempt if supported
    if (getSupportError() !== null) return;
    // run after mount
    loadAudioInputs().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecordingSafe() {
    clearStopTimer();

    if (!mediaRecorderRef.current) return;

    try {
      // stop only if still recording
      if ((mediaRecorderRef.current as any).state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream.getTracks().forEach((trk) => trk.stop());
    } catch (err) {
      console.warn("[VoiceCapture] stopRecordingSafe error", err);
    } finally {
      softHaptic(8);
      setRecording(false);
    }
  }

  // Stop if tab goes hidden (prevents accidental recording in background)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden" && recording) stopRecordingSafe();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  // ESC to stop (desktop)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && recording) stopRecordingSafe();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  async function startRecording() {
    setError(null);
    setRawText(null);
    setStructured(null);
    setSavedNoteId(null);

    const supportError = getSupportError();
    if (supportError) {
      setError(supportError);
      console.warn(
        "[VoiceCapture] Support error:",
        supportError,
        typeof navigator !== "undefined" ? navigator.userAgent : ""
      );
      return;
    }

    if (!devicesLoaded) {
      await loadAudioInputs();
    }

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      };

      if (selectedDeviceId && selectedDeviceId !== "auto") {
        (audioConstraints as any).deviceId = selectedDeviceId;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

      const mimeType = chooseMimeType();
      mimeTypeRef.current = mimeType;

      const MR = (window as any).MediaRecorder as typeof MediaRecorder | undefined;
      if (!MR) {
        setError(
          t(
            "notes.voice.errors.noMediaRecorder",
            "MediaRecorder is not available in this browser. Try the latest Chrome or Safari."
          )
        );
        return;
      }

      const recorder = mimeType && MR ? new MR(stream, { mimeType }) : new MR(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        clearStopTimer();

        const type = mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });

        // Preview (optional)
        if (audioPreviewUrlRef.current) {
          try {
            URL.revokeObjectURL(audioPreviewUrlRef.current);
          } catch {}
        }
        const previewUrl = URL.createObjectURL(blob);
        audioPreviewUrlRef.current = previewUrl;
        setAudioPreviewUrl(previewUrl);

        if (blob.size < 2000) {
          setError(
            t(
              "notes.voice.errors.tooShort",
              "We barely captured any audio. Try speaking closer to the mic, or pick a different microphone source."
            )
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setSavedNoteId(null);

        try {
          const formData = new FormData();
          const ext = type.includes("mp4") ? "mp4" : "webm";

          formData.append("file", blob, `voice-note.${ext}`);
          formData.append("userId", userId);
          formData.append("mode", mode);
          formData.append("tz", getClientTimeZone());

          const res = await fetch("/api/voice/capture", { method: "POST", body: formData });
          const json = await res.json();

          if (!res.ok || !json.ok) {
            console.error("[VoiceCapture] server error:", json);
            setError(json.error || t("notes.voice.errors.server", "Server error while processing audio."));
          } else {
            const rt = json.rawText || null;
            const st = (json.structured || null) as StructuredResult | null;

            setRawText(rt);
            setStructured(st);

            if (json.noteId) setSavedNoteId(json.noteId as string);

            onResultRef.current?.({ rawText: rt, structured: st });
          }
        } catch (err) {
          console.error("[VoiceCapture] fetch error:", err);
          setError(t("notes.voice.errors.sendFailed", "Failed to send audio to server."));
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      // Start safety timer
      clearStopTimer();
      stopTimerRef.current = window.setTimeout(() => {
        if (recording) stopRecordingSafe();
      }, MAX_RECORDING_MS);

      softHaptic(12);
      setRecording(true);
    } catch (err: any) {
      console.error("[VoiceCapture] getUserMedia error:", err);

      const name = err?.name || "UnknownError";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          t(
            "notes.voice.errors.permissionBlocked",
            "Microphone permission was blocked. Please enable it in your browser/site settings."
          )
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError(t("notes.voice.errors.noMicFound", "No microphone was found on this device."));
      } else if (name === "NotReadableError") {
        setError(t("notes.voice.errors.micInUse", "Your microphone is already in use by another app."));
      } else {
        setError(
          t(
            "notes.voice.errors.couldNotAccess",
            `Could not access microphone (${name}). Check permissions and try again.`
          )
        );
      }
    }
  }

  const showMicSelector = audioInputs.length > 1;

  const modeLabel =
    mode === "autosave"
      ? t("notes.voice.mode.autosave", "Auto-save note")
      : mode === "psych"
      ? t("notes.voice.mode.psych", "Reflection companion")
      : t("notes.voice.mode.review", "Review first");

  return (
    <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60 text-slate-100 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{t("notes.voice.button.label", "Voice capture")}</h3>

          <p className="text-xs text-slate-400">
            {t("notes.voice.button.helpText", "Hold, speak your messy thoughts, and let AIProd clean it up.")}
          </p>

          <p className="text-[10px] text-slate-500 mt-1">
            {t("notes.voice.modeLabel", "Mode:")} {modeLabel}
          </p>

          {showMicSelector && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-slate-400">{t("notes.voice.mic.label", "Mic:")}</span>

              <select
                className="text-[10px] bg-slate-950 border border-slate-700 rounded-lg px-2 py-1"
                value={selectedDeviceId === "auto" ? "" : selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value || "auto")}
              >
                <option value="">{t("notes.voice.mic.auto", "Auto (browser default)")}</option>
                {audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || d.deviceId}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={loading}
          onPointerDown={(e) => {
            e.preventDefault();
            if (recording || loading) return;

            (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            startRecording();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (!recording) return;
            stopRecordingSafe();
          }}
          onPointerLeave={() => {
            if (!recording) return;
            stopRecordingSafe();
          }}
          onPointerCancel={() => {
            if (!recording) return;
            stopRecordingSafe();
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 select-none touch-none ${
            recording ? "bg-red-500/90" : "bg-indigo-500/90 hover:bg-indigo-500"
          } disabled:opacity-60`}
        >
          <span>
            {recording
              ? t("notes.voice.button.holdRecording", "Recording… release to send")
              : t("notes.voice.button.holdToTalk", "Hold to talk")}
          </span>
        </button>
      </div>

      {recording && (
        <p className="mt-1 text-[10px] text-red-300">
          {t("notes.voice.status.recordingHint", "Recording… release the button to send. (Esc to cancel)")}
        </p>
      )}

      {savedNoteId && (
        <p className="text-[10px] text-emerald-400">
          {t("notes.voice.status.saved", "Voice note saved as a note in your workspace.")}
        </p>
      )}

      {loading && <p className="text-xs text-slate-400">{t("notes.voice.status.processing", "Processing your audio with AI…")}</p>}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {audioPreviewUrl && (
        <div className="mt-2">
          <p className="text-[10px] text-slate-400">{t("notes.voice.preview.label", "Preview your last recording (tap ▶):")}</p>
          <audio controls src={audioPreviewUrl} className="mt-1 w-full" />
        </div>
      )}

      {rawText && (
        <div className="mt-2 space-y-2 text-xs">
          <div>
            <p className="text-slate-400 font-semibold">{t("notes.voice.output.rawTranscript", "Raw transcript:")}</p>
            <p className="text-slate-200 mt-1 whitespace-pre-wrap">{rawText}</p>
          </div>

          {structured && (
            <>
              {structured.note && (
                <div>
                  <p className="text-slate-400 font-semibold">{t("notes.voice.output.cleanNote", "Clean note:")}</p>
                  <p className="text-slate-200 mt-1 whitespace-pre-wrap">{structured.note}</p>
                </div>
              )}

              {structured.actions && structured.actions.length > 0 && (
                <div>
                  <p className="text-slate-400 font-semibold">{t("notes.voice.output.actions", "Actions:")}</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {structured.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {structured.tasks && structured.tasks.length > 0 && (
                <div>
                  <p className="text-slate-400 font-semibold">{t("notes.voice.output.suggestedTasks", "Suggested tasks:")}</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {structured.tasks.map((task, i) => {
                      const dueLabel = task.due_natural || (task.due_iso ? formatDateTime(task.due_iso) : null);
                      return (
                        <li key={i}>
                          {task.title}
                          {dueLabel ? ` (${t("notes.voice.output.duePrefix", "due")}: ${dueLabel})` : ""}
                          {task.priority && <span className="ml-1 uppercase text-[9px] text-slate-400">[{task.priority}]</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {structured.reminder && (structured.reminder.time_natural || structured.reminder.time_iso || structured.reminder.reason) && (
                <div>
                  <p className="text-slate-400 font-semibold">{t("notes.voice.output.reminderSuggestion", "Reminder suggestion:")}</p>

                  <p className="text-slate-200 mt-1">
                    {structured.reminder.time_natural
                      ? `${t("notes.voice.output.timePrefix", "Time")}: ${structured.reminder.time_natural}`
                      : structured.reminder.time_iso
                      ? `${t("notes.voice.output.timePrefix", "Time")}: ${formatDateTime(structured.reminder.time_iso)}`
                      : null}
                    {structured.reminder.reason ? ` — ${t("notes.voice.output.reasonPrefix", "Reason")}: ${structured.reminder.reason}` : null}
                  </p>
                </div>
              )}

              {structured.summary && (
                <div>
                  <p className="text-slate-400 font-semibold">{t("notes.voice.output.summary", "Summary:")}</p>
                  <p className="text-slate-200 mt-1">{structured.summary}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
