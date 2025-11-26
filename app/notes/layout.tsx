// app/notes/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notes with AI – Capture, summarize & organize | AI Productivity Hub",
  description:
    "Write notes, ideas and journal entries, then let AI summarize, clean up or turn them into action items – all in one focused notes workspace.",
};

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
