"use client";

import { useEffect, useRef, useState } from "react";

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
};

type Props = {
  userId: string;
  mode: "review" | "autosave";
  resetKey?: number;
  onResult?: (payload: {
    rawText: string | null;
    structured: StructuredResult | null;
  }) => void;
};

export default function VoiceCaptureButton({
  userId,
  mode,
  resetKey,
  onResult,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [structured, setStructured] = useState<StructuredResult | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
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
  }, [resetKey]);

  function getSupportError(): string | null {
    if (typeof window === "undefined") return "Not in a browser environment.";

    if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
      return "Your browser does not support microphone recording. Try updating your browser.";
    }

    const hasMediaRecorder =
      typeof (window as any).MediaRecorder !== "undefined";

    if (!hasMediaRecorder) {
      return "This browser does not support audio recording. On mobile, try the latest Chrome or Safari.";
    }

    return null;
  }

  function chooseMimeType(): string | "" {
    if (typeof window === "undefined") return "";

    const MR = (window as any).MediaRecorder;
    if (!MR || typeof MR.isTypeSupported !== "function") {
      return "";
    }

    if (MR.isTypeSupported("audio/webm")) {
      return "audio/webm";
    }

    if (MR.isTypeSupported("audio/mp4")) {
      return "audio/mp4";
    }

    return "";
  }

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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = chooseMimeType();
      mimeTypeRef.current = mimeType;

      const MR = (window as any).MediaRecorder as typeof MediaRecorder;
      const recorder =
        mimeType && MR ? new MR(stream, { mimeType }) : new MR(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const type = mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });

        setLoading(true);
        setSavedNoteId(null);

        try {
          const formData = new FormData();
          const ext = type.includes("mp4") ? "mp4" : "webm";
          formData.append("file", blob, `voice-note.${ext}`);
          formData.append("userId", userId);
          formData.append("mode", mode);

          const res = await fetch("/api/voice/capture", {
            method: "POST",
            body: formData,
          });

          const json = await res.json();

          if (!res.ok || !json.ok) {
            console.error("[VoiceCapture] server error:", json);
            setError(json.error || "Server error while processing audio.");
          } else {
            const rt = json.rawText || null;
            const st = (json.structured || null) as StructuredResult | null;

            setRawText(rt);
            setStructured(st);

            if (json.noteId) {
              setSavedNoteId(json.noteId as string);
            }

            if (onResult) {
              onResult({ rawText: rt, structured: st });
            }
          }
        } catch (err) {
          console.error("[VoiceCapture] fetch error:", err);
          setError("Failed to send audio to server.");
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      console.error("[VoiceCapture] getUserMedia error:", err);

      const name = err?.name || "UnknownError";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Microphone permission was blocked. Please enable it in your browser/site settings."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No microphone was found on this device.");
      } else if (name === "NotReadableError") {
        setError("Your microphone is already in use by another app.");
      } else {
        setError(
          `Could not access microphone (${name}). Check permissions and try again.`
        );
      }
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }

  return (
    <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60 text-slate-100 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Voice capture</h3>
          <p className="text-xs text-slate-400">
            Tap, speak your messy thoughts, and let AIProd clean it up.
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Mode:{" "}
            {mode === "autosave"
              ? "Auto-save as note"
              : "Review before saving"}
          </p>
        </div>

        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
            recording
              ? "bg-red-500/90 hover:bg-red-500"
              : "bg-indigo-500/90 hover:bg-indigo-500"
          } disabled:opacity-60`}
        >
          <span>{recording ? "Stop recording" : "Start recording"}</span>
        </button>
      </div>

      {savedNoteId && (
        <p className="text-[10px] text-emerald-400">
          Voice note saved as a note in your workspace.
        </p>
      )}

      {loading && (
        <p className="text-xs text-slate-400">
          Processing your audio with AI…
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {rawText && (
        <div className="mt-2 space-y-2 text-xs">
          <div>
            <p className="text-slate-400 font-semibold">Raw transcript:</p>
            <p className="text-slate-200 mt-1 whitespace-pre-wrap">
              {rawText}
            </p>
          </div>

          {structured && (
            <>
              {structured.note && (
                <div>
                  <p className="text-slate-400 font-semibold">Clean note:</p>
                  <p className="text-slate-200 mt-1 whitespace-pre-wrap">
                    {structured.note}
                  </p>
                </div>
              )}

              {structured.actions && structured.actions.length > 0 && (
                <div>
                  <p className="text-slate-400 font-semibold">Actions:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {structured.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {structured.tasks && structured.tasks.length > 0 && (
                <div>
                  <p className="text-slate-400 font-semibold">
                    Suggested tasks:
                  </p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {structured.tasks.map((t, i) => {
                      const dueLabel =
                        t.due_natural ||
                        (t.due_iso
                          ? new Date(t.due_iso).toLocaleString()
                          : null);

                      return (
                        <li key={i}>
                          {t.title}
                          {dueLabel ? ` (due: ${dueLabel})` : ""}
                          {t.priority && (
                            <span className="ml-1 uppercase text-[9px] text-slate-400">
                              [{t.priority}]
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {structured.reminder &&
                (structured.reminder.time_natural ||
                  structured.reminder.time_iso ||
                  structured.reminder.reason) && (
                  <div>
                    <p className="text-slate-400 font-semibold">
                      Reminder suggestion:
                    </p>
                    <p className="text-slate-200 mt-1">
                      {structured.reminder.time_natural
                        ? `Time: ${structured.reminder.time_natural}`
                        : structured.reminder.time_iso
                        ? `Time: ${new Date(
                            structured.reminder.time_iso
                          ).toLocaleString()}`
                        : null}
                      {structured.reminder.reason
                        ? ` — Reason: ${structured.reminder.reason}`
                        : null}
                    </p>
                  </div>
                )}

              {structured.summary && (
                <div>
                  <p className="text-slate-400 font-semibold">Summary:</p>
                  <p className="text-slate-200 mt-1">
                    {structured.summary}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
