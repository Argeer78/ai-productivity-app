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
            method:
